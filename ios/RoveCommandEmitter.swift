import Foundation
import React

@objc(RoveCommandEmitter)
class RoveCommandEmitter: RCTEventEmitter {
  
  public static var shared: RoveCommandEmitter?
  
  override init() {
    super.init()
    RoveCommandEmitter.shared = self
    
    // Listen for the notification posted by ArmRoveIntent
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleRoveArmCommand),
      name: NSNotification.Name("RoveArmCommand"),
      object: nil
    )
  }
  
  @objc func handleRoveArmCommand(_ notification: Notification) {
    print("🎯 RoveCommandEmitter received RoveArmCommand notification")
    
    let userInfo = notification.userInfo ?? [:]
    let source = userInfo["source"] as? String ?? "unknown"
    let action = userInfo["action"] as? String ?? "arm"
    
    print("🎯 Emitting RoveArmCommand to React Native with source: \(source)")
    
    sendEvent(withName: "RoveArmCommand", body: [
      "action": action,
      "source": source,
      "timestamp": Date().timeIntervalSince1970
    ])
  }
  
  override func supportedEvents() -> [String]! {
    return ["RoveArmCommand"]
  }
  
  override class func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  deinit {
    NotificationCenter.default.removeObserver(self)
  }
}