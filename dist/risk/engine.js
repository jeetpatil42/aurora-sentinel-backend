"use strict";
/**
 * Risk Engine - Real, Rule-Based, Deterministic
 * All calculations follow exact formulas
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateAudioStress = calculateAudioStress;
exports.calculateMotionIntensity = calculateMotionIntensity;
exports.calculateTimeRisk = calculateTimeRisk;
exports.calculateLocationRisk = calculateLocationRisk;
exports.calculateTotalRisk = calculateTotalRisk;
exports.calculateTotalRiskAsync = calculateTotalRiskAsync;
exports.shouldTriggerAutoSOS = shouldTriggerAutoSOS;
/**
 * 1. Audio Stress (0-35)
 * Formula: audioStress = (rms * 0.5) + (pitchVariance * 0.3) + (Math.min(spikeCount / 5, 1) * 0.2)
 */
function calculateAudioStress(inputs) {
    const { rms, pitchVariance, spikeCount } = inputs;
    const audioStress = (rms * 0.5) +
        (pitchVariance * 0.3) +
        (Math.min(spikeCount / 5, 1) * 0.2);
    const audioScore = audioStress * 35;
    // Presentation mode removed - use normal scoring
    return Math.min(audioScore, 35);
}
/**
 * 2. Motion Intensity (0-25)
 * Formula: motionIntensity = min((accelerationMagnitude / 30) * 0.6 + (jitter / 20) * 0.4, 1)
 */
function calculateMotionIntensity(inputs) {
    const { accelerationMagnitude, jitter } = inputs;
    const motionIntensity = Math.min((accelerationMagnitude / 30) * 0.6 +
        (jitter / 20) * 0.4, 1);
    const motionScore = motionIntensity * 25;
    // Presentation mode removed - use normal scoring
    return Math.min(motionScore, 25);
}
/**
 * 3. Time-of-Day Risk (0-20)
 * 06:00-20:00 → 0.2
 * 20:00-00:00 → 0.6
 * 00:00-04:00 → 1.0
 * 04:00-06:00 → 0.4
 */
function calculateTimeRisk(date) {
    const now = date || new Date();
    const hour = now.getHours();
    let timeRiskFactor;
    if (hour >= 6 && hour < 20) {
        timeRiskFactor = 0.2;
    }
    else if (hour >= 20 && hour < 24) {
        timeRiskFactor = 0.6;
    }
    else if (hour >= 0 && hour < 4) {
        timeRiskFactor = 1.0;
    }
    else { // 4:00-6:00
        timeRiskFactor = 0.4;
    }
    // Presentation mode removed - use normal time-based scoring
    const timeScore = timeRiskFactor * 20;
    return timeScore;
}
async function calculateLocationRisk(location, riskZones) {
    let locationScore = 10; // Default: neutral/no zone = 10
    let matchedZone;
    let isNormalZone = false;
    // Check if location is provided and has coordinates
    if (location && location.lat && location.lng && riskZones && riskZones.length > 0) {
        const { isPointInPolygon } = await Promise.resolve().then(() => __importStar(require('../utils/geojson')));
        // Check each zone
        let foundZone = false;
        for (const zone of riskZones) {
            if (isPointInPolygon({ lat: location.lat, lng: location.lng }, zone.polygon)) {
                // Found a match - set score based on zone type
                if (zone.type === 'high') {
                    locationScore = 20; // High-risk zone = 20
                }
                else {
                    locationScore = 10; // Low-risk zone = 10
                }
                matchedZone = {
                    name: zone.name,
                    type: zone.type,
                    multiplier: zone.multiplier,
                };
                foundZone = true;
                break; // Use first match
            }
        }
        // If not inside any polygon, mark as normal zone
        if (!foundZone) {
            isNormalZone = true;
            locationScore = 10; // Neutral/no zone = 10
        }
    }
    else if (location && location.lat && location.lng) {
        // Location provided but no zones available - treat as normal zone
        isNormalZone = true;
        locationScore = 10; // Neutral/no zone = 10
    }
    // Presentation mode removed - use normal location scoring
    return { score: locationScore, matchedZone, isNormalZone };
}
/**
 * Calculate Total Risk Score (Synchronous version for frontend)
 */
function calculateTotalRisk(audioInputs, motionInputs, location, date) {
    const audioScore = calculateAudioStress(audioInputs);
    const motionScore = calculateMotionIntensity(motionInputs);
    const timeScore = calculateTimeRisk(date);
    // For frontend, use default location risk (will be updated by backend if zones are available)
    const locationScore = location?.score || 20; // Default to max if not provided
    const totalRisk = audioScore + motionScore + timeScore + locationScore;
    // Determine risk level
    let level;
    if (totalRisk < 25) {
        level = 'low';
    }
    else if (totalRisk < 50) {
        level = 'medium';
    }
    else {
        level = 'high';
    }
    return {
        audio: {
            stress: audioInputs.rms * 0.5 + audioInputs.pitchVariance * 0.3 + Math.min(audioInputs.spikeCount / 5, 1) * 0.2,
            score: audioScore,
        },
        motion: {
            intensity: Math.min((motionInputs.accelerationMagnitude / 30) * 0.6 + (motionInputs.jitter / 20) * 0.4, 1),
            score: motionScore,
        },
        time: {
            riskFactor: (() => {
                const hour = (date || new Date()).getHours();
                if (hour >= 6 && hour < 20)
                    return 0.2;
                if (hour >= 20 && hour < 24)
                    return 0.6;
                if (hour >= 0 && hour < 4)
                    return 1.0;
                return 0.4;
            })(),
            score: timeScore,
        },
        location: {
            riskFactor: location?.matchedZone ? location.matchedZone.multiplier : 1.0,
            score: locationScore,
        },
        total: totalRisk,
        level,
    };
}
/**
 * Calculate Total Risk Score (Async version for backend with zone checking)
 */
async function calculateTotalRiskAsync(audioInputs, motionInputs, location, date, riskZones) {
    const audioScore = calculateAudioStress(audioInputs);
    const motionScore = calculateMotionIntensity(motionInputs);
    const timeScore = calculateTimeRisk(date);
    const locationResult = await calculateLocationRisk(location, riskZones);
    const totalRisk = audioScore + motionScore + timeScore + locationResult.score;
    // Determine risk level
    let level;
    if (totalRisk < 25) {
        level = 'low';
    }
    else if (totalRisk < 50) {
        level = 'medium';
    }
    else {
        level = 'high';
    }
    return {
        audio: {
            stress: audioInputs.rms * 0.5 + audioInputs.pitchVariance * 0.3 + Math.min(audioInputs.spikeCount / 5, 1) * 0.2,
            score: audioScore,
        },
        motion: {
            intensity: Math.min((motionInputs.accelerationMagnitude / 30) * 0.6 + (motionInputs.jitter / 20) * 0.4, 1),
            score: motionScore,
        },
        time: {
            riskFactor: (() => {
                const hour = (date || new Date()).getHours();
                if (hour >= 6 && hour < 20)
                    return 0.2;
                if (hour >= 20 && hour < 24)
                    return 0.6;
                if (hour >= 0 && hour < 4)
                    return 1.0;
                return 0.4;
            })(),
            score: timeScore,
        },
        location: {
            riskFactor: locationResult.matchedZone ? locationResult.matchedZone.multiplier : 1.0,
            score: locationResult.score,
            matchedZone: locationResult.matchedZone,
        },
        total: totalRisk,
        level,
    };
}
/**
 * Check if auto-SOS should be triggered
 */
function shouldTriggerAutoSOS(totalRisk) {
    // Presentation mode removed - use normal threshold
    const threshold = 50;
    return totalRisk > threshold;
}
//# sourceMappingURL=engine.js.map