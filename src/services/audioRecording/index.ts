// src/services/audioRecording/index.ts - Corrected Version

import { BASE_URL } from "../config";

export interface AudioRecordingResponse {
    message: string;
    user_id?: string;
    success?: boolean;
    error?: string;
}

export class AudioRecordingService {
    // CORRECTED: Use your actual Cloud Run URL
    private static readonly AUDIO_RECORDING_URL = 'https://record-audio-gcs-917390125611.us-central1.run.app';

    static async recordAndUpload(userId: string): Promise<AudioRecordingResponse> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000); // 45s
    
        try {
            const formData = new FormData();
            formData.append('user_id', userId);
    
            const response = await fetch(`${this.AUDIO_RECORDING_URL}/record`, {
                method: 'POST',
                body: formData,
                signal: controller.signal,
            });
    
            clearTimeout(timeout);
    
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }
    
            return await response.json();
        } catch (error: any) {
            if (error.name === 'AbortError') {
                throw new Error('Recording timeout - the service took too long to respond');
            }
            throw error;
        }
    }
    

    static async checkRecordingStatus(): Promise<any> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
        try {
            console.log('🔍 Checking service status at:', this.AUDIO_RECORDING_URL);
    
            const response = await fetch(`${this.AUDIO_RECORDING_URL}/`, {
                method: 'GET',
                signal: controller.signal,
            });
    
            clearTimeout(timeout);
    
            console.log('📡 Status check response:', response.status);
    
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const result = await response.json();
            console.log('✅ Service status:', result);
            return result;
    
        } catch (error: any) {
            if (error.name === 'AbortError') {
                throw new Error('Status check timeout - the service took too long to respond');
            }
            console.error('❌ Error checking recording status:', error);
            throw error;
        }
    }
    

    // Additional helper method to test the connection
    static async testConnection(): Promise<boolean> {
        try {
            console.log('🧪 Testing connection to:', this.AUDIO_RECORDING_URL);
            await this.checkRecordingStatus();
            return true;
        } catch (error) {
            console.error('❌ Connection test failed:', error);
            return false;
        }
    }
}