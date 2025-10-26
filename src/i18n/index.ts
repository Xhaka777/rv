import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import {I18nManager} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const resources = {
  en: {
    translation: {
      // AUTH FLOW

      // OnboardingSCREEN
      Onboarding_heading: 'Never walk alone',
      Onboarding_heading1:
        'When every second counts and adrenaline takes over, there’s often no time to reach for your phone or call for help. With Rove, you don’t need to act — we do it for you.',
      Onboarding_heading2:
        'Rove continuously scans for signs of distress, even from your pocket. When an assault is detected, it instantly shares your live location and audio/ video. You choose what gets shared and with whom.',
      Onboarding_heading3:
        'Our tech recognizes real threats with 99% accuracy, filtering out false triggers like loud TV or arguments. You choose how it activates—automatically, manually, or with a safe word. You can set safe zones where detection is paused.',
      Onboarding_heading4:
        'Worn on a strap with the camera facing out, your phone starts streaming automatically when Rove identifies a threat - capturing everything in real time. ',
      Onboarding_heading5:
        'Showing the perpetrator that they are being livestreamed can trigger hesitation, fear of exposure, and a loss of control; powerful psychological levers that may stop an attack before it escalates.',
      Onboarding_heading6:
        'Even if your phone is taken or destroyed, everything is securely backed up in the cloud, keeping critical evidence safe for investigations.',
      Onboarding_heading7:
        'Rove doesn’t record or store anything unless a trigger is activated. Unlike voice assistants we only listen only for specific threat patterns. Nothing is saved, stored, or shared unless real danger is detected.',
      skip: 'Skip',
      next: 'Next',
    },
  },
  ar: {
    translation: {
      // AUTH FLOW
    },
  },
};

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  resources,
  lng: I18nManager.isRTL ? 'ar' : 'en',

  interpolation: {
    escapeValue: true,
  },
});

const changeLan = async () => {
  const language = await AsyncStorage.getItem('lan');
  if (language != null) {
    i18n.changeLanguage('ar').then(() => {});
  }
};

changeLan();
