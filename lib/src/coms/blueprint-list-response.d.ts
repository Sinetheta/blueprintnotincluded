import { RocketInteriorCell, RocketInteriorModule } from '../blueprint/rocket-interior';
import { ForkedFromDto } from './blueprint-version';
import { RawSourceFormat } from '../io/bni/bni-share-string';
export interface BlueprintListResponse {
    blueprints: BlueprintListItem[];
    oldest: Date;
    remaining: number;
}
export interface TranslatedTitleFields {
    displayName?: string;
    nameTranslated?: boolean;
    nameSourceLang?: string | null;
}
export interface BlueprintListItem extends TranslatedTitleFields {
    id: string;
    name: string;
    ownerId: string;
    ownerName: string;
    createdAt: Date;
    modifiedAt: Date;
    thumbnail: string;
    nbRatings: number;
    rating: number;
    commentCount: number;
    requiredDlcs?: string[];
    category?: string | null;
    subcategory?: string | null;
    description?: string | null;
    modded?: boolean | null;
    mods?: string[];
    rooms?: string[] | null;
    rocketInterior?: RocketInteriorModule | null;
    rocketInteriorOrigin?: RocketInteriorCell | null;
    isPublished: boolean;
    nbForks: number;
    nbViews: number;
    nbDownloads: number;
    forkedFrom?: ForkedFromDto | null;
    duplicateCount?: number;
}
export interface BlueprintFacetsResponse {
    total: number;
    category: Record<string, number>;
    subcategory: Record<string, number>;
    rooms: Record<string, number>;
    requiredDlcs: Record<string, number>;
    baseGame: number;
}
export interface BlueprintDetailsResponse extends BlueprintListItem {
    researchTier?: string | null;
    myRating: number | null;
    ownedByMe: boolean;
    sourceLang?: string | null;
    translationEnabled?: boolean;
    savedByMe?: boolean;
}
export interface BookmarkResponse {
    blueprintId: string;
    saved: boolean;
}
export interface BlueprintSummaryBuildingResponse {
    id: string;
    name: string;
    count: number;
    icon: string | null;
}
export interface BlueprintSummaryMaterialResponse {
    id: string;
    name: string;
    mass: number;
    icon: string | null;
}
export interface BlueprintSummaryResponse {
    width: number;
    height: number;
    buildingCount: number;
    buildings: BlueprintSummaryBuildingResponse[];
    materials: BlueprintSummaryMaterialResponse[];
}
export interface RelatedBlueprintsResponse {
    blueprints: BlueprintListItem[];
}
export interface BlueprintRate {
    blueprintId: string;
    rating: number;
}
export interface BlueprintRateResponse {
    nbRatings: number;
    rating: number;
    myRating: number;
}
export interface BlueprintDelete {
    blueprintId: string;
}
export interface BlueprintResponse extends TranslatedTitleFields {
    id: string;
    name: string;
    data: any;
    nbRatings: number;
    rating: number;
    myRating: number | null;
    requiredDlcs?: string[];
    category?: string | null;
    subcategory?: string | null;
    description?: string | null;
    researchTier?: string | null;
    modded?: boolean | null;
    mods?: string[];
    rooms?: string[] | null;
    rocketInterior?: RocketInteriorModule | null;
    rocketInteriorOrigin?: RocketInteriorCell | null;
    isPublished: boolean;
    hasRawSource?: boolean;
    rawSourceFormat?: RawSourceFormat | null;
}
//# sourceMappingURL=blueprint-list-response.d.ts.map