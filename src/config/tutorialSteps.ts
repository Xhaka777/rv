// src/config/tutorialSteps.ts
import { TutorialStep } from "../types/tutorial";

// Tutorial step mapping for react-native-copilot
export const TUTORIAL_STEPS = {
  1: { screen: 'LiveStream', element: 'welcome-modal' },
  2: { screen: 'LiveStream', element: 'settings-tab' },
  3: { screen: 'Settings', element: 'responders-item' },
  4: { screen: 'TrustedContacts', element: 'add-contact-button' },
  5: { screen: 'TrustedContacts', element: 'success-message' },
  6: { screen: 'TrustedContacts', element: 'test-stream-button' },
  7: { screen: 'LiveStream', element: 'livestream-button' },
};

// Keep your existing TUTORIAL_STEPS array for reference/backup
export const TUTORIAL_STEPS_LEGACY: TutorialStep[] = [
  {
    id: 1,
    title: 'Welcome to Rove',
    description: 'Rove helps protect you by monitoring your surroundings and alerting your trusted contacts in case of danger. Let us show you how it works.',
    screen: 'LiveStream',
    action: 'next',
  },
  {
    id: 2,
    title: 'Access Settings',
    description: 'Now tap on the Settings tab at the bottom to continue the tutorial.',
    screen: 'LiveStream',
    highlightElement: 'settings-tab',
    highlightType: 'circle',
    action: 'navigate',
    navigationTarget: 'Settings',
    isNavigationStep: true,
  },
  {
    id: 3,
    title: 'Add Responders',
    description: 'Now tap on "Responders" to add your trusted contacts who will be notified during emergencies.',
    screen: 'Settings',
    highlightElement: 'responders-item',
    highlightType: 'rounded',
    action: 'navigate',
    navigationTarget: 'TrustedContacts',
    isNavigationStep: true,
  },
  {
    id: 4,
    title: 'Add Your First Contact',
    description: 'Add at least one trusted contact who will receive alerts when you\'re in danger. Tap "Add Contact" to get started.',
    screen: 'TrustedContacts',
    highlightElement: 'add-contact-button',
    highlightType: 'rounded',
    action: 'interact',
  },
  {
    id: 5,
    title: 'Great! You\'re All Set',
    description: 'Perfect! You now have trusted contacts set up. Let\'s go back to the LiveStream to learn how to use Rove\'s protection features.',
    screen: 'TrustedContacts',
    action: 'navigate',
    navigationTarget: 'LiveStream',
  },
  {
    id: 6,
    title: 'Your Safety Dashboard',
    description: 'This is your main safety interface. The red button starts emergency streaming to your contacts.',
    screen: 'LiveStream',
    highlightElement: 'livestream-button',
    highlightType: 'circle',
    action: 'complete',
  },
];

// Enhanced tutorial steps with copilot integration
export const COPILOT_TUTORIAL_STEPS = {
  1: {
    screen: 'LiveStream',
    element: 'welcome-modal',
    title: 'Welcome to Rove',
    description: 'Rove helps protect you by monitoring your surroundings and alerting your trusted contacts in case of danger. Let us show you how it works.',
    action: 'modal',
  },
  2: {
    screen: 'LiveStream',
    element: 'settings-tab',
    title: 'Access Settings',
    description: 'First, let\'s set up your trusted contacts. Tap the Settings icon at the bottom to continue.',
    action: 'navigate',
    navigationTarget: 'Settings',
  },
  3: {
    screen: 'Settings',
    element: 'responders-item',
    title: 'Add Responders',
    description: 'Now tap on "Responders" to add your trusted contacts who will be notified during emergencies.',
    action: 'navigate',
    navigationTarget: 'TrustedContacts',
  },
  4: {
    screen: 'TrustedContacts',
    element: 'add-contact-button',
    title: 'Add Your First Contact',
    description: 'Add at least one trusted contact who will receive alerts when you\'re in danger. Tap "Add Contact" to get started.',
    action: 'interact',
  },
  5: {
    screen: 'TrustedContacts',
    element: 'success-message',
    title: 'Responder Added',
    description: 'Your first Responder has been added and will receive your livestream and location if an incident occurs. Let\'s try it out with a quick audio stream.',
    action: 'continue',
  },
  6: {
    screen: 'TrustedContacts',
    element: 'test-stream-button',
    title: 'Test Your Setup',
    description: 'Tap the "Test stream" button to see how your responders will receive your emergency alerts.',
    action: 'navigate',
    navigationTarget: 'LiveStream',
  },
  7: {
    screen: 'LiveStream',
    element: 'livestream-button',
    title: 'Your Safety Dashboard',
    description: 'This is your main safety interface. The red button starts emergency streaming to your contacts.',
    action: 'complete',
  },
};

// Type definitions for better TypeScript support
export type TutorialStepKey = keyof typeof TUTORIAL_STEPS;
export type TutorialScreenName = 'LiveStream' | 'Settings' | 'TrustedContacts';
export type TutorialElementName =
  | 'welcome-modal'
  | 'settings-tab'
  | 'responders-item'
  | 'add-contact-button'
  | 'success-message'
  | 'test-stream-button'
  | 'livestream-button';

// Helper functions
export const getTutorialStepByScreen = (screen: TutorialScreenName) => {
  return Object.entries(TUTORIAL_STEPS).filter(([_, step]) => step.screen === screen);
};

export const getTutorialStepByElement = (element: TutorialElementName) => {
  return Object.entries(TUTORIAL_STEPS).find(([_, step]) => step.element === element);
};