import Foundation
import AVFoundation
import React
import Speech

@objc(AudioSessionManager)
class AudioSessionManager: RCTEventEmitter {
    
    // MARK: - Properties
    private var audioRecorder: AVAudioRecorder?
    private var audioPlayer: AVAudioPlayer?
    private var recordingTimer: Timer?
    private var isRecording = false
    private var isPaused = false
    private var currentRecordingURL: URL?
    private var micMonitoringTimer: Timer?
    
    // Speech Recognition Properties
    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var audioEngine = AVAudioEngine()
    
    // Audio streaming properties for WebSocket
    private var audioStreamingTimer: Timer?
    private var audioBufferQueue: [Data] = []
    private var isStreamingAudio = false
    
    // MARK: - React Native Module Setup
    override static func moduleName() -> String! {
        return "AudioSessionManager"
    }
    
    override static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    override func supportedEvents() -> [String]! {
        return [
            "AudioInterruptionBegan",
            "AudioInterruptionEnded",
            "AudioRouteChanged",
            "RecordingProgress",
            "RecordingFinished",
            "PlaybackProgress",
            "PlaybackFinished",
            "MicrophoneStatus",
            "SpeechRecognized",
            "AudioStreamData"
        ]
    }
    
    // MARK: - Initialization
    override init() {
        super.init()
        setupAudioSession()
        setupInterruptionHandling()
        startMicrophoneStatusMonitoring()
    }
    
    // MARK: - Audio Session Setup
    private func setupAudioSession() {
        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(
                .playAndRecord,
                mode: .default,
                options: [.allowBluetooth, .defaultToSpeaker, .mixWithOthers]
            )
            try audioSession.setActive(true)
            print("✅ AudioSessionManager: Audio session configured")
        } catch {
            print("❌ AudioSessionManager: Failed to setup audio session - \(error.localizedDescription)")
        }
    }
    
    // MARK: - Audio Streaming for WebSocket
    @objc func startContinuousAudioStreaming(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard !isStreamingAudio else {
            reject("ALREADY_STREAMING", "Audio streaming is already active", nil)
            return
        }
        
        do {
            try startAudioStreaming()
            resolve(["success": true, "message": "Audio streaming started"])
        } catch {
            reject("STREAMING_ERROR", error.localizedDescription, error)
        }
    }
    
    @objc func stopContinuousAudioStreaming(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        stopAudioStreaming()
        resolve(["success": true, "message": "Audio streaming stopped"])
    }
    
    private func startAudioStreaming() throws {
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(
            .playAndRecord,
            mode: .measurement,
            options: [.defaultToSpeaker, .allowBluetooth]
        )
        try audioSession.setActive(true)
        
        // Configure audio engine for streaming
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.inputFormat(forBus: 0)
        inputNode.removeTap(onBus: 0)
        
        // Install tap to capture audio data
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] (buffer, time) in
            guard let self = self else { return }
            
            // Convert audio buffer to Data
            let audioData = self.convertAudioBufferToData(buffer: buffer)
            
            // Send audio data to React Native immediately
            DispatchQueue.main.async {
                self.sendEvent(withName: "AudioStreamData", body: [
                    "audioBuffer": audioData.base64EncodedString(),
                    "sampleRate": recordingFormat.sampleRate,
                    "channels": recordingFormat.channelCount,
                    "timestamp": time.sampleTime
                ])
            }
        }
        
        audioEngine.prepare()
        try audioEngine.start()
        isStreamingAudio = true
        print("🎤 AudioSessionManager: Continuous audio streaming started")
    }
    
    private func stopAudioStreaming() {
        if audioEngine.isRunning {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
        }
        isStreamingAudio = false
        print("🔴 AudioSessionManager: Continuous audio streaming stopped")
    }
    
    private func convertAudioBufferToData(buffer: AVAudioPCMBuffer) -> Data {
        let audioBuffer = buffer.audioBufferList.pointee.mBuffers
        let data = Data(bytes: audioBuffer.mData!, count: Int(audioBuffer.mDataByteSize))
        return data
    }
    
    // MARK: - Interruption Handling Setup
    private func setupInterruptionHandling() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleInterruption(_:)),
            name: AVAudioSession.interruptionNotification,
            object: AVAudioSession.sharedInstance()
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleRouteChange(_:)),
            name: AVAudioSession.routeChangeNotification,
            object: AVAudioSession.sharedInstance()
        )
        
        print("✅ AudioSessionManager: Interruption observers registered")
    }
    
    @objc private func handleInterruption(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
            return
        }
        
        switch type {
        case .began:
            handleInterruptionBegan()
        case .ended:
            handleInterruptionEnded(userInfo: userInfo)
        @unknown default:
            print("⚠️ AudioSessionManager: Unknown interruption type")
        }
    }
    
    private func handleInterruptionBegan() {
        print("🔴 AudioSessionManager: Interruption BEGAN (TikTok/YouTube opened)")
        
        // Automatically pause recording if active
        if isRecording && !isPaused {
            pauseRecordingInternal()
        }
        
        // Stop speech recognition if active
        if recognitionTask != nil {
            stopSpeechRecognitionInternal()
        }
        
        // Release audio session
        do {
            try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
            print("✅ AudioSessionManager: Released audio session")
        } catch {
            print("❌ AudioSessionManager: Failed to release session - \(error.localizedDescription)")
        }
        
        // Notify React Native
        sendEvent(withName: "AudioInterruptionBegan", body: [
            "wasRecording": isRecording,
            "reason": "app_requested_mic"
        ])
    }
    
    private func handleInterruptionEnded(userInfo: [AnyHashable: Any]) {
        print("🟢 AudioSessionManager: Interruption ENDED (User left TikTok/YouTube)")
        
        var shouldResume = false
        if let optionsValue = userInfo[AVAudioSessionInterruptionOptionKey] as? UInt {
            let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
            shouldResume = options.contains(.shouldResume)
        }
        
        if shouldResume {
            // Reclaim audio session
            do {
                try AVAudioSession.sharedInstance().setActive(true)
                print("🎉 AudioSessionManager: Reclaimed audio session!")
                
                // Auto-resume recording if it was interrupted
                if isPaused {
                    resumeRecordingInternal()
                }
                
                sendEvent(withName: "AudioInterruptionEnded", body: [
                    "canResume": true,
                    "autoResumed": isPaused,
                    "reclaimedInBackground": true
                ])
            } catch {
                print("❌ AudioSessionManager: Failed to reclaim session - \(error.localizedDescription)")
                sendEvent(withName: "AudioInterruptionEnded", body: [
                    "canResume": false,
                    "error": error.localizedDescription
                ])
            }
        }
    }
    
    @objc private func handleRouteChange(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let reasonValue = userInfo[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else {
            return
        }
        
        print("🎧 AudioSessionManager: Audio route changed - \(reason)")
        sendEvent(withName: "AudioRouteChanged", body: ["reason": reasonValue])
    }
    
    // MARK: - Microphone Status Monitoring
    private func startMicrophoneStatusMonitoring() {
        micMonitoringTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.checkMicrophoneStatus()
        }
    }
    
    private func checkMicrophoneStatus() {
        let audioSession = AVAudioSession.sharedInstance()
        let isSessionActive = audioSession.isInputAvailable
        let hasPermission = audioSession.recordPermission == .granted
        let isAppActive = UIApplication.shared.applicationState == .active
        let isAppBackground = UIApplication.shared.applicationState == .background
        let isAppInactive = UIApplication.shared.applicationState == .inactive
        
        var appState = "unknown"
        var micStatus = "UNKNOWN"
        
        // Determine app state
        if isAppActive {
            appState = "FOREGROUND"
        } else if isAppBackground {
            appState = "BACKGROUND/HOME_SCREEN"
        } else if isAppInactive {
            appState = "LOCK_SCREEN/INACTIVE"
        }
        
        // Determine microphone status
        if (isRecording || audioEngine.isRunning) && hasPermission && isSessionActive {
            micStatus = "🎤 MY APP IS LISTENING TO MIC"
        } else if !hasPermission {
            micStatus = "❌ NO PERMISSION"
        } else if !isSessionActive {
            micStatus = "⚠️ SESSION INACTIVE"
        } else {
            micStatus = "⚪ MIC AVAILABLE BUT NOT LISTENING"
        }
        
        // Your requested log - every second
        let timestamp = DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .medium)
        print("[\(timestamp)] 🎤 MIC STATUS: \(micStatus) | APP STATE: \(appState)")
        
        // Additional detailed log when actively listening
        if isRecording || audioEngine.isRunning {
            print("[\(timestamp)] ✅ CONFIRMED: My app is actively using the microphone right now!")
        }
        
        // Send status to React Native
        sendEvent(withName: "MicrophoneStatus", body: [
            "status": micStatus,
            "appState": appState,
            "isRecording": isRecording,
            "isSpeechRecognitionActive": audioEngine.isRunning,
            "hasPermission": hasPermission,
            "isSessionActive": isSessionActive,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    // MARK: - Speech Recognition Methods
    @objc func startSpeechRecognition(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        // Request permission first
        SFSpeechRecognizer.requestAuthorization { [weak self] authStatus in
            DispatchQueue.main.async {
                guard authStatus == .authorized else {
                    reject("SPEECH_PERMISSION_DENIED", "Speech recognition permission denied", nil)
                    return
                }
                
                do {
                    try self?.startSpeechRecognitionInternal()
                    resolve([
                        "success": true,
                        "isStreaming": self?.isStreamingAudio ?? false
                    ])
                } catch {
                    reject("SPEECH_ERROR", error.localizedDescription, error)
                }
            }
        }
    }
    
    @objc func stopSpeechRecognition(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        stopSpeechRecognitionInternal()
        resolve(["success": true])
    }
    
    private func startSpeechRecognitionInternal() throws {
        // Cancel any previous task
        recognitionTask?.cancel()
        recognitionTask = nil
        
        // Set up speech recognizer
        speechRecognizer = SFSpeechRecognizer()
        guard let speechRecognizer = speechRecognizer, speechRecognizer.isAvailable else {
            throw NSError(domain: "SpeechError", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "Speech recognition not available"
            ])
        }
        
        // Create recognition request
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else {
            throw NSError(domain: "SpeechError", code: 2, userInfo: [
                NSLocalizedDescriptionKey: "Unable to create recognition request"
            ])
        }
        
        recognitionRequest.shouldReportPartialResults = true
        
        // Configure audio engine (this will also handle streaming)
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.inputFormat(forBus: 0)
        inputNode.removeTap(onBus: 0)
        
        // Install tap for both speech recognition AND streaming
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, time in
            // Send to speech recognition
            recognitionRequest.append(buffer)
            
            // Also send for streaming if needed
            if let self = self, !self.isStreamingAudio {
                let audioData = self.convertAudioBufferToData(buffer: buffer)
                DispatchQueue.main.async {
                    self.sendEvent(withName: "AudioStreamData", body: [
                        "audioBuffer": audioData.base64EncodedString(),
                        "sampleRate": recordingFormat.sampleRate,
                        "channels": recordingFormat.channelCount,
                        "timestamp": time.sampleTime,
                        "source": "speech_recognition"
                    ])
                }
            }
        }
        
        audioEngine.prepare()
        try audioEngine.start()
        print("🗣️ AudioSessionManager: Speech recognition with streaming started")
        
        // Start recognition task
        recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            if let result = result {
                let spokenText = result.bestTranscription.formattedString
                let isFinal = result.isFinal
                
                print("🎤 SPEECH DETECTED: '\(spokenText)' (Final: \(isFinal))")
                
                // Send to React Native
                self?.sendEvent(withName: "SpeechRecognized", body: [
                    "text": spokenText,
                    "isFinal": isFinal,
                    "timestamp": Date().timeIntervalSince1970
                ])
            }
            
            if error != nil || result?.isFinal == true {
                self?.audioEngine.stop()
                inputNode.removeTap(onBus: 0)
                self?.recognitionRequest = nil
                self?.recognitionTask = nil
            }
        }
    }
    
    private func stopSpeechRecognitionInternal() {
        if audioEngine.isRunning {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
        }
        
        recognitionRequest?.endAudio()
        recognitionRequest = nil
        recognitionTask?.cancel()
        recognitionTask = nil
        
        print("🔴 AudioSessionManager: Speech recognition stopped")
    }
    
    // MARK: - Recording Methods
    @objc func startRecording(
        _ fileName: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard !isRecording else {
            reject("ALREADY_RECORDING", "Recording is already in progress", nil)
            return
        }
        
        do {
            // Create file URL
            let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            currentRecordingURL = documentsPath.appendingPathComponent(fileName)
            
            // Configure recording settings for WebSocket compatibility
            let settings: [String: Any] = [
                AVFormatIDKey: Int(kAudioFormatLinearPCM), // Use PCM for better streaming
                AVSampleRateKey: 16000.0, // Match your WebSocket expected sample rate
                AVNumberOfChannelsKey: 1, // Mono for WebSocket
                AVLinearPCMBitDepthKey: 16,
                AVLinearPCMIsBigEndianKey: false,
                AVLinearPCMIsFloatKey: false,
                AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
            ]
            
            // Create recorder
            audioRecorder = try AVAudioRecorder(url: currentRecordingURL!, settings: settings)
            audioRecorder?.delegate = self
            audioRecorder?.isMeteringEnabled = true
            
            // Start recording
            let success = audioRecorder?.record() ?? false
            
            if success {
                isRecording = true
                isPaused = false
                startRecordingTimer()
                
                // Also start audio streaming for WebSocket
                if !isStreamingAudio {
                    try startAudioStreaming()
                }
                
                print("✅ AudioSessionManager: Recording and streaming started")
                resolve([
                    "success": true,
                    "filePath": currentRecordingURL?.path ?? "",
                    "fileName": fileName,
                    "isStreaming": isStreamingAudio
                ])
            } else {
                reject("RECORDING_FAILED", "Failed to start recording", nil)
            }
        } catch {
            reject("RECORDING_ERROR", error.localizedDescription, error)
        }
    }
    
    @objc func stopRecording(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard isRecording else {
            reject("NOT_RECORDING", "No recording in progress", nil)
            return
        }
        
        audioRecorder?.stop()
        stopRecordingTimer()
        isRecording = false
        isPaused = false
        
        // Stop audio streaming
        stopAudioStreaming()
        
        let filePath = currentRecordingURL?.path ?? ""
        print("✅ AudioSessionManager: Recording and streaming stopped")
        
        resolve([
            "success": true,
            "filePath": filePath
        ])
        
        sendEvent(withName: "RecordingFinished", body: [
            "filePath": filePath,
            "duration": audioRecorder?.currentTime ?? 0
        ])
    }
    
    @objc func pauseRecording(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard isRecording && !isPaused else {
            reject("CANNOT_PAUSE", "Recording is not active or already paused", nil)
            return
        }
        
        pauseRecordingInternal()
        resolve(true)
    }
    
    @objc func resumeRecording(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard isRecording && isPaused else {
            reject("CANNOT_RESUME", "Recording is not paused", nil)
            return
        }
        
        resumeRecordingInternal()
        resolve(true)
    }
    
    private func pauseRecordingInternal() {
        audioRecorder?.pause()
        isPaused = true
        stopRecordingTimer()
        print("⏸️ AudioSessionManager: Recording paused")
    }
    
    private func resumeRecordingInternal() {
        let success = audioRecorder?.record() ?? false
        if success {
            isPaused = false
            startRecordingTimer()
            print("▶️ AudioSessionManager: Recording resumed")
        }
    }
    
    // MARK: - Playback Methods
    @objc func startPlayback(
        _ filePath: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        let fileURL = URL(fileURLWithPath: filePath)
        
        do {
            audioPlayer = try AVAudioPlayer(contentsOf: fileURL)
            audioPlayer?.delegate = self
            audioPlayer?.prepareToPlay()
            
            let success = audioPlayer?.play() ?? false
            
            if success {
                print("✅ AudioSessionManager: Playback started")
                resolve([
                    "success": true,
                    "duration": audioPlayer?.duration ?? 0
                ])
            } else {
                reject("PLAYBACK_FAILED", "Failed to start playback", nil)
            }
        } catch {
            reject("PLAYBACK_ERROR", error.localizedDescription, error)
        }
    }
    
    @objc func stopPlayback(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        audioPlayer?.stop()
        audioPlayer = nil
        print("✅ AudioSessionManager: Playback stopped")
        resolve(true)
    }
    
    // MARK: - Recording Timer
    private func startRecordingTimer() {
        recordingTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            guard let self = self, let recorder = self.audioRecorder else { return }
            
            let audioSession = AVAudioSession.sharedInstance()
            let isSessionActive = audioSession.isInputAvailable && audioSession.recordPermission == .granted
            let isRecorderActive = recorder.isRecording
            
            // Check if we actually have the microphone
            let hasMicrophone = isSessionActive && isRecorderActive
            
            if isRecorderActive {
                recorder.updateMeters()
                let currentTime = recorder.currentTime
                let averagePower = recorder.averagePower(forChannel: 0)
                let peakPower = recorder.peakPower(forChannel: 0)
                
                // Main proof log - Shows mic activity with power levels
                print("🎙️ MIC ACTIVE - Time: \(String(format: "%.1f", currentTime))s, Power: \(String(format: "%.1f", averagePower))dB")
                
                // Additional status every 2 seconds
                let currentTimeInt = Int(currentTime)
                if currentTimeInt % 2 == 0 && currentTimeInt > 0 {
                    if hasMicrophone {
                        print("🎤 AudioSessionManager: MIC ACTIVE - App has microphone at \(currentTimeInt)s")
                    } else {
                        print("❌ AudioSessionManager: MIC LOST - App lost microphone at \(currentTimeInt)s")
                    }
                }
                
                self.sendEvent(withName: "RecordingProgress", body: [
                    "currentTime": currentTime,
                    "averagePower": averagePower,
                    "peakPower": peakPower,
                    "hasMicrophone": hasMicrophone,
                    "isSessionActive": isSessionActive,
                    "isRecorderActive": isRecorderActive
                ])
            }
        }
    }
    
    private func stopRecordingTimer() {
        recordingTimer?.invalidate()
        recordingTimer = nil
    }
    
    // MARK: - Utility Methods
    @objc func getCurrentAudioSessionState(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        let audioSession = AVAudioSession.sharedInstance()
        let state: [String: Any] = [
            "category": audioSession.category.rawValue,
            "isActive": audioSession.isInputAvailable,
            "hasPermission": audioSession.recordPermission == .granted,
            "isRecording": isRecording,
            "isPaused": isPaused,
            "isSpeechRecognitionActive": audioEngine.isRunning,
            "isStreamingAudio": isStreamingAudio
        ]
        resolve(state)
    }
    
    @objc func requestMicPermission(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        AVAudioSession.sharedInstance().requestRecordPermission { granted in
            resolve(granted)
        }
    }
    
    @objc func getRecordingsList(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        do {
            let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            let files = try FileManager.default.contentsOfDirectory(at: documentsPath, includingPropertiesForKeys: nil)
            let audioFiles = files.filter {
                ["m4a", "mp3", "wav", "aac"].contains($0.pathExtension.lowercased())
            }.map { url in
                return [
                    "fileName": url.lastPathComponent,
                    "filePath": url.path,
                    "fileSize": (try? url.resourceValues(forKeys: [.fileSizeKey]))?.fileSize ?? 0
                ]
            }
            resolve(audioFiles)
        } catch {
            reject("FILE_ERROR", error.localizedDescription, error)
        }
    }
    
    // MARK: - Cleanup
    deinit {
        NotificationCenter.default.removeObserver(self)
        stopRecordingTimer()
        stopSpeechRecognitionInternal()
        stopAudioStreaming()
        audioRecorder?.stop()
        audioPlayer?.stop()
        micMonitoringTimer?.invalidate()
        micMonitoringTimer = nil
        print("🧹 AudioSessionManager: Cleaned up including audio streaming")
    }

  @objc
  func pauseRecordingForSiri(_ resolve: @escaping RCTPromiseResolveBlock,
                             rejecter reject: @escaping RCTPromiseRejectBlock) {
      print("⏸️ Pausing audio recording for Siri...")
      
      do {
          // Stop speech recognition if running
          if speechRecognizer != nil && recognitionTask != nil {
              recognitionTask?.cancel()
              recognitionTask = nil
          }
          
          // Stop audio recording if running
          if audioRecorder?.isRecording == true {
              audioRecorder?.stop()
              audioRecorder = nil
          }
          
          // Stop audio engine if running
          if audioEngine.isRunning {
              audioEngine.stop()
              audioEngine.inputNode.removeTap(onBus: 0)
          }
          
          // Deactivate audio session to release microphone
          try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
          
          print("✅ Audio session paused successfully for Siri")
          resolve(["success": true, "message": "Audio paused"])
      } catch {
          print("❌ Failed to pause audio session: \(error)")
          reject("PAUSE_FAILED", error.localizedDescription, error)
      }
  }

  @objc
  func resumeRecordingAfterSiri(_ resolve: @escaping RCTPromiseResolveBlock,
                                rejecter reject: @escaping RCTPromiseRejectBlock) {
      print("▶️ Resuming audio recording after Siri...")
      
      do {
          // Reconfigure audio session
          let session = AVAudioSession.sharedInstance()
          try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth])
          try session.setActive(true, options: .notifyOthersOnDeactivation)
          
          print("✅ Audio session resumed successfully after Siri")
          resolve(["success": true, "message": "Audio resumed"])
          
      } catch {
          print("❌ Failed to resume audio session: \(error)")
          reject("RESUME_FAILED", error.localizedDescription, error)
      }
  }

}

// MARK: - AVAudioRecorderDelegate
extension AudioSessionManager: AVAudioRecorderDelegate {
    func audioRecorderDidFinishRecording(_ recorder: AVAudioRecorder, successfully flag: Bool) {
        print("🎙️ AudioSessionManager: Recording finished successfully: \(flag)")
        isRecording = false
        isPaused = false
        stopRecordingTimer()
        
        sendEvent(withName: "RecordingFinished", body: [
            "success": flag,
            "filePath": recorder.url.path,
            "duration": recorder.currentTime
        ])
    }
    
    func audioRecorderEncodeErrorDidOccur(_ recorder: AVAudioRecorder, error: Error?) {
        print("❌ AudioSessionManager: Recording error - \(error?.localizedDescription ?? "Unknown")")
        isRecording = false
        isPaused = false
        stopRecordingTimer()
        
        sendEvent(withName: "RecordingFinished", body: [
            "success": false,
            "error": error?.localizedDescription ?? "Recording error"
        ])
    }
}

// MARK: - AVAudioPlayerDelegate
extension AudioSessionManager: AVAudioPlayerDelegate {
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        print("🔊 AudioSessionManager: Playback finished successfully: \(flag)")
        sendEvent(withName: "PlaybackFinished", body: [
            "success": flag,
            "duration": player.duration
        ])
    }
    
    func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        print("❌ AudioSessionManager: Playback error - \(error?.localizedDescription ?? "Unknown")")
        sendEvent(withName: "PlaybackFinished", body: [
            "success": false,
            "error": error?.localizedDescription ?? "Playback error"
        ])
    }
}
