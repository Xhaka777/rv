// src/services/videoMerger/index.ts - Updated with Black Screen Transition Support
import { NativeModules, Platform } from 'react-native';

const { VideoMerger } = NativeModules;

export interface VideoInfo {
  width: number;
  height: number;
  duration: number;
}

export interface MergeResult {
  success: boolean;
  outputPath: string;
  message: string;
}

export interface TimestampOverlayOptions {
  timestamp: string;
  incidentId: string;
}

export class VideoMergerService {
  
  /**
   * Check if video merger is available (iOS only)
   */
  static isAvailable(): boolean {
    return Platform.OS === 'ios' && VideoMerger != null;
  }

  /**
   * Merge and save video to camera roll with black screen transition and timestamp overlay
   * This is the main function to use in StreamCard download
   * 
   * @param incidentId - The incident ID
   * @param incidentData - Incident data for overlay processing
   * @returns Promise<boolean> - true if successful
   */
  static async mergeAndSaveToGallery(
    incidentId: string,
    incidentData: any
  ): Promise<boolean> {
    
    const RNFS = require('react-native-fs');
    const { CameraRoll } = require('@react-native-camera-roll/camera-roll');
    
    try {
      console.log('🎬 Starting merge and save with black screen transition for incident:', incidentId);

      // 1. Find video files
      const files = await RNFS.readDir(RNFS.DocumentDirectoryPath);
      const videoFiles = files.filter(file => 
        file.name.includes(incidentId) && 
        file.name.includes('VIDEO') &&
        file.name.endsWith('.mp4')
      );

      console.log('📹 Found video files:', videoFiles.length);

      if (videoFiles.length === 0) {
        throw new Error('No video files found for this incident');
      }

      // 2. If only one video, add timestamp overlay and save
      if (videoFiles.length === 1) {
        console.log('📹 Only one video found, adding timestamp overlay...');
        const videoPath = videoFiles[0].path;
        
        // Create output path for overlay
        const timestampOverlayPath = `${RNFS.DocumentDirectoryPath}/overlay_${incidentId}_${Date.now()}.mp4`;
        
        // Add timestamp overlay using native iOS method
        await this.addTimestampOverlay(
          videoPath,
          timestampOverlayPath,
          incidentData.dateTime || incidentData.createdAt || new Date().toISOString(),
          incidentData.id
        );

        // Save to camera roll
        await CameraRoll.save(timestampOverlayPath, { type: 'video' });
        
        // Cleanup temporary file
        await RNFS.unlink(timestampOverlayPath).catch(() => {});

        return true;
      }

      // 3. Multiple videos - merge them with black screen transition and timestamp overlay
      console.log('📹 Multiple videos found, merging with black screen transition...');
      
      // Sort by size - larger file is usually back camera
      const sortedFiles = videoFiles.sort((a, b) => b.size - a.size);
      const backCamPath = sortedFiles[0].path; // Larger file = back camera
      const frontCamPath = sortedFiles[1].path; // Smaller file = front camera

      console.log('📹 Front cam (selfie - plays first):', frontCamPath);
      console.log('📹 Back cam (main - plays after transition):', backCamPath);

      // Create output path for merged video with black screen transition
      const mergedWithTransitionPath = `${RNFS.DocumentDirectoryPath}/merged_transition_${incidentId}_${Date.now()}.mp4`;
      
      // Merge videos with black screen transition (this now includes the 2-second transition)
      const mergeResult = await this.mergeVideosWithBlackScreenTransition(
        frontCamPath, 
        backCamPath, 
        mergedWithTransitionPath,
        {
          timestamp: incidentData.dateTime || incidentData.createdAt || new Date().toISOString(),
          incidentId: incidentData.id
        }
      );

      if (!mergeResult.success) {
        throw new Error('Video merge with black screen transition failed');
      }

      console.log('✅ Videos merged with black screen transition successfully:', mergedWithTransitionPath);

      // 4. Save to camera roll
      await CameraRoll.save(mergedWithTransitionPath, { type: 'video' });

      console.log('✅ Saved to camera roll');

      // 5. Cleanup temporary file
      await RNFS.unlink(mergedWithTransitionPath).catch(() => {});

      console.log('✅ Merge with black screen transition and save completed successfully');
      return true;

    } catch (error) {
      console.error('❌ Merge with black screen transition and save failed:', error);
      throw error;
    }
  }

  /**
   * NEW: Merge two videos with black screen transition and timestamp overlay 
   * Timeline: Video1 → 2s Black Screen (ROVE logo + "Back cam") → Video2
   * 
   * @param frontCamPath - Path to first video file (selfie cam - plays first)
   * @param backCamPath - Path to second video file (back cam - plays after transition)
   * @param outputPath - Output path for merged video
   * @param overlayOptions - Timestamp and incident info for overlay
   * @returns Promise<MergeResult>
   */
  static async mergeVideosWithBlackScreenTransition(
    frontCamPath: string,
    backCamPath: string,
    outputPath: string,
    overlayOptions: TimestampOverlayOptions
  ): Promise<MergeResult> {
    
    if (!this.isAvailable()) {
      throw new Error('VideoMerger is only available on iOS');
    }

    console.log('🎬 Starting video merge with black screen transition...');
    console.log('📹 Selfie cam (first):', frontCamPath);
    console.log('📹 Back cam (after transition):', backCamPath);
    console.log('💾 Output:', outputPath);
    console.log('⏰ Timestamp:', overlayOptions.timestamp);

    try {
      // The updated Swift code now automatically adds black screen transition during merge
      const result = await VideoMerger.mergeVideos(
        frontCamPath,
        backCamPath,
        outputPath
      );

      console.log('✅ Video merge with black screen transition completed:', result);
      return result;

    } catch (error) {
      console.error('❌ Video merge with black screen transition failed:', error);
      throw error;
    }
  }

  /**
   * Add timestamp overlay to existing video
   * 
   * @param inputPath - Path to input video file
   * @param outputPath - Path for output video with overlay
   * @param timestamp - ISO timestamp string
   * @param incidentId - Incident ID for reference
   * @returns Promise<MergeResult>
   */
  static async addTimestampOverlay(
    inputPath: string,
    outputPath: string,
    timestamp: string,
    incidentId: string
  ): Promise<MergeResult> {
    
    if (!this.isAvailable()) {
      throw new Error('VideoMerger is only available on iOS');
    }

    console.log('🎬 Adding timestamp overlay to video...');
    console.log('📹 Input:', inputPath);
    console.log('💾 Output:', outputPath);
    console.log('⏰ Timestamp:', timestamp);

    try {
      const result = await VideoMerger.addTimestampOverlay(
        inputPath,
        outputPath,
        timestamp,
        incidentId
      );

      console.log('✅ Timestamp overlay added successfully:', result);
      return result;

    } catch (error) {
      console.error('❌ Timestamp overlay failed:', error);
      throw error;
    }
  }

  /**
   * LEGACY: Merge two videos without black screen transition (kept for backward compatibility)
   * NOTE: This now actually includes the black screen transition due to Swift implementation
   * 
   * @param frontCamPath - Path to first video file (plays first)
   * @param backCamPath - Path to second video file (plays second)
   * @param outputPath - Optional custom output path
   * @returns Promise<MergeResult>
   */
  static async mergeVideos(
    frontCamPath: string,
    backCamPath: string,
    outputPath?: string
  ): Promise<MergeResult> {
    
    if (!this.isAvailable()) {
      throw new Error('VideoMerger is only available on iOS');
    }

    // Generate default output path if not provided
    const finalOutputPath = outputPath || 
      `${frontCamPath.substring(0, frontCamPath.lastIndexOf('/'))}/merged_${Date.now()}.mp4`;

    console.log('🎬 Starting video merge with black screen transition...');
    console.log('📹 Front cam:', frontCamPath);
    console.log('📹 Back cam:', backCamPath);
    console.log('💾 Output:', finalOutputPath);

    try {
      const result = await VideoMerger.mergeVideos(
        frontCamPath,
        backCamPath,
        finalOutputPath
      );

      console.log('✅ Video merge with black screen transition completed:', result);
      return result;

    } catch (error) {
      console.error('❌ Video merge with black screen transition failed:', error);
      throw error;
    }
  }

  /**
   * Get information about a video file
   * 
   * @param videoPath - Path to video file
   * @returns Promise<VideoInfo>
   */
  static async getVideoInfo(videoPath: string): Promise<VideoInfo> {
    
    if (!this.isAvailable()) {
      throw new Error('VideoMerger is only available on iOS');
    }

    try {
      const info = await VideoMerger.getVideoInfo(videoPath);
      console.log('📊 Video info:', info);
      return info;

    } catch (error) {
      console.error('❌ Failed to get video info:', error);
      throw error;
    }
  }

  /**
   * Helper: Find matching video files for an incident
   * Returns front and back camera video paths if both exist
   * 
   * @param incidentId - The incident ID
   * @param files - Array of file objects from RNFS.readDir()
   * @returns { frontCam: string | null, backCam: string | null }
   */
  static findIncidentVideos(
    incidentId: string,
    files: any[]
  ): { frontCam: string | null; backCam: string | null } {
    
    const videoFiles = files.filter(file => 
      file.name.includes(`${incidentId}`) && 
      file.name.includes('VIDEO') &&
      file.name.endsWith('.mp4')
    );

    if (videoFiles.length === 0) {
      return { frontCam: null, backCam: null };
    }

    if (videoFiles.length === 1) {
      return { frontCam: videoFiles[0].path, backCam: null };
    }

    // Sort by size - larger is usually back camera
    const sortedFiles = videoFiles.sort((a, b) => b.size - a.size);

    return {
      frontCam: sortedFiles[1]?.path || null, // Smaller file (front camera)
      backCam: sortedFiles[0]?.path || null   // Larger file (back camera)
    };
  }

  /**
   * Helper: Format timestamp for display
   * 
   * @param timestamp - ISO timestamp string
   * @returns Formatted timestamp string
   */
  static formatTimestampForOverlay(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(/(\d+)\/(\d+)\/(\d+),/, '$3-$1-$2');
    } catch (error) {
      console.error('❌ Error formatting timestamp:', error);
      // Fallback to current time
      const now = new Date();
      return now.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(/(\d+)\/(\d+)\/(\d+),/, '$3-$1-$2');
    }
  }

  /**
   * Helper: Validate video file exists and is accessible
   * 
   * @param videoPath - Path to video file
   * @returns Promise<boolean>
   */
  static async validateVideoFile(videoPath: string): Promise<boolean> {
    try {
      const RNFS = require('react-native-fs');
      const exists = await RNFS.exists(videoPath);
      
      if (!exists) {
        console.error('❌ Video file does not exist:', videoPath);
        return false;
      }

      const stat = await RNFS.stat(videoPath);
      if (stat.size === 0) {
        console.error('❌ Video file is empty:', videoPath);
        return false;
      }

      console.log('✅ Video file validated:', videoPath, `(${Math.round(stat.size / 1024 / 1024)}MB)`);
      return true;

    } catch (error) {
      console.error('❌ Error validating video file:', error);
      return false;
    }
  }

  /**
   * Helper: Get expected total duration with black screen transition
   * 
   * @param frontCamDuration - Duration of front camera video in seconds
   * @param backCamDuration - Duration of back camera video in seconds
   * @returns Total expected duration with 2-second black screen transition
   */
  static calculateTotalDurationWithTransition(
    frontCamDuration: number,
    backCamDuration: number
  ): number {
    return frontCamDuration + 2.0 + backCamDuration; // +2 seconds for black screen
  }

  /**
   * Helper: Log merge timeline for debugging
   * 
   * @param frontCamDuration - Duration of front camera video
   * @param backCamDuration - Duration of back camera video
   */
  static logMergeTimeline(frontCamDuration: number, backCamDuration: number): void {
    const blackScreenStart = frontCamDuration;
    const blackScreenEnd = frontCamDuration + 2.0;
    const totalDuration = frontCamDuration + 2.0 + backCamDuration;

    console.log('📋 Merge Timeline:');
    console.log(`  0s ────────── ${frontCamDuration}s ─ ${blackScreenEnd}s ──────────── ${totalDuration}s`);
    console.log('  Selfie Cam     │              │            Back Cam');
    console.log(`                 └─${blackScreenStart}s-${blackScreenEnd}s─┘`);
    console.log('                   Black Screen');
    console.log('                   (ROVE logo + "Back cam")');
  }
}