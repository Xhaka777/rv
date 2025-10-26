import Foundation
import React

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

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
