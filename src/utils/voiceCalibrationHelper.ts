import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioRecordingService } from '../services/audioRecording';

export interface VoiceCalibrationResult {
    success: boolean;
    message: string;
    userId: string;
    timestamp: Date;
}

export class VoiceCalibrationHelper {
    private static readonly CALIBRATION_KEY = 'voice_calibration_data';
    private static readonly LAST_CALIBRATION_KEY = 'last_calibration_timestamp';

    /**
     * Generate a unique user ID for voice calibration
     * @param userDetails - User details from Redux store
     * @returns string - Unique user identifier
     */
    static generateUserId(userDetails: any): string {
        // Priority order for user ID generation
        if (userDetails?.user?.id) {
            return `user_${userDetails.user.id}`;
        }
        
        if (userDetails?.user?.email) {
            // Clean email for use as ID
            const cleanEmail = userDetails.user.email.replace(/[^a-zA-Z0-9]/g, '_');
            return `email_${cleanEmail}`;
        }
        
        if (userDetails?.user?.phone) {
            const cleanPhone = userDetails.user.phone.replace(/[^0-9]/g, '');
            return `phone_${cleanPhone}`;
        }
        
        if (userDetails?.user?.first_name && userDetails?.user?.last_name) {
            const name = `${userDetails.user.first_name}_${userDetails.user.last_name}`.replace(/[^a-zA-Z0-9]/g, '_');
            return `name_${name}_${Date.now()}`;
        }
        
        // Fallback to timestamp-based ID
        return `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Perform voice calibration with cloud recording
     * @param userId - Unique user identifier
     * @param onProgress - Callback for progress updates
     * @returns Promise<VoiceCalibrationResult>
     */
    static async performCalibration(
        userId: string, 
        onProgress?: (progress: number, message: string) => void
    ): Promise<VoiceCalibrationResult> {
        try {
            console.log('🎯 Starting voice calibration for user:', userId);
            
            // Update progress: Starting
            onProgress?.(10, 'Initializing recording...');
            
            // Test connection first
            const connectionOk = await AudioRecordingService.testConnection();
            if (!connectionOk) {
                throw new Error('Cannot connect to recording service');
            }
            
            onProgress?.(20, 'Connected to recording service...');
            
            // Start the actual recording
            onProgress?.(30, 'Starting cloud recording...');
            
            const recordingResult = await AudioRecordingService.recordAndUpload(userId);
            
            onProgress?.(90, 'Processing completed...');
            
            // Store calibration data locally
            const calibrationData: VoiceCalibrationResult = {
                success: true,
                message: recordingResult.message || 'Voice calibration completed successfully',
                userId: userId,
                timestamp: new Date()
            };
            
            await this.saveCalibrationData(calibrationData);
            onProgress?.(100, 'Calibration saved successfully!');
            
            console.log('✅ Voice calibration completed successfully');
            return calibrationData;
            
        } catch (error) {
            console.error('❌ Voice calibration failed:', error);
            
            const failureResult: VoiceCalibrationResult = {
                success: false,
                message: error.message || 'Voice calibration failed',
                userId: userId,
                timestamp: new Date()
            };
            
            return failureResult;
        }
    }

    /**
     * Save calibration data to local storage
     * @param data - Calibration result data
     */
    private static async saveCalibrationData(data: VoiceCalibrationResult): Promise<void> {
        try {
            await AsyncStorage.setItem(this.CALIBRATION_KEY, JSON.stringify(data));
            await AsyncStorage.setItem(this.LAST_CALIBRATION_KEY, data.timestamp.toISOString());
            console.log('💾 Calibration data saved locally');
        } catch (error) {
            console.error('❌ Failed to save calibration data:', error);
        }
    }

    /**
     * Get last calibration data from local storage
     * @returns Promise<VoiceCalibrationResult | null>
     */
    static async getLastCalibrationData(): Promise<VoiceCalibrationResult | null> {
        try {
            const data = await AsyncStorage.getItem(this.CALIBRATION_KEY);
            if (data) {
                const parsedData = JSON.parse(data);
                parsedData.timestamp = new Date(parsedData.timestamp);
                return parsedData;
            }
            return null;
        } catch (error) {
            console.error('❌ Failed to get calibration data:', error);
            return null;
        }
    }

    /**
     * Check if user needs calibration (first time or expired)
     * @param maxAgeHours - Maximum age of calibration in hours (default: 24 * 7 = 1 week)
     * @returns Promise<boolean>
     */
    static async needsCalibration(maxAgeHours: number = 24 * 7): Promise<boolean> {
        try {
            const lastCalibration = await this.getLastCalibrationData();
            
            if (!lastCalibration || !lastCalibration.success) {
                return true; // Never calibrated or last calibration failed
            }
            
            const now = new Date();
            const calibrationAge = now.getTime() - lastCalibration.timestamp.getTime();
            const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
            
            return calibrationAge > maxAgeMs;
        } catch (error) {
            console.error('❌ Error checking calibration status:', error);
            return true; // Err on the side of caution
        }
    }

    /**
     * Clear calibration data (for testing or reset purposes)
     */
    static async clearCalibrationData(): Promise<void> {
        try {
            await AsyncStorage.removeItem(this.CALIBRATION_KEY);
            await AsyncStorage.removeItem(this.LAST_CALIBRATION_KEY);
            console.log('🗑️ Calibration data cleared');
        } catch (error) {
            console.error('❌ Failed to clear calibration data:', error);
        }
    }

    /**
     * Get calibration status summary
     * @returns Promise<{hasCalibration: boolean, lastCalibration: Date | null, needsRecalibration: boolean}>
     */
    static async getCalibrationStatus(): Promise<{
        hasCalibration: boolean;
        lastCalibration: Date | null;
        needsRecalibration: boolean;
        userId?: string;
    }> {
        const lastCalibration = await this.getLastCalibrationData();
        const needsRecalibration = await this.needsCalibration();
        
        return {
            hasCalibration: lastCalibration?.success || false,
            lastCalibration: lastCalibration?.timestamp || null,
            needsRecalibration,
            userId: lastCalibration?.userId
        };
    }
}