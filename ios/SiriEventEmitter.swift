import Foundation
import React

@objc(SiriEventEmitter)
class SiriEventEmitter: RCTEventEmitter {

  // MARK: - Static references for caching and safety
  static var emitterInstance: SiriEventEmitter?
  static var hasListeners = false
  static var lastEvent: [String: Any]? = nil

  // MARK: - Initialization
  override init() {
    super.init()
    SiriEventEmitter.emitterInstance = self
    print("✅ SiriEventEmitter initialized")

    // Observe for native Siri events
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(onRoveArmCommand(_:)),
      name: Notification.Name("RoveArmCommand"),
      object: nil
    )
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  // MARK: - Notification handler
  @objc func onRoveArmCommand(_ notification: Notification) {
    let payload = notification.userInfo as? [String: Any] ?? ["source": "unknown"]
    if SiriEventEmitter.hasListeners {
      print("📤 Emitting Siri event to React Native:", payload)
      sendEvent(withName: "RoveArmCommand", body: payload)
    } else {
      print("🕓 React bridge not ready — caching Siri event:", payload)
      SiriEventEmitter.lastEvent = payload
    }
  }

  // MARK: - Supported events
  override func supportedEvents() -> [String]! {
    return ["RoveArmCommand"]
  }

  // MARK: - Bridge lifecycle
  override func startObserving() {
    SiriEventEmitter.hasListeners = true
    print("✅ React bridge is now observing Siri events")
    // Replay any cached event if it fired before RN bridge was ready
    if let cached = SiriEventEmitter.lastEvent {
      print("🔁 Replaying cached Siri event:", cached)
      sendEvent(withName: "RoveArmCommand", body: cached)
      SiriEventEmitter.lastEvent = nil
    }
  }

  override func stopObserving() {
    SiriEventEmitter.hasListeners = false
    print("🛑 React bridge stopped observing Siri events")
  }

  // MARK: - Safe static emitter
  @objc static func emit(source: String) {
    let payload = ["source": source]
    print("📦 SiriEventEmitter.emit called with:", payload)

    if let emitter = SiriEventEmitter.emitterInstance {
      if SiriEventEmitter.hasListeners {
        emitter.sendEvent(withName: "RoveArmCommand", body: payload)
        print("📤 SiriEventEmitter emitted directly to RN bridge")
      } else {
        print("⚠️ React bridge not ready, caching Siri event")
        SiriEventEmitter.lastEvent = payload
      }
    } else {
      print("⚠️ SiriEventEmitter not yet initialized, caching Siri event")
      SiriEventEmitter.lastEvent = payload
    }
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
