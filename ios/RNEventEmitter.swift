// RNEventEmitter.swift
import Foundation
import React

@objc(RNEventEmitter)
class RNEventEmitter: RCTEventEmitter {
  
  // Singleton instance
  static let shared = RNEventEmitter()
  
  override init() {
    super.init()
    
    // Listen for the notification from AppDelegate
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleRoveArmCommand(_:)),
      name: Notification.Name("RoveArmCommand"),
      object: nil
    )
  }
  
  @objc func handleRoveArmCommand(_ notification: Notification) {
    print("🎯 RNEventEmitter: Received RoveArmCommand notification")
    print("🎯 RNEventEmitter: Notification userInfo: \(notification.userInfo ?? [:])")
    
    // Send event to React Native
    self.sendEvent(withName: "RoveArmCommand", body: notification.userInfo)
    print("🎯 RNEventEmitter: Event sent to React Native")
  }
  
  override func supportedEvents() -> [String]! {
    return ["RoveArmCommand"]
  }
  
  override func constantsToExport() -> [AnyHashable: Any]! {
    return [:]
  }
  
  @objc override static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  deinit {
    NotificationCenter.default.removeObserver(self)
  }
}
