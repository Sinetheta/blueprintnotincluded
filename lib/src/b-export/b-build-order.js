"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const string_helpers_1 = require("../string-helpers");
// Categories for the build tool (exported from the game) 
class BuildMenuCategory {
    constructor() {
        this.category = 0;
        this.categoryName = '';
        this.categoryShowName = '';
        this.categoryIcon = '';
        this.categoryIconUrl = '';
    }
    importFrom(original) {
        this.category = original.category;
        this.categoryName = original.categoryName;
        this.categoryShowName = original.categoryShowName;
        this.categoryIcon = original.categoryIcon;
        this.categoryIconUrl = string_helpers_1.StringHelpers.createUrl(this.categoryIcon, true);
    }
    static init() {
        BuildMenuCategory.buildMenuCategories = [];
        BuildMenuCategory.allCategories = new BuildMenuCategory();
        BuildMenuCategory.allCategories.category = -1;
        BuildMenuCategory.allCategories.categoryName = 'All';
        BuildMenuCategory.allCategories.categoryIcon = 'icon_category_base';
        BuildMenuCategory.allCategories.categoryIconUrl = string_helpers_1.StringHelpers.createUrl(BuildMenuCategory.allCategories.categoryIcon, true);
    }
    static getCategory(category) {
        if (BuildMenuCategory.buildMenuCategories != null)
            for (let buildCategory of BuildMenuCategory.buildMenuCategories)
                if (buildCategory.category == category)
                    return buildCategory;
        throw new Error('BuildMenuCategory.getCategory : Category not found');
    }
    static load(buildMenuCategories) {
        for (let original of buildMenuCategories) {
            let newBuildMenuCategory = new BuildMenuCategory();
            newBuildMenuCategory.importFrom(original);
            BuildMenuCategory.buildMenuCategories.push(newBuildMenuCategory);
        }
    }
}
exports.BuildMenuCategory = BuildMenuCategory;
// Buildings for the build tool (exported from the game) 
class BuildMenuItem {
    constructor() {
        this.category = 0;
        this.buildingId = '';
    }
    importFrom(original) {
        this.category = original.category;
        this.buildingId = original.buildingId;
    }
    static init() {
        BuildMenuItem.buildMenuItems = [];
    }
    static load(buildMenuitems) {
        for (let original of buildMenuitems) {
            let newBuildMenuItem = new BuildMenuItem();
            newBuildMenuItem.importFrom(original);
            BuildMenuItem.buildMenuItems.push(newBuildMenuItem);
        }
    }
}
exports.BuildMenuItem = BuildMenuItem;
