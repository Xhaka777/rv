import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

// params Object
type AuthParamList = {
  OtpScreen: { email: string; from?: string; phone: string };
  VideoScreen: { courseId?: string };
};

export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
  abbreviate: string;
  serviceType: string;
}

type HomeParamList = {
  ThreatReportScreen: {
    onComplete: (additionalDetails: string, image?: string) => void;
    selectedThreat?: { id: number, icon: any, label: string } | null;
    shouldAutoFocus?: boolean;
    capturedPhoto?: string | null;
  };
};
// Auth Screens Types
export type LoginScreenProps = {};

export type OtpScreenProps = {
  navigation: StackNavigationProp<AuthParamList, 'OtpScreen'>;
  route: RouteProp<AuthParamList, 'OtpScreen'>;
};

export type ForgotPasswordProps = {};

export type RegisterScreenProps = {};

export type SelectLanguageProps = {};

export type GoogleSignUpProps = {};

export type VerifyUserProps = {};

export type OnBoardingProps = {};

export type ReadBeforeUseProps = {};

// Home Screen Types

export type NavigationScreenProps = {};

export type TermsAndPolicyProps = {};

export type TrustedContactsProps = {};

export type SearchProps = {};

export type LiveStreamProps = {};

export type PreferencesProps = {};

export type EditPreferencesProps = {};

export type AddContactsProps = {};

export type SettingsProps = {};

export type EditProfileProps = {};

export type FAQProps = {};

export type SafeZoneProps = {
  navigation?: any;
  route?: {
    params?: {
      reportedThreat?: {
        id: number;
        latitude: number;
        longitude: number;
        timestamp: string;
        description: string;
        threat_type: string;
        image?: string;
        icon: any;
      };
      showThreatDetails?: boolean;
    }
  }
};

export type FootagesProps = {};

export type FootageDetailsProps = {};

export type HeartRateMonitorProps = {};

export type PremiumProps = {};

export type PasscodeSettingsProps = {};

export type HeadsUpProps = {
  navigation?: any;
  route?: any;
};

export type HowToUseProps = {};

export type SafeWordProps = {};

export type EntryWordProps = {};

export type SafeWordTrainingProps = {};

export type EditContactProps = {};

export type BodyCamProps = {
  navigation?: any;
  route?: any;
}

export type HeadsUpSettings = {};

export type ThreatReportScreenProps = {
  navigation: StackNavigationProp<HomeParamList, 'ThreatReportScreen'>;
  route: RouteProp<HomeParamList, 'ThreatReportScreen'>;
};

export type SiriSetupScreenProps = {
  navigation?: any;
};