import RNFS from 'react-native-fs';
import { ProcessingManager } from 'react-native-video-processing';
import moment from 'moment';
import { Platform } from 'react-native';

interface VideoOverlayOptions {
    inputPath: string;
    outputPath: string;
    timestamp: string;
    incidentId: string;
}

export class VideoProcessingOverlayService {

    /**
     * Add timestamp and ROVE branding overlay to video using react-native-video-processing
     * @param options - Configuration for video overlay
     * @returns Promise<string> - Path to processed video
     */
    static async addTimestampOverlay(options: VideoOverlayOptions): Promise<string> {
        const { inputPath, outputPath, timestamp, incidentId } = options;

        try {
            console.log('🎬 Adding timestamp overlay to video:', inputPath);

            // Format timestamp for display
            const formattedTimestamp = moment(timestamp).format('YYYY-MM-DD HH:mm:ss');

            // Create overlay configuration
            const overlayConfig = {
                overlay: {
                    startTimeMs: 0,
                    endTimeMs: -1, // Apply to entire video
                    text: `${formattedTimestamp}\nROVE APP`,
                    fontSize: 16,
                    fontColor: '#FFFFFF',
                    backgroundColor: '#000000CC',
                    position: 'top-right',
                    paddingX: 20,
                    paddingY: 20
                }
            };

            // Process video with overlay
            const result = await ProcessingManager.overlay(
                inputPath,
                overlayConfig
            );

            if (result && result.path) {
                // Move processed video to desired output path
                await RNFS.moveFile(result.path, outputPath);
                console.log('✅ Video overlay added successfully');
                return outputPath;
            } else {
                throw new Error('Video processing failed - no output path');
            }

        } catch (error) {
            console.error('❌ Error adding video overlay:', error);
            throw error;
        }
    }

    /**
     * Process video file and add overlay before saving to camera roll
     * @param originalPath - Path to original video file
     * @param incidentData - Incident data containing timestamp and ID
     * @returns Promise<string> - Path to processed video
     */
    static async processVideoForSaving(originalPath: string, incidentData: any): Promise<string> {
        try {
            // Create output filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const outputFileName = `ROVE_${incidentData.id}_${timestamp}.mp4`;
            const outputPath = `${RNFS.DocumentDirectoryPath}/${outputFileName}`;

            // Add overlay to video
            const processedPath = await this.addTimestampOverlay({
                inputPath: originalPath,
                outputPath: outputPath,
                timestamp: incidentData.dateTime || incidentData.createdAt || new Date().toISOString(),
                incidentId: incidentData.id
            });

            return processedPath;

        } catch (error) {
            console.error('❌ Error processing video for saving:', error);
            // Return original path if processing fails
            return originalPath;
        }
    }

    /**
     * Clean up temporary processed files
     * @param filePath - Path to file to delete
     */
    static async cleanupTempFile(filePath: string): Promise<void> {
        try {
            const exists = await RNFS.exists(filePath);
            if (exists) {
                await RNFS.unlink(filePath);
                console.log('🗑️ Cleaned up temp file:', filePath);
            }
        } catch (error) {
            console.error('❌ Error cleaning up temp file:', error);
        }
    }
}