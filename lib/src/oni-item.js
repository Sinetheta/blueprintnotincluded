"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OniItem = void 0;
const orientation_1 = require("./enums/orientation");
const vector2_1 = require("./vector2");
const utility_connection_1 = require("./utility-connection");
const b_element_1 = require("./b-export/b-element");
const b_ui_screen_1 = require("./b-export/b-ui-screen");
const sprite_modifier_group_1 = require("./drawing/sprite-modifier-group");
const permitted_rotations_1 = require("./enums/permitted-rotations");
const z_index_1 = require("./enums/z-index");
const overlay_1 = require("./enums/overlay");
const string_helpers_1 = require("./string-helpers");
const sprite_modifier_1 = require("./drawing/sprite-modifier");
const b_build_order_1 = require("./b-export/b-build-order");
const build_location_rule_1 = require("./enums/build-location-rule");
const connection_type_1 = require("./enums/connection-type");
class OniItem {
    get isInfo() { return this.id == OniItem.infoId; }
    get isPartOfCircuit() {
        for (let utility of this.utilityConnections)
            if (utility.type == connection_type_1.ConnectionType.POWER_INPUT || utility.type == connection_type_1.ConnectionType.POWER_OUTPUT)
                return true;
        if (this.zIndex == z_index_1.ZIndex.Wires)
            return true;
        return false;
    }
    get permittedRotations() { return this.permittedRotations_; }
    set permittedRotations(value) {
        this.permittedRotations_ = value;
        if (value == permitted_rotations_1.PermittedRotations.Unrotatable)
            this.orientations = [orientation_1.Orientation.Neutral];
        else if (value == permitted_rotations_1.PermittedRotations.FlipH)
            this.orientations = [orientation_1.Orientation.Neutral, orientation_1.Orientation.FlipH];
        else if (value == permitted_rotations_1.PermittedRotations.FlipV)
            this.orientations = [orientation_1.Orientation.Neutral, orientation_1.Orientation.FlipV];
        else if (value == permitted_rotations_1.PermittedRotations.R90)
            this.orientations = [orientation_1.Orientation.Neutral, orientation_1.Orientation.R90];
        else if (value == permitted_rotations_1.PermittedRotations.R360)
            this.orientations = [orientation_1.Orientation.Neutral, orientation_1.Orientation.R90, orientation_1.Orientation.R180, orientation_1.Orientation.R270];
    }
    constructor(id) {
        this.name = '';
        // imageId here is used for some stuff (generating white background textures)
        this.imageId = '';
        this.iconUrl = '';
        this.spriteModifierId = '';
        this.isWire = false;
        this.isTile = false;
        this.isBridge = false;
        // TODO this should be a get like isInfo
        this.isElement = false;
        this.size = new vector2_1.Vector2();
        this.tileOffset = new vector2_1.Vector2();
        this.utilityConnections = [];
        this.backColor = 0x000000;
        this.frontColor = 0xFFFFFF;
        this.orientations = [];
        this.dragBuild = false;
        this.objectLayer = 0; // TODO import enum?
        this.buildableElementsArray = [];
        this.defaultElement = [];
        this.materialMass = [0];
        this.uiScreens = [];
        this.spriteGroup = new sprite_modifier_group_1.SpriteModifierGroup();
        this.tileableLeftRight = false;
        this.tileableTopBottom = false;
        this.permittedRotations_ = permitted_rotations_1.PermittedRotations.Unrotatable;
        this.buildLocationRule = build_location_rule_1.BuildLocationRule.Anywhere;
        // Overlay
        this.zIndex = z_index_1.ZIndex.Building;
        this.overlay = overlay_1.Overlay.Base;
        this.id = id;
        this.cleanUp();
    }
    copyFrom(original) {
        this.id = original.prefabId;
        this.name = original.name;
        this.size = original.sizeInCells;
        this.isWire = original.isUtility;
        this.isBridge = original.isBridge;
        this.isTile = original.isTile;
        this.spriteModifierId = original.kanimPrefix;
        this.iconUrl = string_helpers_1.StringHelpers.createUrl(original.kanimPrefix + 'ui_0', true);
        this.zIndex = original.sceneLayer;
        this.overlay = this.getRealOverlay(original.viewMode);
        this.backColor = original.backColor;
        this.frontColor = original.frontColor;
        this.dragBuild = original.dragBuild;
        this.objectLayer = original.objectLayer;
        this.permittedRotations = original.permittedRotations;
        this.tileableLeftRight = original.tileableLeftRight;
        this.tileableTopBottom = original.tileableTopBottom;
        this.buildLocationRule = original.buildLocationRule;
        // TODO not sure if this is usefull still
        let imageId = original.textureName;
        let imageUrl = string_helpers_1.StringHelpers.createUrl(imageId, false);
        //ImageSource.AddImagePixi(imageId, imageUrl);
        this.buildableElementsArray = b_element_1.BuildableElement.getElementsFromTags(original.materialCategory);
        this.defaultElement = [];
        for (let indexElements = 0; indexElements < this.buildableElementsArray.length; indexElements++) {
            let buildableElement = this.buildableElementsArray[indexElements];
            if (buildableElement.length > 0)
                this.defaultElement[indexElements] = buildableElement[0];
            else
                this.defaultElement[indexElements] = b_element_1.BuildableElement.getElement('Unobtanium');
        }
        this.materialMass = [];
        for (let mass of original.materialMass)
            this.materialMass.push(mass);
        this.uiScreens = [];
        for (let uiScreen of original.uiScreens)
            this.uiScreens.push(b_ui_screen_1.BUiScreen.clone(uiScreen));
        this.spriteGroup = new sprite_modifier_group_1.SpriteModifierGroup();
        this.spriteGroup.importFrom(original.sprites);
        /*
        for (let spriteGroup of original.sprites) {
          let newGroup = SpriteModifierGroup.copyFrom(spriteGroup);
          this.spriteGroups.set(newGroup.groupName, newGroup);
        }
        */
        this.imageId = imageId;
        this.utilityConnections = [];
        if (original.utilities != null)
            for (let connection of original.utilities)
                this.utilityConnections.push({
                    type: connection.type,
                    offset: new vector2_1.Vector2(connection.offset.x, connection.offset.y),
                    isSecondary: connection.isSecondary
                });
    }
    getRealOverlay(overlay) {
        let returnValue = overlay;
        switch (overlay) {
            case overlay_1.Overlay.Decor:
            case overlay_1.Overlay.Light:
            case overlay_1.Overlay.Oxygen:
            case overlay_1.Overlay.Room:
            case overlay_1.Overlay.Temperature:
            case overlay_1.Overlay.Unknown: returnValue = overlay_1.Overlay.Base;
        }
        return returnValue;
    }
    cleanUp() {
        if (this.isTile == null)
            this.isTile = false;
        if (this.isWire == null)
            this.isWire = false;
        if (this.isBridge == null)
            this.isBridge = false;
        if (this.isElement == null)
            this.isElement = false;
        if (this.size == null)
            this.size = new vector2_1.Vector2();
        if (this.utilityConnections == null)
            this.utilityConnections = [];
        if (this.zIndex == null)
            this.zIndex = z_index_1.ZIndex.Building;
        if (this.permittedRotations == null)
            this.permittedRotations = permitted_rotations_1.PermittedRotations.Unrotatable;
        if (this.backColor == null)
            this.backColor = 0x000000;
        if (this.frontColor == null)
            this.frontColor = 0xFFFFFF;
        if (this.buildableElementsArray == null || this.buildableElementsArray.length == 0)
            this.buildableElementsArray = [[b_element_1.BuildableElement.getElement('Vacuum')]];
        if (this.materialMass == null)
            this.materialMass = [0];
        if (this.uiScreens == null)
            this.uiScreens = [];
        if (this.spriteGroup == null)
            this.spriteGroup = new sprite_modifier_group_1.SpriteModifierGroup();
        if (this.tileableLeftRight == null)
            this.tileableLeftRight = false;
        if (this.tileableTopBottom == null)
            this.tileableTopBottom = false;
        if (this.defaultElement == null || this.defaultElement.length == 0)
            this.defaultElement = [b_element_1.BuildableElement.getElement('Vacuum')];
        if (this.overlay == null)
            this.overlay = overlay_1.Overlay.Base;
        if (this.buildLocationRule == null)
            this.buildLocationRule = build_location_rule_1.BuildLocationRule.Anywhere;
        if (vector2_1.Vector2.Zero.equals(this.size))
            this.tileOffset = vector2_1.Vector2.Zero;
        else {
            this.tileOffset = new vector2_1.Vector2(1 - (this.size.x + (this.size.x % 2)) / 2, 0);
        }
    }
    static get oniItems() { return Array.from(OniItem.oniItemsMap.values()); }
    static init() {
        OniItem.oniItemsMap = new Map();
    }
    static load(buildings) {
        for (let building of buildings) {
            let oniItem = new OniItem(building.prefabId);
            oniItem.copyFrom(building);
            oniItem.cleanUp();
            // If the building is a tile, we need to generate its spriteInfos and sprite modifiers
            if (oniItem.isTile) {
                //SpriteInfo.addSpriteInfoArray(DrawHelpers.generateTileSpriteInfo(building.kanimPrefix, building.textureName));
                //SpriteModifier.addTileSpriteModifier(building.kanimPrefix);
            }
            sprite_modifier_1.SpriteModifier.AddSpriteModifier(building);
            OniItem.oniItemsMap.set(oniItem.id, oniItem);
        }
        let elementOniItem = new OniItem(OniItem.elementId);
        elementOniItem.name = OniItem.elementId;
        elementOniItem.isElement = true;
        elementOniItem.zIndex = z_index_1.ZIndex.GasFront;
        elementOniItem.spriteGroup = new sprite_modifier_group_1.SpriteModifierGroup();
        elementOniItem.spriteGroup.spriteModifiers.push(sprite_modifier_1.SpriteModifier.getSpriteModifer('element_tile_back'));
        elementOniItem.spriteGroup.spriteModifiers.push(sprite_modifier_1.SpriteModifier.getSpriteModifer('gas_tile_front'));
        elementOniItem.spriteGroup.spriteModifiers.push(sprite_modifier_1.SpriteModifier.getSpriteModifer('liquid_tile_front'));
        elementOniItem.spriteGroup.spriteModifiers.push(sprite_modifier_1.SpriteModifier.getSpriteModifer('vacuum_tile_front'));
        elementOniItem.cleanUp();
        OniItem.oniItemsMap.set(elementOniItem.id, elementOniItem);
        let infoOniItem = new OniItem(OniItem.infoId);
        infoOniItem.name = OniItem.infoId;
        infoOniItem.iconUrl = 'assets/images/ui/manual/info-indicator-icon.png';
        infoOniItem.zIndex = z_index_1.ZIndex.BuildingUse;
        infoOniItem.spriteGroup = new sprite_modifier_group_1.SpriteModifierGroup();
        infoOniItem.spriteGroup.spriteModifiers.push(sprite_modifier_1.SpriteModifier.getSpriteModifer('info_back'));
        for (let i = 0; i < 12; i++)
            infoOniItem.spriteGroup.spriteModifiers.push(sprite_modifier_1.SpriteModifier.getSpriteModifer('info_front_' + i));
        infoOniItem.cleanUp();
        OniItem.oniItemsMap.set(infoOniItem.id, infoOniItem);
    }
    isOverlayPrimary(overlay) {
        return overlay == utility_connection_1.ConnectionHelper.getOverlayFromLayer(this.zIndex);
    }
    isOverlaySecondary(overlay) {
        return overlay == this.overlay;
    }
    getCategoryFromItem() {
        if (b_build_order_1.BuildMenuItem.buildMenuItems != null)
            for (let buildMenuItem of b_build_order_1.BuildMenuItem.buildMenuItems)
                if (buildMenuItem.buildingId == this.id)
                    return b_build_order_1.BuildMenuCategory.getCategory(buildMenuItem.category);
        throw new Error('OniItem.getCategoryFromItem : Building not found');
    }
    static getOniItem(id) {
        let returnValue = OniItem.oniItemsMap.get(id);
        /*
        if (returnValue == null)
        {
          returnValue = new OniItem(id);
          returnValue.cleanUp();
        }
    */
        if (returnValue != undefined)
            return returnValue;
        else
            throw new Error('OniItem.getOniItem : OniItem id not found : ' + id);
    }
}
exports.OniItem = OniItem;
OniItem.elementId = 'Element';
OniItem.infoId = 'Info';
OniItem.defaultColor = '#696969';
