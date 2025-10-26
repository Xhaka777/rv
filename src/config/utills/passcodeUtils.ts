import AsyncStorage from "@react-native-async-storage/async-storage";

const PASSCODE_KEY = 'userPasscode';

export const getPasscodeFromStorage = async (): Promise<string | null> => {
    try {
        const passcode = await AsyncStorage.getItem(PASSCODE_KEY);
        return passcode;
    } catch (error) {
        console.error('Error getting passcode from storage:', error);
        return null;
    }
};

export const savePasscodeToStorage = async (passcode: string): Promise<boolean> => {
    try {
        await AsyncStorage.setItem(PASSCODE_KEY, passcode);
        return true;
    } catch (error) {
        console.error('Error saving passcode to storage:', error);
        return false;
    }
};

export const verifyStoredPasscode = async(inputPasscode: string): Promise<boolean> => {
    try {
        const storedPasscode = await AsyncStorage.getItem(PASSCODE_KEY);
        return storedPasscode === inputPasscode;
    } catch (error) {
        console.error('Error verifying passcode:', error);
        return false;
    }
};

export const removePasscodeFromStorage = async (): Promise<boolean> => {
    try {
        await AsyncStorage.removeItem(PASSCODE_KEY);
        return true;
    } catch (error) {
        console.error('Error removing passcode from storage:', error);
        return false;
    }
}
