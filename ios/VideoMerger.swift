import Foundation
import AVFoundation
import UIKit
import React

@objc(VideoMerger)
class VideoMerger: NSObject {
  
  // MARK: - Public Methods
  
  /// Concatenates two videos sequentially with black screen transition and timestamp overlay
  /// Total duration = duration1 + 2 seconds (black screen) + duration2
  @objc
  func mergeVideos(
    _ frontCamPath: String,
    backCamPath: String,
    outputPath: String,
    timestamp: String,
    incidentId: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    // Validate input paths
    guard FileManager.default.fileExists(atPath: frontCamPath) else {
      reject("FILE_NOT_FOUND", "Front camera video not found at: \(frontCamPath)", nil)
      return
    }

    guard FileManager.default.fileExists(atPath: backCamPath) else {
      reject("FILE_NOT_FOUND", "Back camera video not found at: \(backCamPath)", nil)
      return
    }

    print("🎬 Starting video concatenation with black screen transition and timestamp overlay...")
    print("📹 Video 1 (front): \(frontCamPath)")
    print("📹 Video 2 (back): \(backCamPath)")
    print("💾 Output: \(outputPath)")
    print("⏰ Incident timestamp: \(timestamp)")

    let frontURL = URL(fileURLWithPath: frontCamPath)
    let backURL = URL(fileURLWithPath: backCamPath)
    let outputURL = URL(fileURLWithPath: outputPath)

    // Delete output file if it exists
    try? FileManager.default.removeItem(at: outputURL)

    DispatchQueue.global(qos: .userInitiated).async {
      do {
        try self.concatenateVideosWithBlackScreenTransition(
          video1URL: frontURL,
          video2URL: backURL,
          outputURL: outputURL,
          incidentTimestamp: timestamp
        )

        DispatchQueue.main.async {
          print("✅ Video concatenation with black screen transition completed successfully")
          resolve([
            "success": true,
            "outputPath": outputPath,
            "message": "Videos concatenated with black screen transition and timestamp overlay successfully"
          ])
        }
      } catch let error as NSError {
        DispatchQueue.main.async {
          print("❌ Video concatenation failed: \(error.localizedDescription)")
          reject("MERGE_FAILED", error.localizedDescription, error)
        }
      }
    }
  }
  
  /// Add timestamp overlay method for React Native with more options
  @objc
  func addTimestampOverlay(
    _ inputPath: String,
    outputPath: String,
    timestamp: String,
    incidentId: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    
    guard FileManager.default.fileExists(atPath: inputPath) else {
      reject("FILE_NOT_FOUND", "Input video not found at: \(inputPath)", nil)
      return
    }
    
    let inputURL = URL(fileURLWithPath: inputPath)
    let outputURL = URL(fileURLWithPath: outputPath)
    
    // Delete output file if it exists
    try? FileManager.default.removeItem(at: outputURL)
    
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        try self.addTimestampOverlayToVideo(
          inputURL: inputURL,
          outputURL: outputURL,
          timestamp: timestamp,
          incidentId: incidentId
        )
        
        DispatchQueue.main.async {
          resolve([
            "success": true,
            "outputPath": outputPath,
            "message": "Timestamp overlay added successfully"
          ])
        }
      } catch let error as NSError {
        DispatchQueue.main.async {
          reject("OVERLAY_FAILED", error.localizedDescription, error)
        }
      }
    }
  }
  
  // MARK: - NEW: Sequential Concatenation with Black Screen Transition Logic
  
  private func concatenateVideosWithBlackScreenTransition(
    video1URL: URL,
    video2URL: URL,
    outputURL: URL,
    incidentTimestamp: String
  ) throws {
    
    // Load assets
    let asset1 = AVURLAsset(url: video1URL)
    let asset2 = AVURLAsset(url: video2URL)
    
    // Get video tracks
    guard let videoTrack1 = asset1.tracks(withMediaType: .video).first else {
      throw NSError(domain: "VideoMerger", code: 1, userInfo: [
        NSLocalizedDescriptionKey: "No video track found in first video"
      ])
    }
    
    guard let videoTrack2 = asset2.tracks(withMediaType: .video).first else {
      throw NSError(domain: "VideoMerger", code: 2, userInfo: [
        NSLocalizedDescriptionKey: "No video track found in second video"
      ])
    }
    
    // Create composition
    let composition = AVMutableComposition()
    
    // Add mutable video track
    guard let compositionVideoTrack = composition.addMutableTrack(
      withMediaType: .video,
      preferredTrackID: kCMPersistentTrackID_Invalid
    ) else {
      throw NSError(domain: "VideoMerger", code: 3, userInfo: [
        NSLocalizedDescriptionKey: "Failed to create composition video track"
      ])
    }
    
    // Add mutable audio track
    guard let compositionAudioTrack = composition.addMutableTrack(
      withMediaType: .audio,
      preferredTrackID: kCMPersistentTrackID_Invalid
    ) else {
      throw NSError(domain: "VideoMerger", code: 4, userInfo: [
        NSLocalizedDescriptionKey: "Failed to create composition audio track"
      ])
    }
    
    // Insert first video at time 0
    let duration1 = asset1.duration
    let timeRange1 = CMTimeRangeMake(start: .zero, duration: duration1)
    
    try compositionVideoTrack.insertTimeRange(
      timeRange1,
      of: videoTrack1,
      at: .zero
    )
    
    // Insert first audio if exists
    if let audioTrack1 = asset1.tracks(withMediaType: .audio).first {
      try compositionAudioTrack.insertTimeRange(
        timeRange1,
        of: audioTrack1,
        at: .zero
      )
    }
    
    // Create 2-second black screen segment
    let blackScreenDuration = CMTime(seconds: 2.0, preferredTimescale: 30)
    let blackScreenInsertTime = duration1
    
    // For the black screen, we'll add it to the composition but it will be handled by the video composition overlay
    
    // Insert second video after black screen (duration1 + 2 seconds)
    let duration2 = asset2.duration
    let timeRange2 = CMTimeRangeMake(start: .zero, duration: duration2)
    let video2InsertTime = CMTimeAdd(duration1, blackScreenDuration)
    
    try compositionVideoTrack.insertTimeRange(
      timeRange2,
      of: videoTrack2,
      at: video2InsertTime
    )
    
    // Insert second audio if exists
    if let audioTrack2 = asset2.tracks(withMediaType: .audio).first {
      try compositionAudioTrack.insertTimeRange(
        timeRange2,
        of: audioTrack2,
        at: video2InsertTime
      )
    }
    
    // Calculate total duration (video1 + 2s black screen + video2)
    let totalDuration = CMTimeAdd(CMTimeAdd(duration1, blackScreenDuration), duration2)
    
    print("⏱️ Video 1 duration: \(duration1.seconds) seconds")
    print("⏱️ Black screen duration: 2 seconds")
    print("⏱️ Video 2 duration: \(duration2.seconds) seconds")
    print("⏱️ Total duration: \(totalDuration.seconds) seconds")
    
    // Get video size from first video
    let videoSize = videoTrack1.naturalSize
    let videoTransform = videoTrack1.preferredTransform
    
    let transformedSize = videoSize.applying(videoTransform)
    let renderWidth = abs(transformedSize.width)
    let renderHeight = abs(transformedSize.height)
    
    print("📐 Render size: \(renderWidth) x \(renderHeight)")
    
    // Create video composition with black screen transition and timestamp overlay
    let videoComposition = createVideoCompositionWithBlackScreenTransition(
      track: compositionVideoTrack,
      renderSize: CGSize(width: renderWidth, height: renderHeight),
      transform: videoTransform,
      duration: totalDuration,
      video1Duration: duration1,
      blackScreenDuration: blackScreenDuration,
      incidentTimestamp: incidentTimestamp
    )
    
    // Export the composition
    guard let exportSession = AVAssetExportSession(
      asset: composition,
      presetName: AVAssetExportPresetHighestQuality
    ) else {
      throw NSError(domain: "VideoMerger", code: 5, userInfo: [
        NSLocalizedDescriptionKey: "Failed to create export session"
      ])
    }
    
    exportSession.videoComposition = videoComposition
    exportSession.outputURL = outputURL
    exportSession.outputFileType = .mp4
    exportSession.shouldOptimizeForNetworkUse = true
    
    // Use semaphore to wait for export completion
    let semaphore = DispatchSemaphore(value: 0)
    var exportError: Error?
    
    exportSession.exportAsynchronously {
      if let error = exportSession.error {
        exportError = error
      }
      semaphore.signal()
    }
    
    semaphore.wait()
    
    if let error = exportError {
      throw error
    }
    
    guard exportSession.status == .completed else {
      throw NSError(domain: "VideoMerger", code: 6, userInfo: [
        NSLocalizedDescriptionKey: "Export failed with status: \(exportSession.status.rawValue)"
      ])
    }
    
    print("✅ Concatenation with black screen transition successful! Output: \(outputURL.path)")
  }
  
  // MARK: - NEW: Video Composition with Black Screen Transition
  
  private func createVideoCompositionWithBlackScreenTransition(
    track: AVMutableCompositionTrack,
    renderSize: CGSize,
    transform: CGAffineTransform,
    duration: CMTime,
    video1Duration: CMTime,
    blackScreenDuration: CMTime,
    incidentTimestamp: String
  ) -> AVMutableVideoComposition {

    
    let videoComposition = AVMutableVideoComposition()
    videoComposition.renderSize = renderSize
    videoComposition.frameDuration = CMTime(value: 1, timescale: 30) // 30 fps
    
    // Create instruction for entire video
    let instruction = AVMutableVideoCompositionInstruction()
    instruction.timeRange = CMTimeRangeMake(start: .zero, duration: duration)
    
    // Layer instruction for the video track
    let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: track)
    layerInstruction.setTransform(transform, at: .zero)
    
    // FIXED: Video should be visible from start until black screen begins
    // Video is visible from 0 to video1Duration
    layerInstruction.setOpacity(1.0, at: .zero)
    
    // Hide video during black screen period
    let blackScreenStartTime = video1Duration
    let blackScreenEndTime = CMTimeAdd(video1Duration, blackScreenDuration)
    
    layerInstruction.setOpacity(0.0, at: blackScreenStartTime)
    layerInstruction.setOpacity(1.0, at: blackScreenEndTime)
    
    instruction.layerInstructions = [layerInstruction]
    videoComposition.instructions = [instruction]
    
    // Create layers for overlay (timestamp + black screen with logo)
    let overlayLayer = createTimestampOverlayLayer(
      renderSize: renderSize,
      incidentTimestamp: incidentTimestamp,
      duration: duration
    ) 
    let blackScreenLayer = createBlackScreenWithLogoLayer(
      renderSize: renderSize,
      startTime: blackScreenStartTime,
      duration: blackScreenDuration
    )
    
    let videoLayer = CALayer()
    videoLayer.frame = CGRect(origin: .zero, size: renderSize)
    
    let parentLayer = CALayer()
    parentLayer.frame = CGRect(origin: .zero, size: renderSize)
    parentLayer.addSublayer(videoLayer)
    parentLayer.addSublayer(blackScreenLayer)
    parentLayer.addSublayer(overlayLayer)
    
    videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(
      postProcessingAsVideoLayer: videoLayer,
      in: parentLayer
    )
    
    return videoComposition
  }
  
  // MARK: - NEW: Black Screen with ROVE Logo Layer
  
  private func createBlackScreenWithLogoLayer(
    renderSize: CGSize,
    startTime: CMTime,
    duration: CMTime
  ) -> CALayer {
    
    let blackScreenLayer = CALayer()
    blackScreenLayer.frame = CGRect(origin: .zero, size: renderSize)
    blackScreenLayer.backgroundColor = UIColor.black.cgColor
    

    // Create ROVE premium logo layer (using PNG image)
//    let roveLogoLayer = CALayer()
//    let logoSize: CGFloat = 130  //Larger size for the black screen
//    roveLogoLayer.frame = CGRect(x: 0, y: 0, width: logoSize, height: logoSize)

    // Load the rove_premium.png image from the bundle
//    if let logoImage = UIImage(named: "rove_premium") {
//      roveLogoLayer.contents = logoImage.cgImage
//      roveLogoLayer.contentsGravity = .resizeAspect
//    } else {
//      // Fallback: Create a simple colored rectangle if image not found
//      print("⚠️ Warning: rove_premium.png image not found in bundle")
//      roveLogoLayer.backgroundColor = UIColor.yellow.cgColor
//      roveLogoLayer.cornerRadius = 8
//    }
    
    // Create "Back cam" text layer
    let backCamTextLayer = CATextLayer()
    backCamTextLayer.string = "Back cam"
    backCamTextLayer.fontSize = 24
    backCamTextLayer.foregroundColor = UIColor.white.cgColor
    backCamTextLayer.backgroundColor = UIColor.clear.cgColor
    backCamTextLayer.alignmentMode = .center
    backCamTextLayer.font = CTFontCreateWithName("Helvetica-Bold" as CFString, 24, nil)
    backCamTextLayer.contentsScale = UIScreen.main.scale
    
    // Position layers in center of screen
    let logoWidth: CGFloat = 130
    let logoHeight: CGFloat = 130
    let textWidth: CGFloat = 150
    let textHeight: CGFloat = 30
    let spacing: CGFloat = 20
    
    let centerX = renderSize.width / 2
    let centerY = renderSize.height / 2
    
//    roveLogoLayer.frame = CGRect(
//      x: centerX - logoWidth / 2,
//      y: centerY - (logoHeight + spacing + textHeight) / 2 + logoHeight + spacing,
//      width: logoWidth,
//      height: logoHeight
//    )
    
    backCamTextLayer.frame = CGRect(
      x: centerX - textWidth / 2,
      y: centerY - (logoHeight + spacing + textHeight) / 2,
      width: textWidth,
      height: textHeight
    )
    
    // Add text layers to black screen
//    blackScreenLayer.addSublayer(roveLogoLayer)
    blackScreenLayer.addSublayer(backCamTextLayer)
    
    // FIXED: Set initial opacity to 0 and only show during the specific time period
    blackScreenLayer.opacity = 0.0
    
    // Create animation group to control visibility during black screen period only
    let animationGroup = CAAnimationGroup()
    animationGroup.duration = duration.seconds + 0.2 // Slight padding
    animationGroup.beginTime = AVCoreAnimationBeginTimeAtZero + startTime.seconds
    animationGroup.fillMode = .both
    animationGroup.isRemovedOnCompletion = false
    
    // Fade in quickly at start of black screen
    let fadeInAnimation = CABasicAnimation(keyPath: "opacity")
    fadeInAnimation.fromValue = 0.0
    fadeInAnimation.toValue = 1.0
    fadeInAnimation.duration = 0.1
    fadeInAnimation.beginTime = 0.0
    
    // Stay visible during black screen
    let stayVisibleAnimation = CABasicAnimation(keyPath: "opacity")
    stayVisibleAnimation.fromValue = 1.0
    stayVisibleAnimation.toValue = 1.0
    stayVisibleAnimation.duration = duration.seconds - 0.2
    stayVisibleAnimation.beginTime = 0.1
    
    // Fade out quickly at end of black screen
    let fadeOutAnimation = CABasicAnimation(keyPath: "opacity")
    fadeOutAnimation.fromValue = 1.0
    fadeOutAnimation.toValue = 0.0
    fadeOutAnimation.duration = 0.1
    fadeOutAnimation.beginTime = duration.seconds - 0.1
    
    animationGroup.animations = [fadeInAnimation, stayVisibleAnimation, fadeOutAnimation]
    blackScreenLayer.add(animationGroup, forKey: "blackScreenVisibility")
    
    return blackScreenLayer
  }
  
  // MARK: - UPDATED: Timestamp Overlay with ROVE Premium Logo
  
private func createTimestampOverlayLayer(
    renderSize: CGSize,
    incidentTimestamp: String,
    duration: CMTime
) -> CALayer {
    let containerLayer = CALayer()
    containerLayer.frame = CGRect(origin: .zero, size: renderSize)

    // Parse incident timestamp
    let isoFormatter = ISO8601DateFormatter()
    isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

    let outputFormatter = DateFormatter()
    outputFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
    outputFormatter.timeZone = TimeZone.current

    let startDate: Date
    if let parsed = isoFormatter.date(from: incidentTimestamp) {
        startDate = parsed
    } else {
        print("⚠️ Could not parse incidentTimestamp: \(incidentTimestamp), falling back to now()")
        startDate = Date()
    }

    let videoDurationSeconds = max(duration.seconds, 0.1)
    let totalSeconds = max(Int(ceil(videoDurationSeconds)), 1) // Use ceil to include the last partial second

    // Layout constants
    let logoSize: CGFloat = 55
    let logoSpacing: CGFloat = 24
    let timestampHeight: CGFloat = 20
    let roveHeight: CGFloat = 18
    let textSpacing: CGFloat = 4
    let textHeight = timestampHeight + textSpacing + roveHeight
    let textWidth: CGFloat = 160
    let totalWidth = textWidth + logoSpacing + logoSize
    let totalHeight = max(logoSize, textHeight)
    let padding: CGFloat = 12

    let containerX = renderSize.width - totalWidth - padding
    let containerY = renderSize.height - totalHeight - padding

    // Create STATIC "ROVE APP" text layer (never changes)
    let roveTextLayer = CATextLayer()
    roveTextLayer.string = "ROVE APP"
    roveTextLayer.fontSize = 14
    roveTextLayer.foregroundColor = UIColor.white.cgColor
    roveTextLayer.backgroundColor = UIColor.clear.cgColor
    roveTextLayer.alignmentMode = .right
    roveTextLayer.font = CTFontCreateWithName("Helvetica-Bold" as CFString, 14, nil)
    roveTextLayer.contentsScale = UIScreen.main.scale
    roveTextLayer.shadowColor = UIColor.black.cgColor
    roveTextLayer.shadowOffset = CGSize(width: 2, height: 2)
    roveTextLayer.shadowOpacity = 0.8
    roveTextLayer.shadowRadius = 3
    roveTextLayer.frame = CGRect(
        x: containerX,
        y: containerY,
        width: textWidth,
        height: roveHeight
    )

    // Create STATIC logo layer (never changes)
    let logoLayer = CALayer()
    let logoX = containerX + textWidth + logoSpacing
    let logoY = containerY + (totalHeight - logoSize) / 2

    logoLayer.frame = CGRect(
        x: logoX,
        y: logoY,
        width: logoSize,
        height: logoSize
    )

    if let logoImage = UIImage(named: "rove_premium") {
        logoLayer.contents = logoImage.cgImage
        logoLayer.contentsGravity = .resizeAspect
    } else {
        print("⚠️ Warning: rove_premium.png image not found in bundle")
        logoLayer.backgroundColor = UIColor.yellow.cgColor
        logoLayer.cornerRadius = 4
    }
    logoLayer.shadowColor = UIColor.black.cgColor
    logoLayer.shadowOffset = CGSize(width: 2, height: 2)
    logoLayer.shadowOpacity = 0.8
    logoLayer.shadowRadius = 3

    // Create DYNAMIC timestamp layers - one for each second
    print("📝 Creating \(totalSeconds) timestamp layers for \(videoDurationSeconds) second video")
    
    for i in 0..<totalSeconds {
        let timestampLayer = CATextLayer()
        
        // Calculate the timestamp for this specific second
        let currentTime = startDate.addingTimeInterval(Double(i))
        let timeString = outputFormatter.string(from: currentTime)
        
        timestampLayer.string = timeString
        timestampLayer.fontSize = 16
        timestampLayer.foregroundColor = UIColor.white.cgColor
        timestampLayer.backgroundColor = UIColor.clear.cgColor
        timestampLayer.alignmentMode = .left
        timestampLayer.font = CTFontCreateWithName("Helvetica-Bold" as CFString, 16, nil)
        timestampLayer.contentsScale = UIScreen.main.scale
        timestampLayer.shadowColor = UIColor.black.cgColor
        timestampLayer.shadowOffset = CGSize(width: 2, height: 2)
        timestampLayer.shadowOpacity = 0.8
        timestampLayer.shadowRadius = 3
        timestampLayer.frame = CGRect(
            x: containerX,
            y: containerY + totalHeight - timestampHeight,
            width: textWidth,
            height: timestampHeight
        )
        
        // Start hidden
        timestampLayer.opacity = 0.0
        
        // Calculate timing for this layer
        let layerStartTime = Double(i)
        let layerEndTime = min(Double(i + 1), videoDurationSeconds) // Don't exceed video duration
        
        print("🕐 Layer \(i): '\(timeString)' visible from \(layerStartTime)s to \(layerEndTime)s")
        
        // Create show animation
        let showAnimation = CABasicAnimation(keyPath: "opacity")
        showAnimation.fromValue = 0.0
        showAnimation.toValue = 1.0
        showAnimation.duration = 0.1 // Quick fade in
        showAnimation.beginTime = AVCoreAnimationBeginTimeAtZero + layerStartTime
        showAnimation.fillMode = .forwards
        showAnimation.isRemovedOnCompletion = false
        
        // Create hide animation (except for the last layer)
        if i < totalSeconds - 1 {
            let hideAnimation = CABasicAnimation(keyPath: "opacity")
            hideAnimation.fromValue = 1.0
            hideAnimation.toValue = 0.0
            hideAnimation.duration = 0.1 // Quick fade out
            hideAnimation.beginTime = AVCoreAnimationBeginTimeAtZero + layerEndTime - 0.1
            hideAnimation.fillMode = .forwards
            hideAnimation.isRemovedOnCompletion = false
            
            timestampLayer.add(hideAnimation, forKey: "hide_\(i)")
        }
        
        timestampLayer.add(showAnimation, forKey: "show_\(i)")
        containerLayer.addSublayer(timestampLayer)
    }

    // Add static elements to container (these never change)
    containerLayer.addSublayer(roveTextLayer)
    containerLayer.addSublayer(logoLayer)

    print("✅ Timestamp overlay created with \(totalSeconds) dynamic timestamp layers + static ROVE branding")
    
    return containerLayer
}

  private func getCurrentTimestamp() -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
    formatter.timeZone = TimeZone.current
    return formatter.string(from: Date())
  }
  
  // MARK: - Existing Standalone Overlay Methods (unchanged)
  
  private func addTimestampOverlayToVideo(
    inputURL: URL,
    outputURL: URL,
    timestamp: String,
    incidentId: String
  ) throws {
    
    let asset = AVURLAsset(url: inputURL)
    
    guard let videoTrack = asset.tracks(withMediaType: .video).first else {
      throw NSError(domain: "VideoMerger", code: 1, userInfo: [
        NSLocalizedDescriptionKey: "No video track found"
      ])
    }
    
    let composition = AVMutableComposition()
    
    guard let compositionVideoTrack = composition.addMutableTrack(
      withMediaType: .video,
      preferredTrackID: kCMPersistentTrackID_Invalid
    ) else {
      throw NSError(domain: "VideoMerger", code: 2, userInfo: [
        NSLocalizedDescriptionKey: "Failed to create composition video track"
      ])
    }
    
    let timeRange = CMTimeRangeMake(start: .zero, duration: asset.duration)
    try compositionVideoTrack.insertTimeRange(timeRange, of: videoTrack, at: .zero)
    
    // Add audio if exists
    if let audioTrack = asset.tracks(withMediaType: .audio).first,
       let compositionAudioTrack = composition.addMutableTrack(
         withMediaType: .audio,
         preferredTrackID: kCMPersistentTrackID_Invalid
       ) {
      try compositionAudioTrack.insertTimeRange(timeRange, of: audioTrack, at: .zero)
    }
    
    // Get video properties
    let videoSize = videoTrack.naturalSize
    let videoTransform = videoTrack.preferredTransform
    let transformedSize = videoSize.applying(videoTransform)
    let renderSize = CGSize(width: abs(transformedSize.width), height: abs(transformedSize.height))
    
    // Create video composition with custom timestamp
    let videoComposition = createVideoCompositionWithCustomOverlay(
      track: compositionVideoTrack,
      renderSize: renderSize,
      transform: videoTransform,
      duration: asset.duration,
      timestamp: timestamp,
      incidentId: incidentId
    )
    
    // Export
    guard let exportSession = AVAssetExportSession(
      asset: composition,
      presetName: AVAssetExportPresetHighestQuality
    ) else {
      throw NSError(domain: "VideoMerger", code: 3, userInfo: [
        NSLocalizedDescriptionKey: "Failed to create export session"
      ])
    }
    
    exportSession.videoComposition = videoComposition
    exportSession.outputURL = outputURL
    exportSession.outputFileType = .mp4
    exportSession.shouldOptimizeForNetworkUse = true
    
    let semaphore = DispatchSemaphore(value: 0)
    var exportError: Error?
    
    exportSession.exportAsynchronously {
      if let error = exportSession.error {
        exportError = error
      }
      semaphore.signal()
    }
    
    semaphore.wait()
    
    if let error = exportError {
      throw error
    }
    
    guard exportSession.status == .completed else {
      throw NSError(domain: "VideoMerger", code: 4, userInfo: [
        NSLocalizedDescriptionKey: "Export failed with status: \(exportSession.status.rawValue)"
      ])
    }
  }
  
  private func createVideoCompositionWithCustomOverlay(
    track: AVMutableCompositionTrack,
    renderSize: CGSize,
    transform: CGAffineTransform,
    duration: CMTime,
    timestamp: String,
    incidentId: String
  ) -> AVMutableVideoComposition {
    
    let videoComposition = AVMutableVideoComposition()
    videoComposition.renderSize = renderSize
    videoComposition.frameDuration = CMTime(value: 1, timescale: 30)
    
    let instruction = AVMutableVideoCompositionInstruction()
    instruction.timeRange = CMTimeRangeMake(start: .zero, duration: duration)
    
    let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: track)
    layerInstruction.setTransform(transform, at: .zero)
    instruction.layerInstructions = [layerInstruction]
    videoComposition.instructions = [instruction]
    
    // Create custom timestamp overlay
    let overlayLayer = createCustomTimestampOverlayLayer(
      renderSize: renderSize,
      timestamp: timestamp,
      incidentId: incidentId
    )
    
    let videoLayer = CALayer()
    videoLayer.frame = CGRect(origin: .zero, size: renderSize)
    
    let parentLayer = CALayer()
    parentLayer.frame = CGRect(origin: .zero, size: renderSize)
    parentLayer.addSublayer(videoLayer)
    parentLayer.addSublayer(overlayLayer)
    
    videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(
      postProcessingAsVideoLayer: videoLayer,
      in: parentLayer
    )
    
    return videoComposition
  }
  
  private func createCustomTimestampOverlayLayer(
    renderSize: CGSize,
    timestamp: String,
    incidentId: String
  ) -> CALayer {
    
    let containerLayer = CALayer()
    containerLayer.frame = CGRect(origin: .zero, size: renderSize)
    
    // Parse and format timestamp
    let formattedTimestamp = formatTimestamp(timestamp)
    
    // Logo dimensions (35x35 as requested)
    let logoSize: CGFloat = 55
    let logoSpacing: CGFloat = 24 // Space between text and logo
    
    // Calculate text dimensions
    let timestampHeight: CGFloat = 20
    let roveHeight: CGFloat = 18
    let textSpacing: CGFloat = 4
    let textHeight = timestampHeight + textSpacing + roveHeight
    
    // Calculate total dimensions including logo (logo now on RIGHT of text)
    let textWidth: CGFloat = 140 // Width for text content
    let totalWidth = textWidth + logoSpacing + logoSize
    let totalHeight = max(logoSize, textHeight) // Use the larger of logo or text height
    let padding: CGFloat = 12
    
    // Position in top-right corner
    let containerX = renderSize.width - totalWidth - padding
    let containerY = renderSize.height - totalHeight - padding
    
    // Create background for the entire overlay (semi-transparent black)
    // let backgroundLayer = CALayer()
    // backgroundLayer.backgroundColor = UIColor.black.withAlphaComponent(0.7).cgColor
    // backgroundLayer.cornerRadius = 8
    // backgroundLayer.frame = CGRect(
    //   x: containerX - 8,
    //   y: containerY - 8,
    //   width: totalWidth + 16,
    //   height: totalHeight + 16
    // )
    
    // Create timestamp text layer (positioned on the LEFT)
    let timestampTextLayer = CATextLayer()
    timestampTextLayer.string = formattedTimestamp
    timestampTextLayer.fontSize = 16
    timestampTextLayer.foregroundColor = UIColor.white.cgColor
    timestampTextLayer.backgroundColor = UIColor.clear.cgColor
    timestampTextLayer.alignmentMode = .left
    timestampTextLayer.font = CTFontCreateWithName("Helvetica-Bold" as CFString, 16, nil)
    timestampTextLayer.contentsScale = UIScreen.main.scale
    timestampTextLayer.shadowColor = UIColor.black.cgColor
    timestampTextLayer.shadowOffset = CGSize(width: 2, height: 2)
    timestampTextLayer.shadowOpacity = 0.8
    timestampTextLayer.shadowRadius = 3
    timestampTextLayer.frame = CGRect(
      x: containerX,
      y: containerY + totalHeight - timestampHeight,
      width: textWidth,
      height: timestampHeight
    )
    
    // Create "ROVE APP" text layer (positioned on the LEFT)
    let roveTextLayer = CATextLayer()
    roveTextLayer.string = "ROVE APP"
    roveTextLayer.fontSize = 14
    roveTextLayer.foregroundColor = UIColor.white.cgColor
    roveTextLayer.backgroundColor = UIColor.clear.cgColor
    roveTextLayer.alignmentMode = .right
    roveTextLayer.font = CTFontCreateWithName("Helvetica-Bold" as CFString, 14, nil)
    roveTextLayer.contentsScale = UIScreen.main.scale
    roveTextLayer.shadowColor = UIColor.black.cgColor
    roveTextLayer.shadowOffset = CGSize(width: 2, height: 2)
    roveTextLayer.shadowOpacity = 0.8
    roveTextLayer.shadowRadius = 3
    roveTextLayer.frame = CGRect(
      x: containerX,
      y: containerY,
      width: textWidth,
      height: roveHeight
    )
    
    // Create ROVE premium logo layer (positioned on the RIGHT of text)
    let logoLayer = CALayer()
    let logoX = containerX + textWidth + logoSpacing
    let logoY = containerY + (totalHeight - logoSize) / 2 // Center vertically
    
    logoLayer.frame = CGRect(
      x: logoX,
      y: logoY,
      width: logoSize,
      height: logoSize
    )
    
    // Load the rove_premium.png image from the bundle
    if let logoImage = UIImage(named: "rove_premium") {
      logoLayer.contents = logoImage.cgImage
      logoLayer.contentsGravity = .resizeAspect
    } else {
      // Fallback: Create a simple colored rectangle if image not found
      print("⚠️ Warning: rove_premium.png image not found in bundle")
      logoLayer.backgroundColor = UIColor.yellow.cgColor
      logoLayer.cornerRadius = 4
    }
    logoLayer.shadowColor = UIColor.black.cgColor
    logoLayer.shadowOffset = CGSize(width: 2, height: 2)
    logoLayer.shadowOpacity = 0.8
    logoLayer.shadowRadius = 3  

    // Add layers to container
    // containerLayer.addSublayer(backgroundLayer)
    containerLayer.addSublayer(timestampTextLayer)
    containerLayer.addSublayer(roveTextLayer)
    containerLayer.addSublayer(logoLayer)
    
    return containerLayer
  }
  
  private func formatTimestamp(_ timestamp: String) -> String {
    let inputFormatter = ISO8601DateFormatter()
    inputFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    
    let outputFormatter = DateFormatter()
    outputFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
    outputFormatter.timeZone = TimeZone.current
    
    if let date = inputFormatter.date(from: timestamp) {
      return outputFormatter.string(from: date)
    } else {
      // Fallback to current time if parsing fails
      return outputFormatter.string(from: Date())
    }
  }
  
  // MARK: - Helper: Get Video Info (Existing)
  
  @objc
  func getVideoInfo(
    _ videoPath: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    
    guard FileManager.default.fileExists(atPath: videoPath) else {
      reject("FILE_NOT_FOUND", "Video not found at: \(videoPath)", nil)
      return
    }
    
    let asset = AVURLAsset(url: URL(fileURLWithPath: videoPath))
    
    guard let videoTrack = asset.tracks(withMediaType: .video).first else {
      reject("NO_VIDEO_TRACK", "No video track found", nil)
      return
    }
    
    let size = videoTrack.naturalSize.applying(videoTrack.preferredTransform)
    let duration = asset.duration.seconds
    
    resolve([
      "width": abs(size.width),
      "height": abs(size.height),
      "duration": duration
    ])
  }
  
  // MARK: - React Native Required Methods
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
