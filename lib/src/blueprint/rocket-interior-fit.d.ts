import { RocketInteriorAnchorItem, RocketInteriorCell, RocketInteriorModule } from './rocket-interior';
export type RocketInteriorFitEvidence = 'capture' | 'hull' | 'station';
export interface RocketInteriorFit {
    module: RocketInteriorModule;
    origin: RocketInteriorCell;
    evidence: RocketInteriorFitEvidence;
    hullCoverage: number;
    strays: number;
}
export interface RocketInteriorFitOptions {
    isWall?: (id: string) => boolean;
}
export declare const HULL_COVERAGE_MIN = 0.6;
export declare function strayLimit(itemCells: number): number;
export declare const STRAY_REACH = 2;
export declare function isRocketHullMaterial(id: string): boolean;
export declare function fitRocketInterior(items: RocketInteriorAnchorItem[], digCommands: {
    x: number;
    y: number;
}[] | null | undefined, options?: RocketInteriorFitOptions): RocketInteriorFit | null;
export declare function fitRocketInteriorModule(module: RocketInteriorModule, items: RocketInteriorAnchorItem[], options?: RocketInteriorFitOptions): RocketInteriorCell | null;
//# sourceMappingURL=rocket-interior-fit.d.ts.map