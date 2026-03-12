"use strict";
/**
 * GeoJSON utilities for point-in-polygon checks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPointInPolygon = isPointInPolygon;
/**
 * Check if a point is inside a GeoJSON polygon
 * Uses ray casting algorithm
 */
function isPointInPolygon(point, polygon) {
    if (polygon.type !== 'Polygon') {
        return false;
    }
    // Get the outer ring (first array of coordinates)
    const ring = polygon.coordinates[0];
    if (!ring || ring.length < 3) {
        return false;
    }
    let inside = false;
    const { lat, lng } = point;
    // Ray casting algorithm
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0]; // longitude
        const yi = ring[i][1]; // latitude
        const xj = ring[j][0];
        const yj = ring[j][1];
        const intersect = ((yi > lat) !== (yj > lat)) &&
            (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
        if (intersect) {
            inside = !inside;
        }
    }
    return inside;
}
//# sourceMappingURL=geojson.js.map