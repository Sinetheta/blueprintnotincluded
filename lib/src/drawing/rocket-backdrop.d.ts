import { RocketInteriorPlacement } from '../blueprint/rocket-interior';
export declare const ROCKET_INTERIOR_ASSET_DIR = "assets/images/rocket-interior/";
export interface BackdropTextureSize {
    width: number;
    height: number;
}
export interface StarLayerConfig {
    url: string;
    texture: BackdropTextureSize;
    scale: number;
    parallax: number;
    alpha: number;
}
export interface PerModule<T> {
    small: T;
    medium: T;
}
export declare const ROCKET_BACKDROP: {
    stars: StarLayerConfig[];
    moon: {
        url: string;
        texture: {
            width: number;
            height: number;
        };
        art: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        horizon: {
            x: number;
            y: number;
        };
        widthInCells: PerModule<number>;
        crestAboveFloorCells: PerModule<number>;
        crestOffsetCells: PerModule<number>;
    };
    vignette: {
        url: string;
        texture: {
            width: number;
            height: number;
        };
        radiiCells: PerModule<{
            x: number;
            y: number;
        }>;
        centreOffsetCells: PerModule<{
            x: number;
            y: number;
        }>;
        alpha: number;
    };
    door: {
        url: string;
        rect: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        alpha: number;
    };
};
export interface BackdropCamera {
    zoom: number;
    offsetX: number;
    offsetY: number;
}
export interface Viewport {
    width: number;
    height: number;
}
export interface ScreenRect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export declare function worldPointToScreen(px: number, py: number, camera: BackdropCamera): {
    x: number;
    y: number;
};
export declare function worldRectToScreen(left: number, bottom: number, width: number, height: number, camera: BackdropCamera): ScreenRect;
export interface PlacedSprite {
    url: string;
    rect: ScreenRect;
    alpha: number;
}
export interface RocketBackdropGeometry {
    stars: PlacedSprite[];
    moon: PlacedSprite;
    vignette: PlacedSprite;
    vignetteBands: ScreenRect[];
    door: PlacedSprite;
}
export declare function coverViewport(texture: BackdropTextureSize, viewport: Viewport, scale: number, shift: {
    x: number;
    y: number;
}): ScreenRect;
export declare function bandsAround(inner: ScreenRect, viewport: Viewport): ScreenRect[];
export declare function rocketBackdropGeometry(placement: RocketInteriorPlacement, camera: BackdropCamera, viewport: Viewport): RocketBackdropGeometry;
export declare function rocketBackdropImageUrls(): string[];
export declare function placeSprite(sprite: any, placed: PlacedSprite): void;
export declare function drawVignetteBands(graphics: any, bands: ScreenRect[], alpha: number): void;
//# sourceMappingURL=rocket-backdrop.d.ts.map