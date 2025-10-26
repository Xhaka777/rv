import AppIntents
import Foundation

@available(iOS 16.0, *)
struct ArmRoveIntent: AppIntent {
    static var title: LocalizedStringResource = "Arm Rove"
    
    static var description = IntentDescription("Arms Rove bodycam protection instantly")
    
    static var openAppWhenRun: Bool = true
    
    @MainActor
    func perform() async throws -> some IntentResult {
        print("🎯 App Intent triggered - Arm Rove")
        
        // Post notification to React Native
        NotificationCenter.default.post(
            name: NSNotification.Name("RoveArmCommand"),
            object: nil,
            userInfo: ["action": "arm", "source": "app_intent"]
        )
        
        return .result()
    }
}

@available(iOS 16.0, *)
struct RoveAppShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: ArmRoveIntent(),
            phrases: [
                "Arm \(.applicationName)",
                "Activate \(.applicationName)",
                "Prep \(.applicationName)"
            ],
            shortTitle: "Arm Rove",
            systemImageName: "shield.fill"
        )
    }
}
