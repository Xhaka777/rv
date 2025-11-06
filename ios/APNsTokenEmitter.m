#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(APNsTokenEmitter, RCTEventEmitter)
RCT_EXTERN_METHOD(requestNotificationPermission)
@end