#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(VideoMerger, NSObject)

RCT_EXTERN_METHOD(mergeVideos:(NSString *)frontCamPath
                  backCamPath:(NSString *)backCamPath
                  outputPath:(NSString *)outputPath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(addTimestampOverlay:(NSString *)inputPath
                  outputPath:(NSString *)outputPath
                  timestamp:(NSString *)timestamp
                  incidentId:(NSString *)incidentId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getVideoInfo:(NSString *)videoPath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
