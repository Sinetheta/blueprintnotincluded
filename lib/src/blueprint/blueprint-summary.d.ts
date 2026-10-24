import { Blueprint } from './blueprint';
export interface BlueprintSummaryBuilding {
    id: string;
    count: number;
}
export interface BlueprintSummaryMaterial {
    id: string;
    mass: number;
}
export interface BlueprintSummary {
    width: number;
    height: number;
    buildingCount: number;
    buildings: BlueprintSummaryBuilding[];
    materials: BlueprintSummaryMaterial[];
}
export declare function summarizeBlueprint(blueprint: Blueprint): BlueprintSummary;
export declare function formatMassKg(kg: number): string;
//# sourceMappingURL=blueprint-summary.d.ts.map