"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BSpriteGroup = exports.BBuilding = void 0;
const overlay_1 = require("../enums/overlay");
const permitted_rotations_1 = require("../enums/permitted-rotations");
const vector2_1 = require("../vector2");
const z_index_1 = require("../enums/z-index");
const build_location_rule_1 = require("../enums/build-location-rule");
// A building (exported from the game)
class BBuilding {
    constructor() {
        this.name = '';
        this.prefabId = '';
        this.isTile = false;
        this.isUtility = false;
        this.isBridge = false;
        this.sizeInCells = new vector2_1.Vector2();
        this.sceneLayer = z_index_1.ZIndex.Building;
        this.viewMode = overlay_1.Overlay.Base;
        this.backColor = 0;
        this.frontColor = 0;
        this.kanimPrefix = '';
        this.textureName = '';
        this.spriteInfos = [];
        this.spriteModifiers = [];
        this.utilities = [];
        this.materialCategory = [];
        this.materialMass = [];
        this.uiScreens = [];
        this.sprites = new BSpriteGroup('default');
        this.dragBuild = false;
        this.objectLayer = 0;
        this.permittedRotations = permitted_rotations_1.PermittedRotations.Unrotatable;
        this.buildLocationRule = build_location_rule_1.BuildLocationRule.Anywhere;
        this.tileableLeftRight = false;
        this.tileableTopBottom = false;
    }
}
exports.BBuilding = BBuilding;
// All sprites for a building
// TODO since all sprites for a building are inside the same group, we don't need this class anymore. spriteNames should go directly into the BBuilding class
class BSpriteGroup {
    constructor(groupName) {
        this.spriteNames = [];
        this.groupName = groupName;
    }
    static clone(original) {
        let returnValue = new BSpriteGroup(original.groupName);
        returnValue.spriteNames = [];
        for (let spriteName of original.spriteNames)
            returnValue.spriteNames.push(spriteName);
        return returnValue;
    }
}
exports.BSpriteGroup = BSpriteGroup;
