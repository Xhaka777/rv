import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import GoogleMaps
import UserNotifications

@main
class AppDelegate: RCTAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil
  ) -> Bool {
    GMSServices.provideAPIKey("AIzaSyBcOBbH59pgJk_bmN6WavZCExwCGqCztaY")
    self.moduleName = "Rove"
    self.dependencyProvider = RCTAppDependencyProvider()
    self.initialProps = [:]

    // 👉 Request notification permission and register for APNs
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

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }

  // MARK: - Deep Links
  override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey : Any] = [:]
  ) -> Bool {
    print("📱 Received URL: \(url)")

    // Check if it's our arm command
    if url.scheme == "rove", url.host == "arm" {
      print("🎯 Arm command detected via deep link!")

      NotificationCenter.default.post(
        name: Notification.Name("RoveArmCommand"),
        object: nil,
        userInfo: ["action": "arm", "source": "deeplink"]
      )
      return true
    }

    // Pass to React Native LinkingManager
    return RCTLinkingManager.application(app, open: url, options: options)
  }

  // MARK: - Siri Shortcuts
  override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    print("📱 Received user activity: \(userActivity.activityType)")

    if userActivity.activityType == "com.rove.arm" {
      print("🎯 Arm command detected via Siri!")

      NotificationCenter.default.post(
        name: Notification.Name("RoveArmCommand"),
        object: nil,
        userInfo: ["action": "arm", "source": "siri"]
      )
      return true
    }

    return false
  }

  override func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
    let token = tokenParts.joined()
    print("📱 APNs Device Token: \(token)")

    // 👉 Send token to React Native
    APNsTokenEmitter.sendToken(token)
  }


  override func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    print("❌ Failed to register for remote notifications: \(error.localizedDescription)")
  }
}
