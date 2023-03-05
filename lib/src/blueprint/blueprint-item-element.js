"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlueprintItemElement = void 0;
const blueprint_item_1 = require("./blueprint-item");
const overlay_1 = require("../enums/overlay");
const sprite_tag_1 = require("../enums/sprite-tag");
const display_1 = require("../enums/display");
const visualization_1 = require("../enums/visualization");
const draw_helpers_1 = require("../drawing/draw-helpers");
class BlueprintItemElement extends blueprint_item_1.BlueprintItem {
    get header() { return this.buildableElements[0].name; }
    constructor(id) {
        super(id);
        this.mass = 0;
    }
    prepareSpriteVisibility(camera) {
    }
    updateTileables(blueprint) {
    }
    drawTemplateItem(templateItem, camera) {
    }
    importMdbBuilding(original) {
        if (original.mass == undefined)
            this.mass = 0;
        else
            this.mass = original.mass;
        super.importMdbBuilding(original);
    }
    toMdbBuilding() {
        let returnValue = super.toMdbBuilding();
        if (this.mass != BlueprintItemElement.defaultMass)
            returnValue.mass = this.mass;
        return returnValue;
    }
    cleanUp() {
        if (this.mass == null)
            this.mass = BlueprintItemElement.defaultMass;
        super.cleanUp();
    }
    cameraChanged(camera) {
        //super.cameraChanged(camera);
        this.isOpaque = (camera.overlay == overlay_1.Overlay.Gas || camera.overlay == overlay_1.Overlay.Base);
        // TODO use enum
        if (camera.overlay == overlay_1.Overlay.Gas)
            this.depth = 17 + 50;
        else
            this.depth = 17;
        this.alpha = 1;
        for (let drawPart of this.drawParts) {
            drawPart.visible = false;
            // TODO boolean in export
            // TODO Refactor most of this
            if (this.buildableElements[0].hasTag('Gas') && camera.display == display_1.Display.solid && (camera.overlay == overlay_1.Overlay.Base || camera.overlay == overlay_1.Overlay.Gas)) {
                if (drawPart.hasTag(sprite_tag_1.SpriteTag.element_back)) {
                    drawPart.visible = true;
                    drawPart.zIndex = 0;
                    drawPart.alpha = 0.5;
                    // We use visualization tint here because this could be modulated by the selection
                    if (camera.visualization == visualization_1.Visualization.temperature)
                        this.visualizationTint = draw_helpers_1.DrawHelpers.temperatureToColor(this.temperature);
                    else
                        this.visualizationTint = this.buildableElements[0].uiColor;
                    drawPart.tint = this.visualizationTint;
                }
                else if (drawPart.hasTag(sprite_tag_1.SpriteTag.element_gas_front)) {
                    drawPart.visible = true;
                    drawPart.zIndex = 1;
                    drawPart.alpha = 0.8;
                    drawPart.tint = 0xffffff;
                }
            }
            else if (this.buildableElements[0].hasTag('Liquid') && camera.display == display_1.Display.solid && (camera.overlay == overlay_1.Overlay.Base || camera.overlay == overlay_1.Overlay.Liquid)) {
                if (drawPart.hasTag(sprite_tag_1.SpriteTag.element_back)) {
                    drawPart.visible = true;
                    drawPart.zIndex = 0;
                    drawPart.alpha = 0.5;
                    if (camera.visualization == visualization_1.Visualization.temperature)
                        this.visualizationTint = draw_helpers_1.DrawHelpers.temperatureToColor(this.temperature);
                    else
                        this.visualizationTint = this.buildableElements[0].uiColor;
                    drawPart.tint = this.visualizationTint;
                }
                else if (drawPart.hasTag(sprite_tag_1.SpriteTag.element_liquid_front)) {
                    drawPart.visible = true;
                    drawPart.zIndex = 1;
                    drawPart.alpha = 0.8;
                    drawPart.tint = 0xffffff;
                }
            }
            else if (this.buildableElements[0].hasTag('Vacuum') && camera.display == display_1.Display.solid && (camera.overlay == overlay_1.Overlay.Base || camera.overlay == overlay_1.Overlay.Gas)) {
                if (drawPart.hasTag(sprite_tag_1.SpriteTag.element_vacuum_front)) {
                    drawPart.visible = true;
                    drawPart.zIndex = 1;
                    drawPart.alpha = 0.8;
                    drawPart.tint = 0xffffff;
                }
            }
        }
    }
    modulateSelectedTint(camera) {
        if (camera.display == display_1.Display.solid) {
            for (let drawPart of this.drawParts) {
                // TODO maybe the gas and liquid element should have different tintable backs? fine for now
                if (drawPart.hasTag(sprite_tag_1.SpriteTag.element_back) && drawPart.visible && this.visualizationTint != -1) {
                    drawPart.tint = draw_helpers_1.DrawHelpers.blendColor(this.visualizationTint, 0x4CFF00, camera.sinWave);
                }
            }
        }
    }
}
exports.BlueprintItemElement = BlueprintItemElement;
BlueprintItemElement.defaultMass = 0;
