/**
 * Risk Engine - Real, Rule-Based, Deterministic
 * All calculations follow exact formulas
 */
export interface AudioInputs {
    rms: number;
    pitchVariance: number;
    spikeCount: number;
}
export interface MotionInputs {
    accelerationMagnitude: number;
    jitter: number;
}
export interface RiskFactors {
    audio: number;
    motion: number;
    time: number;
    location: number;
    total: number;
}
export interface RiskSnapshot {
    audio: {
        stress: number;
        score: number;
    };
    motion: {
        intensity: number;
        score: number;
    };
    time: {
        riskFactor: number;
        score: number;
    };
    location: {
        riskFactor: number;
        score: number;
    };
    total: number;
    level: 'low' | 'medium' | 'high';
}
/**
 * 1. Audio Stress (0-35)
 * Formula: audioStress = (rms * 0.5) + (pitchVariance * 0.3) + (Math.min(spikeCount / 5, 1) * 0.2)
 */
export declare function calculateAudioStress(inputs: AudioInputs): number;
/**
 * 2. Motion Intensity (0-25)
 * Formula: motionIntensity = min((accelerationMagnitude / 30) * 0.6 + (jitter / 20) * 0.4, 1)
 */
export declare function calculateMotionIntensity(inputs: MotionInputs): number;
/**
 * 3. Time-of-Day Risk (0-20)
 * 06:00-20:00 → 0.2
 * 20:00-00:00 → 0.6
 * 00:00-04:00 → 1.0
 * 04:00-06:00 → 0.4
 */
export declare function calculateTimeRisk(date?: Date): number;
/**
 * 4. Location Risk (0-20)
 * Checks if user is inside risk zones from database
 */
export interface ZoneMatch {
    name: string;
    type: 'high' | 'low';
    multiplier: number;
}
export declare function calculateLocationRisk(location?: any, riskZones?: Array<{
    name: string;
    type: 'high' | 'low';
    polygon: any;
    multiplier: number;
}>): Promise<{
    score: number;
    matchedZone?: ZoneMatch;
    isNormalZone?: boolean;
}>;
/**
 * Calculate Total Risk Score (Synchronous version for frontend)
 */
export declare function calculateTotalRisk(audioInputs: AudioInputs, motionInputs: MotionInputs, location?: any, date?: Date): RiskSnapshot;
/**
 * Calculate Total Risk Score (Async version for backend with zone checking)
 */
export declare function calculateTotalRiskAsync(audioInputs: AudioInputs, motionInputs: MotionInputs, location?: any, date?: Date, riskZones?: Array<{
    name: string;
    type: 'high' | 'low';
    polygon: any;
    multiplier: number;
}>): Promise<RiskSnapshot & {
    location: {
        riskFactor: number;
        score: number;
        matchedZone?: ZoneMatch;
    };
}>;
/**
 * Check if auto-SOS should be triggered
 */
export declare function shouldTriggerAutoSOS(totalRisk: number): boolean;
//# sourceMappingURL=engine.d.ts.map