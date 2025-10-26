import { NativeModules, NativeEventEmitter, Platform } from "react-native";

const { SiriShortcutManager } = NativeModules;

export class SiriShortcutsService {
    
    static async requestSiriAuthorization(): Promise<{
        success: boolean;
        message: string;
        status?: string;
    }> {
        if (Platform.OS !== 'ios') {
            return { success: false, message: 'Siri shortcuts only available on iOS' };
        }
        
        if (!SiriShortcutManager) {
            console.error('SiriShortcutManager module not found!');
            return { success: false, message: 'Siri shortcut manager not available' };
        }

        try {
            console.log('Calling requestSiriAuthorization...');
            const result = await SiriShortcutManager.requestSiriAuthorization();
            console.log('Result:', result);
            return {
                success: true,
                message: result.message,
                status: result.status
            };
        } catch (error: any) {
            console.error('Error in requestSiriAuthorization:', error);
            return {
                success: false,
                message: error.message || 'Failed to authorize Siri',
                status: error.code
            };
        }
    }

    static async checkSiriAuthorization(): Promise<{
        isAuthorized: boolean;
        status: string;
    }> {
        if (Platform.OS !== 'ios' || !SiriShortcutManager) {
            return { isAuthorized: false, status: 'unavailable' };
        }

        try {
            const result = await SiriShortcutManager.checkSiriAuthorizationStatus();
            return {
                isAuthorized: result.isAuthorized,
                status: result.status
            };
        } catch (error) {
            console.error('Error checking Siri auth:', error);
            return { isAuthorized: false, status: 'error' };
        }
    }
    
    static async authenticateForArming(): Promise<{
        success: boolean; 
        error?: string 
    }> {
        if (!SiriShortcutManager) {
            return { success: false, error: 'Siri shortcut manager not available' };
        }
        
        try {
            await SiriShortcutManager.authenticateForArming();
            return { success: true };
        } catch (error: any) {
            return { 
                success: false, 
                error: error.message || 'Authentication failed' 
            };
        }
    }
}