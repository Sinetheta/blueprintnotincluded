"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlueprintItemWire = void 0;
const blueprint_item_1 = require("./blueprint-item");
const draw_helpers_1 = require("../drawing/draw-helpers");
const vector2_1 = require("../vector2");
const b_element_1 = require("../b-export/b-element");
const z_index_1 = require("../enums/z-index");
class BlueprintItemWire extends blueprint_item_1.BlueprintItem {
    get connections() { return this.connections_; }
    set connections(value) {
        if (value != this.connections_)
            this.reloadCamera = true;
        this.connections_ = value;
    }
    constructor(id) {
        super(id);
        this.connections_ = 0;
        this.pipeElement = b_element_1.BuildableElement.getElement('None');
    }
    importOniBuilding(building) {
        this.connections = building.connections;
        super.importOniBuilding(building);
    }
    importBniBuilding(building) {
        this.connections = building.flags;
        super.importBniBuilding(building);
    }
    importMdbBuilding(original) {
        if (original.connections == undefined)
            this.connections = 0;
        else
            this.connections = original.connections;
        if (original.pipeElement == undefined)
            this.pipeElement = b_element_1.BuildableElement.getElement('None');
        else
            this.pipeElement = b_element_1.BuildableElement.getElement(original.pipeElement);
        super.importMdbBuilding(original);
    }
    cleanUp() {
        if (this.connections == null)
            this.connections = BlueprintItemWire.defaultConnections;
        super.cleanUp();
        this.updateDrawPartVisibilityBasedOnConnections();
    }
    cameraChanged(camera) {
        super.cameraChanged(camera);
        this.updateDrawPartVisibilityBasedOnConnections();
    }
    modulateSelectedTint(camera) {
        super.modulateSelectedTint(camera);
        this.updateDrawPartVisibilityBasedOnConnections();
    }
    modulateBuildCandidateTint(camera) {
        super.modulateBuildCandidateTint(camera);
        this.updateDrawPartVisibilityBasedOnConnections();
    }
    updateDrawPartVisibilityBasedOnConnections() {
        if (this.drawParts != null)
            for (let drawPart of this.drawParts)
                drawPart.makeEverythingButThisTagInvisible(draw_helpers_1.DrawHelpers.connectionTag[this.connections]);
    }
    drawPixi(camera, pixiUtil) {
        super.drawPixi(camera, pixiUtil);
        if (this.oniItem.isOverlayPrimary(camera.overlay) && this.oniItem.zIndex == z_index_1.ZIndex.LiquidConduits && this.pipeElement.id != 'None') {
            let truePosition = new vector2_1.Vector2((this.position.x + 0.5 + camera.cameraOffset.x /*- camera.linearReset*/) * camera.currentZoom, (-this.position.y + 0.5 + camera.cameraOffset.y) * camera.currentZoom);
            pixiUtil.getUtilityGraphicsFront().beginFill(this.oniItem.backColor, 1);
            pixiUtil.getUtilityGraphicsFront().drawCircle(truePosition.x, truePosition.y, 0.32 * camera.currentZoom);
            pixiUtil.getUtilityGraphicsFront().endFill();
            pixiUtil.getUtilityGraphicsFront().beginFill(this.pipeElement.conduitColor, 1);
            pixiUtil.getUtilityGraphicsFront().drawCircle(truePosition.x, truePosition.y, 0.26 * camera.currentZoom);
            pixiUtil.getUtilityGraphicsFront().endFill();
        }
        if (this.oniItem.isOverlayPrimary(camera.overlay) && this.oniItem.zIndex == z_index_1.ZIndex.GasConduits && this.pipeElement.id != 'None') {
            let truePosition = new vector2_1.Vector2((this.position.x + 0.5 + camera.cameraOffset.x /*- camera.linearReset*/) * camera.currentZoom, (-this.position.y + 0.5 + camera.cameraOffset.y) * camera.currentZoom);
            pixiUtil.getUtilityGraphicsFront().beginFill(this.oniItem.backColor, 1);
            pixiUtil.getUtilityGraphicsFront().drawRect(truePosition.x - 0.32 * camera.currentZoom, truePosition.y - 0.32 * camera.currentZoom, 0.64 * camera.currentZoom, 0.64 * camera.currentZoom);
            pixiUtil.getUtilityGraphicsFront().endFill();
            pixiUtil.getUtilityGraphicsFront().beginFill(this.pipeElement.conduitColor, 1);
            pixiUtil.getUtilityGraphicsFront().drawRect(truePosition.x - 0.26 * camera.currentZoom, truePosition.y - 0.26 * camera.currentZoom, 0.52 * camera.currentZoom, 0.52 * camera.currentZoom);
            pixiUtil.getUtilityGraphicsFront().endFill();
        }
    }
    toMdbBuilding() {
        let returnValue = super.toMdbBuilding();
        if (this.connections != BlueprintItemWire.defaultConnections)
            returnValue.connections = this.connections;
        if (this.pipeElement.id != 'None')
            returnValue.pipeElement = this.pipeElement.id;
        return returnValue;
    }
    toBniBuilding() {
        let returnValue = super.toBniBuilding();
        returnValue.flags = this.connections;
        return returnValue;
    }
    updateTileables(blueprint) {
        super.updateTileables(blueprint);
    }
}
exports.BlueprintItemWire = BlueprintItemWire;
BlueprintItemWire.defaultConnections = 0;
