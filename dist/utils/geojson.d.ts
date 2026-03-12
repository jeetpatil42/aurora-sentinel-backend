/**
 * GeoJSON utilities for point-in-polygon checks
 */
export interface Point {
    lat: number;
    lng: number;
}
export interface GeoJSONPolygon {
    type: 'Polygon';
    coordinates: number[][][];
}
/**
 * Check if a point is inside a GeoJSON polygon
 * Uses ray casting algorithm
 */
export declare function isPointInPolygon(point: Point, polygon: GeoJSONPolygon): boolean;
//# sourceMappingURL=geojson.d.ts.map