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
export declare const PresentationMode: PresentationModeConfig;
export declare function getPresentationMode(): boolean;
export declare function setPresentationMode(enabled: boolean, password: string): boolean;
//# sourceMappingURL=config.d.ts.map