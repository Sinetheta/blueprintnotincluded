import { Vector2 } from '../vector2';
import { Blueprint } from './blueprint';
export declare const ROCKET_INTERIOR_MODULES: readonly ["small", "medium"];
export type RocketInteriorModule = (typeof ROCKET_INTERIOR_MODULES)[number];
export declare function isRocketInteriorModule(value: unknown): value is RocketInteriorModule;
export declare const ROCKET_CONTROL_STATION_ID = "RocketControlStation";
export declare const ROCKET_INTERIOR_DOOR_ID = "ClustercraftInteriorDoor";
export declare const ROCKET_INTERIOR_DOOR_URL = "assets/ui_image/ClustercraftInteriorDoor.png";
export declare const ROCKET_INTERIOR_GLYPHS: Record<string, string>;
export interface RocketInteriorLayoutSource {
    module: RocketInteriorModule;
    prefabId: string;
    left: number;
    top: number;
    rows: string[];
    door: RocketInteriorCell;
}
export interface RocketInteriorCell {
    x: number;
    y: number;
}
export declare function isRocketInteriorCell(value: unknown): value is RocketInteriorCell;
export interface RocketInteriorPiece extends RocketInteriorCell {
    id: string;
}
export interface RocketInteriorBounds {
    left: number;
    right: number;
    bottom: number;
    top: number;
}
export interface RocketInteriorLayout {
    module: RocketInteriorModule;
    prefabId: string;
    width: number;
    height: number;
    bounds: RocketInteriorBounds;
    stationOrigin: RocketInteriorCell;
    pieces: RocketInteriorPiece[];
    room: RocketInteriorCell[];
    door: RocketInteriorCell;
}
export declare function parseRocketInteriorLayout(source: RocketInteriorLayoutSource): RocketInteriorLayout;
export declare function rocketInteriorLayout(module: RocketInteriorModule): RocketInteriorLayout;
export declare const ROCKET_INTERIOR_ART: Record<string, string>;
export type RocketInteriorAnchor = 'station' | 'stored' | 'bounds';
export interface RocketInteriorPlacement {
    module: RocketInteriorModule;
    layout: RocketInteriorLayout;
    origin: RocketInteriorCell;
    anchor: RocketInteriorAnchor;
    removed: RocketInteriorCell[];
}
export interface RocketInteriorAnchorItem {
    id: string;
    position: {
        x: number;
        y: number;
    };
}
export declare function rocketInteriorOriginFromStation(layout: RocketInteriorLayout, items: RocketInteriorAnchorItem[]): RocketInteriorCell | null;
export declare function rocketInteriorOriginCentred(layout: RocketInteriorLayout, min: {
    x: number;
    y: number;
}, max: {
    x: number;
    y: number;
}): RocketInteriorCell;
export declare function placeRocketInterior(module: RocketInteriorModule, blueprint: Blueprint, storedOrigin?: RocketInteriorCell | null): RocketInteriorPlacement;
export declare function rocketInteriorPlacementKey(placement: RocketInteriorPlacement): string;
export declare function rocketInteriorWorldPieces(placement: RocketInteriorPlacement): RocketInteriorPiece[];
export declare function rocketInteriorWorldDoor(placement: RocketInteriorPlacement): RocketInteriorCell;
export declare function rocketInteriorWorldBounds(placement: RocketInteriorPlacement): RocketInteriorBounds;
export declare function expandBoundsForRocketInterior(box: Vector2[], placement: RocketInteriorPlacement | null): Vector2[];
export declare function buildRocketInteriorScenery(placement: RocketInteriorPlacement): Blueprint;
//# sourceMappingURL=rocket-interior.d.ts.map