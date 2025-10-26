export interface TutorialStep {
    id: number;
    title: string;
    description: string;
    screen: string;
    highlightElement?: string;
    highlightType?: 'circle' | 'rounded'| 'square';
    highlightStyle?: any;
    action?: 'navigate' | 'interact' | 'complete';
    navigationTarget?: string;
    skipToStep?: number;
    isNavigationStep?: boolean;
}

export interface TutorialConfig {
    steps: TutorialStep[];
    currentStep: number;
    isActive: boolean;
    completedSteps: number[];
}