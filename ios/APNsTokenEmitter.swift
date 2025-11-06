import Foundation
import React
import UserNotifications

@objc(APNsTokenEmitter)
class APNsTokenEmitter: RCTEventEmitter {

  private static var sharedInstance: APNsTokenEmitter?

  override init() {
    super.init()
    APNsTokenEmitter.sharedInstance = self
  }

  override func supportedEvents() -> [String]! {
    return ["APNsDeviceToken"]
  }

  @objc
  static func sendToken(_ token: String) {
    sharedInstance?.sendEvent(withName: "APNsDeviceToken", body: ["token": token])
  }

  @objc
  func requestNotificationPermission() {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
      if granted {
        print("✅ Notification permission granted")
        DispatchQueue.main.async {
          UIApplication.shared.registerForRemoteNotifications()
        }
      } else {
        print("❌ Notification permission not granted: \(String(describing: error))")
      }
    }
  }

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}