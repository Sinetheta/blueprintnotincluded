export declare class BuildMenuCategory {
    category: number;
    categoryName: string;
    categoryShowName: string;
    categoryIcon: string;
    categoryIconUrl: string;
    importFrom(original: BuildMenuCategory): void;
    static allCategories: BuildMenuCategory;
    static buildMenuCategories: BuildMenuCategory[];
    static init(): void;
    static getCategory(category: number): BuildMenuCategory;
    static load(buildMenuCategories: BuildMenuCategory[]): void;
}
export declare class BuildMenuItem {
    category: number;
    buildingId: string;
    importFrom(original: BuildMenuItem): void;
    static buildMenuItems: BuildMenuItem[];
    static init(): void;
    static load(buildMenuitems: BuildMenuItem[]): void;
}
//# sourceMappingURL=b-build-order.d.ts.map