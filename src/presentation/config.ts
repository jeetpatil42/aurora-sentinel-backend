/**
 * Presentation Mode Configuration
 * Global feature flag for demo/presentation purposes
 */

export interface PresentationModeConfig {
  enabled: boolean;
  forcedLocationRisk: number;
  forcedTimeRisk: number;
  audioMultiplier: number;
  motionMultiplier: number;
  autoSOSLowerThreshold: number;
}

export const PresentationMode: PresentationModeConfig = {
  enabled: false,
  forcedLocationRisk: 1.0,
  forcedTimeRisk: 1.0,
  audioMultiplier: 1.5,
  motionMultiplier: 1.5,
  autoSOSLowerThreshold: 35,
};

// Password-protected toggle (stored in memory for v1)
let presentationModeEnabled = false;

export function getPresentationMode(): boolean {
  return presentationModeEnabled || PresentationMode.enabled;
}

export function setPresentationMode(enabled: boolean, password: string): boolean {
  const correctPassword = process.env.PRESENTATION_MODE_PASSWORD || 'demo123';
  
  if (password === correctPassword) {
    presentationModeEnabled = enabled;
    return true;
  }
  
  return false;
}
