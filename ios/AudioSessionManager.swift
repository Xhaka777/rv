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
    private var hasListeners = false  // 🔥 FIX: Add listener tracking like MicrophoneBridge
    
    // Speech Recognition Properties
    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var audioEngine = AVAudioEngine()
    
    // Audio streaming properties for WebSocket
    private var audioStreamingTimer: Timer?
    private var audioBufferQueue: [Data] = []
    private var isStreamingAudio = false
    
    // 🔥 NEW: Enhanced Interruption Handling Properties (from MicrophoneManager)
    private var isSuspended = false  // Track interruption state
    private var wasPausedForSiri = false
    private var preInterruptionServices: [String] = []
    
    // 🔥 NEW: Audio session reference for better interruption handling
    private let audioSession = AVAudioSession.sharedInstance()
    
    // MARK: - React Native Module Setup
    override static func moduleName() -> String! {
        return "AudioSessionManager"
    }
    
    override static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    // 🔥 FIX: Add RCTEventEmitter overrides like MicrophoneBridge
    override func startObserving() {
        hasListeners = true
    }
    
    override func stopObserving() {
        hasListeners = false
    }
    
    override func supportedEvents() -> [String]! {
        return [
            // Existing events
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
            "SiriInterruptionEnded",
            // NEW: Microphone-specific interruption events
            "microphoneStatusChanged",
            "microphoneInterruption",
            "audioRouteChanged",
            "microphoneDebugLog",
            "HeySiriDetected"

        ]
    }
    
    // MARK: - Initialization
    override init() {
        super.init()
        sendDebugLog("AudioSessionManager initialized - audio session NOT activated yet")
        setupEnhancedInterruptionHandling()
        startMicrophoneStatusMonitoring()
        print("🎤 [AUDIO_SESSION] Manager initialized with enhanced interruption handling")
    }
    
//    deinit {
//        cleanup()
//    }
    
    // MARK: - 🔥 NEW: Enhanced Audio Session Setup (from MicrophoneManager logic)
    private func setupAudioSessionOnDemand() -> Bool {
        do {
            // Use playAndRecord category which is more likely to be interrupted
            try audioSession.setCategory(.playAndRecord,
                                       mode: .default,
                                       options: [.allowBluetooth, .defaultToSpeaker])
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
            print("✅ [AUDIO_SESSION] Audio session configured successfully")
            sendDebugLog("Audio session setup complete with .playAndRecord category")
            return true
        } catch {
            print("❌ [AUDIO_SESSION] Failed to setup audio session: \(error)")
            sendDebugLog("Audio session setup failed: \(error.localizedDescription)")
            return false
        }
    }
    
    // MARK: - 🔥 NEW: Enhanced Interruption Handling Setup (from MicrophoneManager)
    private func setupEnhancedInterruptionHandling() {
        // Audio interruption notification (for regular apps)
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleEnhancedAudioSessionInterruption),
            name: AVAudioSession.interruptionNotification,
            object: audioSession
        )
        
        // Audio route change notification
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleEnhancedAudioSessionRouteChange),
            name: AVAudioSession.routeChangeNotification,
            object: audioSession
        )
        
        // CRITICAL: Silence secondary audio hint (THIS IS FOR SIRI!)
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleSilenceHint),
            name: AVAudioSession.silenceSecondaryAudioHintNotification,
            object: audioSession
        )
        
        // App lifecycle notifications (for additional Siri detection)
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAppWillResignActive),
            name: UIApplication.willResignActiveNotification,
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAppDidBecomeActive),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleDidEnterBackground),
            name: UIApplication.didEnterBackgroundNotification,
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleWillEnterForeground),
            name: UIApplication.willEnterForegroundNotification,
            object: nil
        )
        
        // Audio session activation/deactivation (for additional system detection)
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAudioSessionActivation),
            name: AVAudioSession.mediaServicesWereLostNotification,
            object: audioSession
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAudioSessionRestored),
            name: AVAudioSession.mediaServicesWereResetNotification,
            object: audioSession
        )
        
        print("✅ [AUDIO_SESSION] Enhanced interruption observers registered")
    }
    
    // MARK: - 🔥 NEW: Enhanced Interruption Handling Methods (from MicrophoneManager)
    @objc private func handleEnhancedAudioSessionInterruption(_ notification: Notification) {
        print("🚨 [AUDIO_SESSION] Audio session interruption notification received!")
        sendDebugLog("=== INTERRUPTION NOTIFICATION RECEIVED ===")
        
        guard let userInfo = notification.userInfo else {
            print("❌ [AUDIO_SESSION] No userInfo in interruption notification")
            sendDebugLog("No userInfo in interruption notification")
            return
        }
        
        print("📋 [AUDIO_SESSION] UserInfo: \(userInfo)")
        sendDebugLog("UserInfo contents: \(String(describing: userInfo))")
        
        guard let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
            print("❌ [AUDIO_SESSION] Could not determine interruption type")
            sendDebugLog("Could not determine interruption type from userInfo")
            return
        }
        
        print("🎯 [AUDIO_SESSION] Interruption type: \(type.rawValue) (\(type == .began ? "BEGAN" : "ENDED"))")
        sendDebugLog("Interruption type: \(type == .began ? "BEGAN" : "ENDED")")
        
        switch type {
        case .began:
            handleInterruptionBegan(userInfo: userInfo)
        case .ended:
            handleInterruptionEnded(userInfo: userInfo)
        @unknown default:
            print("❓ [AUDIO_SESSION] Unknown interruption type: \(type.rawValue)")
            sendDebugLog("❓ Unknown interruption type: \(type.rawValue)")
            break
        }
    }
    
    private func handleInterruptionBegan(userInfo: [AnyHashable: Any]) {
        // Another app (like Siri) needs the microphone
        print("🔴 [AUDIO_SESSION] INTERRUPTION BEGAN - Another app took microphone")
        sendDebugLog("🔴 INTERRUPTION BEGAN - Another app needs microphone")
        isSuspended = true  // Set suspended flag
        
        // Store what services were running before interruption
        preInterruptionServices.removeAll()
        if isRecording { preInterruptionServices.append("recording") }
        if recognitionTask != nil { preInterruptionServices.append("speechRecognition") }
        if isStreamingAudio { preInterruptionServices.append("audioStreaming") }
        
        if isRecording || isStreamingAudio || recognitionTask != nil {
            // Don't manually stop the engine - iOS will do this for us
            sendMicrophoneInterruptionEvent(type: "began", reason: "Another app needs microphone")
            print("📢 [AUDIO_SESSION] Sent 'began' interruption event")
            sendDebugLog("Sent interruption began event to React Native")
        }
    }
    
    private func handleInterruptionEnded(userInfo: [AnyHashable: Any]) {
        // Other app (like Siri) finished, we can resume
        print("🟢 [AUDIO_SESSION] INTERRUPTION ENDED - Checking if we can resume")
        sendDebugLog("🟢 INTERRUPTION ENDED - Checking resume options")
        
        isSuspended = false  // Clear suspended flag
        
        if let optionsValue = userInfo[AVAudioSessionInterruptionOptionKey] as? UInt {
            let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
            print("🔍 [AUDIO_SESSION] Interruption options: \(options.rawValue) (shouldResume: \(options.contains(.shouldResume)))")
            sendDebugLog("Interruption options - shouldResume: \(options.contains(.shouldResume))")
            
            if options.contains(.shouldResume) {
                // Resume services
                print("✅ [AUDIO_SESSION] Should resume - attempting to restart services")
                sendDebugLog("Should resume - attempting to restart services")
                
                // Add a small delay to ensure the interrupting app has fully released the session
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    self.attemptToResumeServices()
                }
            } else {
                print("⚠️ [AUDIO_SESSION] Interruption ended but should not resume")
                sendDebugLog("⚠️ Interruption ended but should NOT resume")
                sendMicrophoneInterruptionEvent(type: "ended_no_resume", reason: "Interruption ended but should not resume")
            }
        } else {
            print("❌ [AUDIO_SESSION] No interruption options in userInfo")
            sendDebugLog("❌ No interruption options found in userInfo")
        }
    }
      
    private func reactivateAudioSessionWithRetry(
        retries: Int = 5,
        delay: TimeInterval = 0.4,
        completion: @escaping (Bool) -> Void
    ) {
        do {
            try audioSession.setCategory(.playAndRecord,
                                         mode: .default,
                                         options: [.allowBluetooth, .defaultToSpeaker])
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
            print("✅ [AUDIO_SESSION] Reactivated successfully")
            completion(true)
        } catch {
            print("⚠️ [AUDIO_SESSION] Reactivation failed: \(error) (remaining: \(retries))")
            if retries > 0 {
                DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                    self.reactivateAudioSessionWithRetry(
                        retries: retries - 1,
                        delay: delay * 1.5,
                        completion: completion
                    )
                }
            } else {
                completion(false)
            }
        }
    }

  
    private func attemptToResumeServices() {
        reactivateAudioSessionWithRetry { success in
            guard success else {
                self.sendMicrophoneInterruptionEvent(
                    type: "failed_resume",
                    reason: "All retries failed"
                )
                return
            }

            var resumedServices: [String] = []
            if self.preInterruptionServices.contains("recording") && self.isPaused {
                self.resumeRecordingInternal()
                resumedServices.append("recording")
            }
            if self.preInterruptionServices.contains("speechRecognition") {
                try? self.startSpeechRecognitionInternal()
                resumedServices.append("speechRecognition")
            }
            if self.preInterruptionServices.contains("audioStreaming") {
                try? self.startAudioStreaming()
                resumedServices.append("audioStreaming")
            }

            self.sendMicrophoneInterruptionEvent(
                type: "ended",
                reason: "Services resumed successfully after retry"
            )
            print("✅ [AUDIO_SESSION] Services resumed after retry")
        }
    }

    
    // MARK: - 🔥 NEW: CRITICAL - Silence Secondary Audio Hint Handler (FOR SIRI!)
    @objc private func handleSilenceHint(_ notification: Notification) {
        print("🚨 [AUDIO_SESSION] SILENCE HINT NOTIFICATION RECEIVED!")
        sendDebugLog("🚨 SILENCE HINT NOTIFICATION - This is likely Siri!")
        
        guard let info = notification.userInfo,
              let typeValue = info[AVAudioSessionSilenceSecondaryAudioHintTypeKey] as? UInt,
              let type = AVAudioSession.SilenceSecondaryAudioHintType(rawValue: typeValue) else {
            print("❌ [AUDIO_SESSION] Could not parse silence hint type")
            sendDebugLog("❌ Could not parse silence hint type")
            return
        }

        if type == .begin {
            print("🔴 [AUDIO_SESSION] SIRI SILENCE HINT BEGIN - Secondary audio silenced!")
            sendDebugLog("🔴 SIRI DETECTED via silence hint - secondary audio silenced")
            sendMicrophoneInterruptionEvent(type: "siri_began", reason: "Secondary audio silenced (likely Siri)")
            isSuspended = true
        } else {
            print("🟢 [AUDIO_SESSION] SIRI SILENCE HINT END - Secondary audio resumed!")
            sendDebugLog("🟢 SIRI ENDED via silence hint - secondary audio resumed")
            sendMicrophoneInterruptionEvent(type: "siri_ended", reason: "Secondary audio resumed (Siri finished)")
            
            // Use the recommended force re-activation pattern
            forceReactivateAfterSiri()
        }
    }
    
    // MARK: - 🔥 NEW: Enhanced Route Change Handling
    @objc private func handleEnhancedAudioSessionRouteChange(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let reasonValue = userInfo[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else {
            return
        }
        
        print("🎧 [AUDIO_SESSION] Audio route changed: \(reason.rawValue)")
        sendDebugLog("Audio route changed: \(reason.rawValue)")
        
        var reasonString = ""
        switch reason {
        case .newDeviceAvailable:
            reasonString = "new_device_available"
            print("🎧 [AUDIO_SESSION] New audio device available")
        case .oldDeviceUnavailable:
            reasonString = "device_disconnected"
            print("🎧 [AUDIO_SESSION] Audio device disconnected")
        case .categoryChange:
            reasonString = "category_changed"
            print("🎧 [AUDIO_SESSION] Audio category changed")
        default:
            reasonString = "route_changed"
            print("🎧 [AUDIO_SESSION] Audio route changed: \(reason.rawValue)")
        }
        
        sendAudioRouteChangeEvent(reason: reasonString)
    }
    
    // MARK: - 🔥 NEW: App Lifecycle Handlers
    @objc private func handleDidEnterBackground() {
        print("📱 [AUDIO_SESSION] App entered background – monitoring Siri/Call interruptions")
        sendDebugLog("📱 App entered background – monitoring Siri/Call interruptions")
    }

    @objc private func handleWillEnterForeground() {
        print("📱 [AUDIO_SESSION] App entering foreground – verifying services state")
        sendDebugLog("📱 App entering foreground – verifying services state")
        verifyServicesAreActuallyWorking()
    }
    
    @objc private func handleAppWillResignActive() {
        print("📱 [AUDIO_SESSION] App will resign active")
        sendDebugLog("📱 App going to background")
    }
    
    @objc private func handleAppDidBecomeActive() {
        print("📱 [AUDIO_SESSION] App did become active")
        sendDebugLog("📱 App returned to foreground")
        
        if isRecording || isStreamingAudio || recognitionTask != nil {
            verifyServicesAreActuallyWorking()
        }
    }
    
    private func verifyServicesAreActuallyWorking() {
        guard isRecording || isStreamingAudio || recognitionTask != nil else { return }
        
        let isEngineRunning = audioEngine.isRunning
        let isRecorderActive = audioRecorder?.isRecording ?? false
        
        if (isStreamingAudio || recognitionTask != nil) && !isEngineRunning {
            print("❌ [AUDIO_SESSION] Engine claims to be running but isn't - restarting")
            sendDebugLog("❌ Engine not actually working - restarting")
            sendMicrophoneInterruptionEvent(type: "siri_ended", reason: "Engine verification failed, restarting")
            restartServicesAfterSiri()
        } else if isRecording && !isRecorderActive {
            print("❌ [AUDIO_SESSION] Recorder claims to be recording but isn't - restarting")
            sendDebugLog("❌ Recorder not actually working - restarting")
        } else {
            print("✅ [AUDIO_SESSION] Services verified as actually working")
            sendDebugLog("✅ Services verified as working")
        }
    }
    
    private func restartServicesAfterSiri() {
        print("🔄 [AUDIO_SESSION] Restarting services after Siri")
        sendDebugLog("🔄 Restarting services after Siri interruption")
        
        // Stop all services
        let wasRecording = isRecording
        let wasStreaming = isStreamingAudio
        let wasSpeechRecognizing = recognitionTask != nil
        
        stopAllServices()
        
        // Restart after delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            do {
                if wasRecording {
                    // Would need to restart recording with proper filename
                    print("📝 Recording restart needed")
                }
                
                if wasStreaming {
                    try self.startAudioStreaming()
                    print("✅ Audio streaming restarted after Siri")
                }
                
                if wasSpeechRecognizing {
                    try self.startSpeechRecognitionInternal()
                    print("✅ Speech recognition restarted after Siri")
                }
                
                self.sendDebugLog("✅ Services successfully restarted after Siri")
            } catch {
                print("❌ [AUDIO_SESSION] Failed to restart services after Siri: \(error)")
                self.sendDebugLog("❌ Failed to restart services after Siri: \(error.localizedDescription)")
            }
        }
    }
    
    // MARK: - Force Re-activation After Siri (Recommended Pattern)
    private func forceReactivateAfterSiri() {
        print("💪 [AUDIO_SESSION] Force re-activating audio session after Siri")
        sendDebugLog("💪 Force re-activating audio session after Siri")
        
        guard isRecording || isStreamingAudio || recognitionTask != nil else {
            print("⚠️ [AUDIO_SESSION] No active services, skipping force reactivation")
            return
        }
        
        isSuspended = false
        
        do {
            // Step 1: Force deactivate first
            try audioSession.setActive(false, options: .notifyOthersOnDeactivation)
            print("✅ [AUDIO_SESSION] Session deactivated, waiting before reactivation...")
            sendDebugLog("✅ Session deactivated, waiting before reactivation")
            
            // Step 2: Wait and then force reactivation
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                do {
                    // Re-set category
                    try self.audioSession.setCategory(.playAndRecord,
                                                    mode: .default,
                                                    options: [.allowBluetooth, .defaultToSpeaker])
                    // Reactivate session
                    try self.audioSession.setActive(true, options: [])
                    
                    // Restart engine if needed
                    if self.audioEngine.isRunning == false && (self.isStreamingAudio || self.recognitionTask != nil) {
                        try self.audioEngine.start()
                        print("✅ [AUDIO_SESSION] Force reactivation successful!")
                        self.sendDebugLog("✅ Force reactivation successful!")
                    } else {
                        print("ℹ️ [AUDIO_SESSION] Engine already running after reactivation")
                        self.sendDebugLog("ℹ️ Engine already running after reactivation")
                    }
                } catch {
                    print("❌ [AUDIO_SESSION] Force reactivation failed: \(error)")
                    self.sendDebugLog("❌ Force reactivation failed: \(error.localizedDescription)")
                    // Fallback to complete restart
                    self.restartServicesAfterSiri()
                }
            }
        } catch {
            print("❌ [AUDIO_SESSION] Failed to deactivate session: \(error)")
            sendDebugLog("❌ Failed to deactivate session: \(error.localizedDescription)")
            // Fallback to complete restart
            restartServicesAfterSiri()
        }
    }
    
    // MARK: - 🔥 NEW: Audio Session Media Services (Additional Siri Detection)
    @objc private func handleAudioSessionActivation(_ notification: Notification) {
        print("📻 [AUDIO_SESSION] Audio session media services lost - likely Siri or system audio")
        sendDebugLog("Audio session media services lost")
        if isRecording || isStreamingAudio || recognitionTask != nil {
            sendMicrophoneInterruptionEvent(type: "system_began", reason: "System audio service interrupted (possibly Siri)")
        }
    }
    
    @objc private func handleAudioSessionRestored(_ notification: Notification) {
        print("📻 [AUDIO_SESSION] Audio session media services restored")
        sendDebugLog("Audio session media services restored")
        if (isRecording || isStreamingAudio || recognitionTask != nil) && isSuspended {
            print("🟢 [AUDIO_SESSION] Attempting to restart after system audio restoration")
            sendDebugLog("Attempting restart after system audio restoration")
            isSuspended = false
            
            do {
                try audioSession.setActive(true)
                if !audioEngine.isRunning && (isStreamingAudio || recognitionTask != nil) {
                    try audioEngine.start()
                    sendMicrophoneInterruptionEvent(type: "system_ended", reason: "System audio restored, services resumed")
                }
            } catch {
                print("❌ [AUDIO_SESSION] Failed to restart after system restoration: \(error)")
                sendDebugLog("Failed to restart after system restoration: \(error.localizedDescription)")
            }
        }
    }
    
    // MARK: - Audio Streaming for WebSocket (Enhanced with interruption handling)
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
        // 🔥 ENHANCED: Setup audio session on demand instead of always active
        if !setupAudioSessionOnDemand() {
            throw NSError(domain: "AudioStreamingError", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "Failed to setup audio session"
            ])
        }
        
        // Configure audio engine for streaming
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.inputFormat(forBus: 0)
        inputNode.removeTap(onBus: 0)
        
        // Install tap to capture audio data
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] (buffer, time) in
            guard let self = self else { return }
            
            // Convert audio buffer to Data
            let audioData = self.convertAudioBufferToData(buffer: buffer)
            
            // 🔥 FIX: Check hasListeners before sending events
            guard self.hasListeners else { return }
            
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
        sendMicrophoneStatusEvent(isActive: true, reason: "audio_streaming_started")
        print("🎤 [AUDIO_SESSION] Continuous audio streaming started with enhanced interruption handling")
    }
    
    private func stopAudioStreaming() {
        if audioEngine.isRunning {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
        }
        isStreamingAudio = false
        
        // 🔥 ENHANCED: Deactivate audio session to free it for other apps (like Siri!)
        do {
            try audioSession.setActive(false, options: .notifyOthersOnDeactivation)
            print("✅ [AUDIO_SESSION] Audio session deactivated - Siri should work again")
            sendDebugLog("Audio session deactivated - other apps can use audio again")
        } catch {
            print("⚠️ [AUDIO_SESSION] Failed to deactivate audio session: \(error)")
            sendDebugLog("Failed to deactivate audio session: \(error.localizedDescription)")
        }
        
        sendMicrophoneStatusEvent(isActive: false, reason: "audio_streaming_stopped")
        print("🔴 [AUDIO_SESSION] Continuous audio streaming stopped")
    }
    
    private func convertAudioBufferToData(buffer: AVAudioPCMBuffer) -> Data {
        let audioBuffer = buffer.audioBufferList.pointee.mBuffers
        let data = Data(bytes: audioBuffer.mData!, count: Int(audioBuffer.mDataByteSize))
        return data
    }
    
    // MARK: - Speech Recognition Methods (Enhanced with interruption handling)
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

    // MARK: - Hey Siri Detection
    private func detectHeySiriCommand(in text: String) -> Bool {
        let lowercaseText = text.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        
        // Various ways users might say "Hey Siri"
        let siriTriggers = [
            "hey siri",
            "hi siri",
            "hello siri",
            "ok siri"
        ]
        
        // Check if any Siri trigger is contained in the speech
        for trigger in siriTriggers {
            if lowercaseText.contains(trigger) {
                return true
            }
        }
        
        return false
    }

    private func sendHeySiriDetectedEvent() {
        guard hasListeners else { return }
        
        print("🗣️ [AUDIO_SESSION] Hey Siri detected - sending event to React Native")
        sendDebugLog("🗣️ Hey Siri command detected while app has microphone")
        
        sendEvent(withName: "HeySiriDetected", body: [
            "detected": true,
            "message": "Hey Siri detected while app is using microphone",
            "timestamp": Date().timeIntervalSince1970
        ])
    }

    private func startSpeechRecognitionInternal() throws {
        recognitionTask?.cancel()
        recognitionTask = nil
        
        // 🔥 ENHANCED: Setup audio session on demand
        if !setupAudioSessionOnDemand() {
            throw NSError(domain: "SpeechRecognitionError", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "Failed to setup audio session"
            ])
        }
        
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
                
                // 🔥 FIX: Check hasListeners before sending events
                guard self.hasListeners else { return }
                
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
        sendMicrophoneStatusEvent(isActive: true, reason: "speech_recognition_started")
        print("🗣️ [AUDIO_SESSION] Speech recognition with enhanced interruption handling started")
        
        recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            if let result = result {
                let spokenText = result.bestTranscription.formattedString
                let isFinal = result.isFinal
                
                print("🎤 SPEECH DETECTED: '\(spokenText)' (Final: \(isFinal))")
                
                // 🔥 NEW: Check for "Hey Siri" detection
                if let self = self, self.detectHeySiriCommand(in: spokenText) {
                    print("🗣️ HEY SIRI DETECTED! App has microphone, cannot trigger Siri")
                    self.sendHeySiriDetectedEvent()
                }
                
                // 🔥 FIX: Check hasListeners before sending events
                if let self = self, self.hasListeners {
                    self.sendEvent(withName: "SpeechRecognized", body: [
                        "text": spokenText,
                        "isFinal": isFinal,
                        "timestamp": Date().timeIntervalSince1970
                    ])
                }
            }
            
            if error != nil || result?.isFinal == true {
                self?.audioEngine.stop()
                inputNode.removeTap(onBus: 0)
                self?.recognitionRequest = nil
                self?.recognitionTask = nil
                
                // 🔥 ENHANCED: Deactivate session when stopping
                do {
                    try self?.audioSession.setActive(false, options: .notifyOthersOnDeactivation)
                } catch {
                    print("⚠️ Failed to deactivate session after speech recognition: \(error)")
                }
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
        
        sendMicrophoneStatusEvent(isActive: false, reason: "speech_recognition_stopped")
        print("🔴 [AUDIO_SESSION] Speech recognition stopped")
    }
    
    // MARK: - NEW: Manual Siri Handling Methods (keeping original functionality)
    @objc func pauseRecordingForSiri(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        print("⏸️ MANUAL: Pausing all services for Siri...")
        
        do {
            wasPausedForSiri = true
            
            // Store current services
            preInterruptionServices.removeAll()
            if isRecording { preInterruptionServices.append("recording") }
            if recognitionTask != nil { preInterruptionServices.append("speechRecognition") }
            if isStreamingAudio { preInterruptionServices.append("audioStreaming") }
            
            stopAllServices()
            
            print("✅ All services paused successfully for Siri")
            resolve(["success": true, "message": "All services paused for Siri", "pausedServices": preInterruptionServices])
        } catch {
            print("❌ Failed to pause services for Siri: \(error)")
            reject("PAUSE_FAILED", error.localizedDescription, error)
        }
    }
    
    @objc func resumeRecordingAfterSiri(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        print("▶️ MANUAL: Resuming services after Siri...")
        
        // Wait a moment to ensure Siri has fully completed
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.forceReactivateAfterSiri()
            resolve(["success": true, "message": "Services resumed after Siri"])
        }
    }
    
    private func stopAllServices() {
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
            try audioSession.setActive(false, options: .notifyOthersOnDeactivation)
            print("✅ [AUDIO_SESSION] Released audio session for interruption")
        } catch {
            print("❌ [AUDIO_SESSION] Failed to release session - \(error.localizedDescription)")
        }
    }
    
    // MARK: - Recording Methods (keeping your existing implementation with enhancements)
    @objc func startRecording(
        _ fileName: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard !isRecording else {
            reject("ALREADY_RECORDING", "Recording is already in progress", nil)
            return
        }
        
        // 🔥 ENHANCED: Setup audio session on demand
        guard setupAudioSessionOnDemand() else {
            reject("AUDIO_SESSION_ERROR", "Failed to setup audio session", nil)
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
                sendMicrophoneStatusEvent(isActive: true, reason: "recording_started")
                
                if !isStreamingAudio {
                    try startAudioStreaming()
                }
                
                print("✅ [AUDIO_SESSION] Recording and streaming started with enhanced interruption handling")
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
        print("✅ [AUDIO_SESSION] Recording and streaming stopped")
        
        sendMicrophoneStatusEvent(isActive: false, reason: "recording_stopped")
        resolve([
            "success": true,
            "filePath": filePath
        ])
        
        // 🔥 FIX: Check hasListeners before sending events
        if hasListeners {
            sendEvent(withName: "RecordingFinished", body: [
                "filePath": filePath,
                "duration": audioRecorder?.currentTime ?? 0
            ])
        }
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
        sendMicrophoneStatusEvent(isActive: false, reason: "recording_paused")
        print("⏸️ [AUDIO_SESSION] Recording paused")
    }
    
    private func resumeRecordingInternal() {
        let success = audioRecorder?.record() ?? false
        if success {
            isPaused = false
            startRecordingTimer()
            sendMicrophoneStatusEvent(isActive: true, reason: "recording_resumed")
            print("▶️ [AUDIO_SESSION] Recording resumed")
        }
    }
    
    // MARK: - 🔥 NEW: Event Emission Methods (from MicrophoneManager) - FIXED
    private func sendMicrophoneStatusEvent(isActive: Bool, reason: String) {
        guard hasListeners else { return }  // 🔥 FIX: Check hasListeners like MicrophoneBridge
        
        print("📤 [AUDIO_SESSION] Sending status event: isActive=\(isActive), reason=\(reason)")
        sendEvent(withName: "microphoneStatusChanged", body: [
            "isActive": isActive,
            "reason": reason,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    private func sendMicrophoneInterruptionEvent(type: String, reason: String) {
        guard hasListeners else { return }  // 🔥 FIX: Check hasListeners like MicrophoneBridge
        
        print("📤 [AUDIO_SESSION] Sending interruption event: type=\(type), reason=\(reason)")
        sendDebugLog("📤 Sending interruption event: \(type) - \(reason)")
        sendEvent(withName: "microphoneInterruption", body: [
            "type": type,
            "reason": reason,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    private func sendAudioRouteChangeEvent(reason: String) {
        guard hasListeners else { return }  // 🔥 FIX: Check hasListeners like MicrophoneBridge
        
        print("📤 [AUDIO_SESSION] Sending route change event: reason=\(reason)")
        sendEvent(withName: "audioRouteChanged", body: [
            "reason": reason,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    private func sendDebugLog(_ message: String) {
        guard hasListeners else { return }  // 🔥 FIX: Check hasListeners like MicrophoneBridge
        
        sendEvent(withName: "microphoneDebugLog", body: [
            "message": message,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    // MARK: - Microphone Status Monitoring (Enhanced)
    private func startMicrophoneStatusMonitoring() {
        micMonitoringTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.checkMicrophoneStatus()
        }
    }
    
  private func checkMicrophoneStatus() {
      let isSessionActive = audioSession.isInputAvailable
      let hasPermission = audioSession.recordPermission == .granted
      let isAppActive = UIApplication.shared.applicationState == .active
      let isAppBackground = UIApplication.shared.applicationState == .background
      let isAppInactive = UIApplication.shared.applicationState == .inactive

      var appState = "unknown"
      if isAppActive { appState = "FOREGROUND" }
      else if isAppBackground { appState = "BACKGROUND/HOME_SCREEN" }
      else if isAppInactive { appState = "LOCK_SCREEN/INACTIVE" }

      var micStatus = "⚪ MIC AVAILABLE BUT NOT LISTENING"

      if (isRecording || audioEngine.isRunning) && hasPermission && isSessionActive {
          micStatus = "🎤 MY APP IS LISTENING TO MIC"
      } else if wasPausedForSiri || isSuspended {
          micStatus = "🗣️ SIRI/OTHER APP HAS MICROPHONE"
      } else if !hasPermission {
          micStatus = "❌ NO PERMISSION"
      } else if !isSessionActive {
          micStatus = "⚠️ SESSION INACTIVE"
      }

      // 🧠 NEW: auto-resume logic
      if micStatus == "⚪ MIC AVAILABLE BUT NOT LISTENING"
          && (wasPausedForSiri || isSuspended)
          && hasPermission
      {
          print("🔄 [AUDIO_SESSION] Mic became available - auto reactivating session")
          wasPausedForSiri = false
          isSuspended = false

          DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
              do {
                  try self.audioSession.setCategory(.playAndRecord,
                                                    mode: .default,
                                                    options: [.allowBluetooth, .defaultToSpeaker])
                  try self.audioSession.setActive(true, options: .notifyOthersOnDeactivation)
                  print("✅ [AUDIO_SESSION] Auto-reactivated after mic became available")
                  self.sendDebugLog("✅ Auto-reactivated when mic became available")

                  // Resume previous services
                  self.attemptToResumeServices()
              } catch {
                  print("❌ [AUDIO_SESSION] Auto-reactivation failed: \(error)")
                  self.sendDebugLog("❌ Auto-reactivation failed: \(error.localizedDescription)")
              }
          }
      }

      // existing event emission logic...
      if hasListeners {
          sendEvent(withName: "MicrophoneStatus", body: [
              "status": micStatus,
              "appState": appState,
              "isRecording": isRecording,
              "isSpeechRecognitionActive": audioEngine.isRunning,
              "hasPermission": hasPermission,
              "isSessionActive": isSessionActive,
              "wasPausedForSiri": wasPausedForSiri,
              "isSuspended": isSuspended,
              "timestamp": Date().timeIntervalSince1970
          ])
      }
  }

    
    // MARK: - Recording Timer and other utility methods
    private func startRecordingTimer() {
        recordingTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            guard let self = self, let recorder = self.audioRecorder else { return }
            
            let isSessionActive = self.audioSession.isInputAvailable && self.audioSession.recordPermission == .granted
            let isRecorderActive = recorder.isRecording
            
            let hasMicrophone = isSessionActive && isRecorderActive
            
            if isRecorderActive {
                recorder.updateMeters()
                let currentTime = recorder.currentTime
                let averagePower = recorder.averagePower(forChannel: 0)
                let peakPower = recorder.peakPower(forChannel: 0)
                
                print("🎙️ MIC ACTIVE - Time: \(String(format: "%.1f", currentTime))s, Power: \(String(format: "%.1f", averagePower))dB")
                
                // 🔥 FIX: Check hasListeners before sending events
                guard self.hasListeners else { return }
                
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
        let state: [String: Any] = [
            "category": audioSession.category.rawValue,
            "isActive": audioSession.isInputAvailable,
            "hasPermission": audioSession.recordPermission == .granted,
            "isRecording": isRecording,
            "isPaused": isPaused,
            "isSpeechRecognitionActive": audioEngine.isRunning,
            "isStreamingAudio": isStreamingAudio,
            "wasPausedForSiri": wasPausedForSiri,
            "isSuspended": isSuspended
        ]
        resolve(state)
    }
    
    @objc func requestMicPermission(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        audioSession.requestRecordPermission { granted in
            resolve(granted)
        }
    }
    
    @objc func getRecordingsList(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        // Implementation for getting recordings list
        resolve([])
    }
    
    // MARK: - Cleanup
    private func cleanup() {
        NotificationCenter.default.removeObserver(self)
        stopRecordingTimer()
        stopSpeechRecognitionInternal()
        stopAudioStreaming()
        audioRecorder?.stop()
        audioPlayer?.stop()
        micMonitoringTimer?.invalidate()
        micMonitoringTimer = nil
        print("🧹 [AUDIO_SESSION] Cleaned up with enhanced interruption handling")
    }
    
    deinit {
        cleanup()
    }
}

// MARK: - AVAudioRecorderDelegate
extension AudioSessionManager: AVAudioRecorderDelegate {
    func audioRecorderDidFinishRecording(_ recorder: AVAudioRecorder, successfully flag: Bool) {
        print("🎙️ [AUDIO_SESSION] Recording finished successfully: \(flag)")
        isRecording = false
        isPaused = false
        stopRecordingTimer()
        
        // 🔥 FIX: Check hasListeners before sending events
        guard hasListeners else { return }
        
        sendEvent(withName: "RecordingFinished", body: [
            "success": flag,
            "filePath": recorder.url.path,
            "duration": recorder.currentTime
        ])
    }
    
    func audioRecorderEncodeErrorDidOccur(_ recorder: AVAudioRecorder, error: Error?) {
        print("❌ [AUDIO_SESSION] Recording error - \(error?.localizedDescription ?? "Unknown")")
        isRecording = false
        isPaused = false
        stopRecordingTimer()
        
        // 🔥 FIX: Check hasListeners before sending events
        guard hasListeners else { return }
        
        sendEvent(withName: "RecordingFinished", body: [
            "success": false,
            "error": error?.localizedDescription ?? "Recording error"
        ])
    }
}

// MARK: - AVAudioPlayerDelegate
extension AudioSessionManager: AVAudioPlayerDelegate {
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        print("🔊 [AUDIO_SESSION] Playback finished successfully: \(flag)")
        
        // 🔥 FIX: Check hasListeners before sending events
        guard hasListeners else { return }
        
        sendEvent(withName: "PlaybackFinished", body: [
            "success": flag,
            "duration": player.duration
        ])
    }
    
    func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        print("❌ [AUDIO_SESSION] Playback error - \(error?.localizedDescription ?? "Unknown")")
        
        // 🔥 FIX: Check hasListeners before sending events
        guard hasListeners else { return }
        
        sendEvent(withName: "PlaybackFinished", body: [
            "success": false,
            "error": error?.localizedDescription ?? "Playback error"
        ])
    }
}
