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
    
    // Siri interruption handling
    private var wasPausedForSiri = false
    private var preInterruptionServices: [String] = []
    
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
            "AudioStreamData",
            "SiriInterruptionBegan",
            "SiriInterruptionEnded"
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
                options: [.allowBluetooth, .defaultToSpeaker, .mixWithOthers, .interruptSpokenAudioAndMixWithOthers]
            )
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
            print("✅ AudioSessionManager: Audio session configured with Siri compatibility")
        } catch {
            print("❌ AudioSessionManager: Failed to setup audio session - \(error.localizedDescription)")
        }
    }
    
    // MARK: - Enhanced Interruption Handling
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
        
        print("✅ AudioSessionManager: Enhanced interruption observers registered")
    }
    
    @objc private func handleInterruption(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
            return
        }
        
        switch type {
        case .began:
            handleInterruptionBegan(userInfo: userInfo)
        case .ended:
            handleInterruptionEnded(userInfo: userInfo)
        @unknown default:
            print("⚠️ AudioSessionManager: Unknown interruption type")
        }
    }
    
    private func handleInterruptionBegan(userInfo: [AnyHashable: Any]) {
        print("🔴 AudioSessionManager: Interruption BEGAN")
        
        // Determine if this is a Siri interruption
        let isSiriInterruption = detectSiriInterruption(userInfo: userInfo)
        
        if isSiriInterruption {
            print("🗣️ SIRI INTERRUPTION DETECTED - Giving priority to Siri")
            handleSiriInterruptionBegan()
        } else {
            print("📱 OTHER APP INTERRUPTION - Pausing services")
            handleGeneralInterruptionBegan()
        }
        
        // Store what services were running before interruption
        preInterruptionServices.removeAll()
        if isRecording { preInterruptionServices.append("recording") }
        if recognitionTask != nil { preInterruptionServices.append("speechRecognition") }
        if isStreamingAudio { preInterruptionServices.append("audioStreaming") }
        
        // Pause all audio services
        pauseAllAudioServices()
        
        // Notify React Native
        let eventName = isSiriInterruption ? "SiriInterruptionBegan" : "AudioInterruptionBegan"
        sendEvent(withName: eventName, body: [
            "wasRecording": isRecording,
            "wasSpeechRecognitionActive": recognitionTask != nil,
            "wasStreaming": isStreamingAudio,
            "reason": isSiriInterruption ? "siri" : "other_app"
        ])
    }
    
    private func handleInterruptionEnded(userInfo: [AnyHashable: Any]) {
        print("🟢 AudioSessionManager: Interruption ENDED")
        
        var shouldResume = false
        if let optionsValue = userInfo[AVAudioSessionInterruptionOptionKey] as? UInt {
            let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
            shouldResume = options.contains(.shouldResume)
        }
        
        let isSiriInterruption = wasPausedForSiri
        
        if shouldResume {
            print("🎉 AudioSessionManager: Attempting to reclaim audio session")
            
            // Wait a moment to ensure Siri has fully released the session
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                self.reclaimAudioSession(wasSiriInterruption: isSiriInterruption)
            }
        } else {
            print("⚠️ AudioSessionManager: Cannot resume - system says no")
            let eventName = isSiriInterruption ? "SiriInterruptionEnded" : "AudioInterruptionEnded"
            sendEvent(withName: eventName, body: [
                "canResume": false,
                "reason": "system_denied"
            ])
        }
        
        // Reset Siri flag
        wasPausedForSiri = false
    }
    
    private func detectSiriInterruption(userInfo: [AnyHashable: Any]) -> Bool {
        // Check for Siri-specific interruption indicators
        if let reasonValue = userInfo[AVAudioSessionInterruptionReasonKey] as? UInt {
            let reason = AVAudioSession.InterruptionReason(rawValue: reasonValue)
            if reason == .builtInMicMuted {
                print("🎤 Built-in mic muted - likely Siri")
                return true
            }
        }
        
        // Additional heuristics for Siri detection
        let currentRoute = AVAudioSession.sharedInstance().currentRoute
        for output in currentRoute.outputs {
            if output.portType == .builtInSpeaker || output.portType == .builtInReceiver {
                print("🗣️ Audio routing suggests Siri activation")
                return true
            }
        }
        
        return false
    }
    
    private func handleSiriInterruptionBegan() {
        wasPausedForSiri = true
        print("🗣️ Siri interruption - gracefully yielding microphone")
    }
    
    private func handleGeneralInterruptionBegan() {
        print("📱 General app interruption - pausing services")
    }
    
    private func pauseAllAudioServices() {
        // Stop recording if active
        if isRecording && !isPaused {
            pauseRecordingInternal()
        }
        
        // Stop speech recognition if active
        if recognitionTask != nil {
            stopSpeechRecognitionInternal()
        }
        
        // Stop audio streaming if active
        if isStreamingAudio {
            stopAudioStreaming()
        }
        
        // Deactivate audio session
        do {
            try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
            print("✅ AudioSessionManager: Released audio session for interruption")
        } catch {
            print("❌ AudioSessionManager: Failed to release session - \(error.localizedDescription)")
        }
    }
    
    private func reclaimAudioSession(wasSiriInterruption: Bool) {
        do {
            // Reconfigure audio session
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(
                .playAndRecord,
                mode: .default,
                options: [.allowBluetooth, .defaultToSpeaker, .mixWithOthers, .interruptSpokenAudioAndMixWithOthers]
            )
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
            print("🎉 AudioSessionManager: Successfully reclaimed audio session!")
            
            // Resume previously active services
            var resumedServices: [String] = []
            
            if preInterruptionServices.contains("recording") && isPaused {
                resumeRecordingInternal()
                resumedServices.append("recording")
            }
            
            if preInterruptionServices.contains("speechRecognition") {
                do {
                    try startSpeechRecognitionInternal()
                    resumedServices.append("speechRecognition")
                } catch {
                    print("❌ Failed to resume speech recognition: \(error)")
                }
            }
            
            if preInterruptionServices.contains("audioStreaming") {
                do {
                    try startAudioStreaming()
                    resumedServices.append("audioStreaming")
                } catch {
                    print("❌ Failed to resume audio streaming: \(error)")
                }
            }
            
            let eventName = wasSiriInterruption ? "SiriInterruptionEnded" : "AudioInterruptionEnded"
            sendEvent(withName: eventName, body: [
                "canResume": true,
                "resumedServices": resumedServices,
                "reclaimedInBackground": true
            ])
            
        } catch {
            print("❌ AudioSessionManager: Failed to reclaim session - \(error.localizedDescription)")
            let eventName = wasSiriInterruption ? "SiriInterruptionEnded" : "AudioInterruptionEnded"
            sendEvent(withName: eventName, body: [
                "canResume": false,
                "error": error.localizedDescription
            ])
        }
    }
    
    // MARK: - Manual Siri Handling Methods
    @objc func pauseRecordingForSiri(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        print("⏸️ MANUAL: Pausing audio recording for Siri...")
        
        do {
            wasPausedForSiri = true
            
            // Store current services
            preInterruptionServices.removeAll()
            if isRecording { preInterruptionServices.append("recording") }
            if recognitionTask != nil { preInterruptionServices.append("speechRecognition") }
            if isStreamingAudio { preInterruptionServices.append("audioStreaming") }
            
            pauseAllAudioServices()
            
            print("✅ All audio services paused successfully for Siri")
            resolve(["success": true, "message": "Audio paused for Siri", "pausedServices": preInterruptionServices])
        } catch {
            print("❌ Failed to pause audio session: \(error)")
            reject("PAUSE_FAILED", error.localizedDescription, error)
        }
    }
    
    @objc func resumeRecordingAfterSiri(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        print("▶️ MANUAL: Resuming audio recording after Siri...")
        
        // Wait a moment to ensure Siri has fully completed
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.reclaimAudioSession(wasSiriInterruption: true)
            resolve(["success": true, "message": "Audio resumed after Siri"])
        }
    }
    
    // MARK: - Route Change Handling
    @objc private func handleRouteChange(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let reasonValue = userInfo[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else {
            return
        }
        
        print("🎧 AudioSessionManager: Audio route changed - \(reason)")
        
        // Check if this might be Siri-related
        if reason == .override || reason == .categoryChange {
            print("🗣️ Route change might be Siri-related")
        }
        
        sendEvent(withName: "AudioRouteChanged", body: [
            "reason": reasonValue,
            "possibleSiri": reason == .override || reason == .categoryChange
        ])
    }
    
    // MARK: - All other existing methods remain the same...
    // [Include all your existing methods: startContinuousAudioStreaming, stopContinuousAudioStreaming, 
    //  startRecording, stopRecording, pauseRecording, resumeRecording, startPlayback, stopPlayback,
    //  startSpeechRecognition, stopSpeechRecognition, etc.]
    
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
            options: [.defaultToSpeaker, .allowBluetooth, .interruptSpokenAudioAndMixWithOthers]
        )
        try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        
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
        print("🎤 AudioSessionManager: Continuous audio streaming started with Siri compatibility")
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
    
    // MARK: - Speech Recognition Methods
    @objc func startSpeechRecognition(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
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
        recognitionTask?.cancel()
        recognitionTask = nil
        
        speechRecognizer = SFSpeechRecognizer()
        guard let speechRecognizer = speechRecognizer, speechRecognizer.isAvailable else {
            throw NSError(domain: "SpeechError", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "Speech recognition not available"
            ])
        }
        
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else {
            throw NSError(domain: "SpeechError", code: 2, userInfo: [
                NSLocalizedDescriptionKey: "Unable to create recognition request"
            ])
        }
        
        recognitionRequest.shouldReportPartialResults = true
        
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.inputFormat(forBus: 0)
        inputNode.removeTap(onBus: 0)
        
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, time in
            recognitionRequest.append(buffer)
            
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
        print("🗣️ AudioSessionManager: Speech recognition with Siri compatibility started")
        
        recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            if let result = result {
                let spokenText = result.bestTranscription.formattedString
                let isFinal = result.isFinal
                
                print("🎤 SPEECH DETECTED: '\(spokenText)' (Final: \(isFinal))")
                
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
    
    // MARK: - Recording Methods (keeping your existing implementation)
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
            let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            currentRecordingURL = documentsPath.appendingPathComponent(fileName)
            
            let settings: [String: Any] = [
                AVFormatIDKey: Int(kAudioFormatLinearPCM),
                AVSampleRateKey: 16000.0,
                AVNumberOfChannelsKey: 1,
                AVLinearPCMBitDepthKey: 16,
                AVLinearPCMIsBigEndianKey: false,
                AVLinearPCMIsFloatKey: false,
                AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
            ]
            
            audioRecorder = try AVAudioRecorder(url: currentRecordingURL!, settings: settings)
            audioRecorder?.delegate = self
            audioRecorder?.isMeteringEnabled = true
            
            let success = audioRecorder?.record() ?? false
            
            if success {
                isRecording = true
                isPaused = false
                startRecordingTimer()
                
                if !isStreamingAudio {
                    try startAudioStreaming()
                }
                
                print("✅ AudioSessionManager: Recording and streaming started with Siri compatibility")
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
        
        if isAppActive {
            appState = "FOREGROUND"
        } else if isAppBackground {
            appState = "BACKGROUND/HOME_SCREEN"
        } else if isAppInactive {
            appState = "LOCK_SCREEN/INACTIVE"
        }
        
        if (isRecording || audioEngine.isRunning) && hasPermission && isSessionActive {
            micStatus = "🎤 MY APP IS LISTENING TO MIC"
        } else if wasPausedForSiri {
            micStatus = "🗣️ SIRI HAS MICROPHONE"
        } else if !hasPermission {
            micStatus = "❌ NO PERMISSION"
        } else if !isSessionActive {
            micStatus = "⚠️ SESSION INACTIVE"
        } else {
            micStatus = "⚪ MIC AVAILABLE BUT NOT LISTENING"
        }
        
        let timestamp = DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .medium)
        print("[\(timestamp)] 🎤 MIC STATUS: \(micStatus) | APP STATE: \(appState)")
        
        sendEvent(withName: "MicrophoneStatus", body: [
            "status": micStatus,
            "appState": appState,
            "isRecording": isRecording,
            "isSpeechRecognitionActive": audioEngine.isRunning,
            "hasPermission": hasPermission,
            "isSessionActive": isSessionActive,
            "wasPausedForSiri": wasPausedForSiri,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    // MARK: - Recording Timer and other utility methods
    private func startRecordingTimer() {
        recordingTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            guard let self = self, let recorder = self.audioRecorder else { return }
            
            let audioSession = AVAudioSession.sharedInstance()
            let isSessionActive = audioSession.isInputAvailable && audioSession.recordPermission == .granted
            let isRecorderActive = recorder.isRecording
            
            let hasMicrophone = isSessionActive && isRecorderActive
            
            if isRecorderActive {
                recorder.updateMeters()
                let currentTime = recorder.currentTime
                let averagePower = recorder.averagePower(forChannel: 0)
                let peakPower = recorder.peakPower(forChannel: 0)
                
                print("🎙️ MIC ACTIVE - Time: \(String(format: "%.1f", currentTime))s, Power: \(String(format: "%.1f", averagePower))dB")
                
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
            "isStreamingAudio": isStreamingAudio,
            "wasPausedForSiri": wasPausedForSiri
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
        print("🧹 AudioSessionManager: Cleaned up with Siri compatibility")
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