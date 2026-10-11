import { BniDigCommand } from '../io/bni/bni-blueprint';
export declare const DIG_COLOR = 16757568;
export declare const DIG_FILL_ALPHA = 0.16;
export declare const DIG_HATCH_ALPHA = 0.7;
export declare const DIG_EDGE_ALPHA = 0.95;
export declare const DIG_AT_REST_ALPHA = 0.5;
export declare const DIG_BLOCKED_COLOR = 15029053;
export type DigSegment = [number, number, number, number];
export interface DigCellBox {
    left: number;
    top: number;
}
export interface DigOverlayGeometry {
    size: number;
    cells: DigCellBox[];
    hatch: DigSegment[];
    edges: DigSegment[];
}
export declare function digOverlayGeometry(digs: readonly BniDigCommand[] | null | undefined, zoom: number, originX?: number, originY?: number): DigOverlayGeometry;
export declare function digHatchThickness(zoom: number): number;
export declare function digEdgeThickness(zoom: number): number;
export declare function drawDigCells(graphics: any, digs: readonly BniDigCommand[] | null | undefined, zoom: number, originX?: number, originY?: number, alpha?: number, color?: number): void;
export declare function drawCrossedDigCell(graphics: any, cell: BniDigCommand, zoom: number, originX?: number, originY?: number, color?: number): void;
export declare function digCommandsKey(digs: readonly BniDigCommand[] | null | undefined): string;
//# sourceMappingURL=dig-markers.d.ts.map