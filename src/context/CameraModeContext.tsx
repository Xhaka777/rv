// src/context/CameraModeContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

type CameraMode = 'AUDIO' | 'VIDEO';

interface CameraModeContextType {
  mode: CameraMode;
  setMode: (mode: CameraMode) => void;
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
}

const CameraModeContext = createContext<CameraModeContextType | undefined>(undefined);

export function CameraModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<CameraMode>('AUDIO'); // Default to AUDIO to match your existing code
  const [isRecording, setIsRecording] = useState(false);

  return (
    <CameraModeContext.Provider value={{ mode, setMode, isRecording, setIsRecording }}>
      {children}
    </CameraModeContext.Provider>
  );
}

export function useCameraMode() {
  const context = useContext(CameraModeContext);
  if (context === undefined) {
    throw new Error('useCameraMode must be used within a CameraModeProvider');
  }
  return context;
}