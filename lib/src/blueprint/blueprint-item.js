"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildCandidateResult = exports.BlueprintItem = void 0;
const vector2_1 = require("../vector2");
const draw_helpers_1 = require("../drawing/draw-helpers");
const b_element_1 = require("../b-export/b-element");
const b_ui_screen_1 = require("../b-export/b-ui-screen");
const orientation_1 = require("../enums/orientation");
const oni_item_1 = require("../oni-item");
const draw_part_1 = require("../drawing/draw-part");
const sprite_tag_1 = require("../enums/sprite-tag");
const overlay_1 = require("../enums/overlay");
const display_1 = require("../enums/display");
const visualization_1 = require("../enums/visualization");
const utility_connection_1 = require("../utility-connection");
const sprite_info_1 = require("../drawing/sprite-info");
class BlueprintItem {
    get temperatureCelcius() { return this.temperature - 273.15; }
    set temperatureCelcius(value) { this.temperature = value + 273.15; }
    get temperatureScale() { return draw_helpers_1.DrawHelpers.temperatureToScale(this.temperature); }
    set temperatureScale(value) { this.temperature = draw_helpers_1.DrawHelpers.scaleToTemperature(value); }
    get header() { return this.oniItem.name; }
    getUiSettings(id) {
        for (let uiSave of this.uiSaveSettings)
            if (uiSave.id == id)
                return uiSave;
        return undefined;
        //throw new Error('BlueprintItem.getUiSettings : uiSave id ('+id+') not found');
    }
    setElement(elementId, index) {
        if (this.buildableElements == null)
            this.buildableElements = [];
        this.buildableElements[index] = b_element_1.BuildableElement.getElement(elementId);
        this.reloadCamera = true;
    }
    get selected() { return this.selected_; }
    set selected(value) {
        this.selected_ = value;
        if (!this.selected)
            this.reloadCamera = true;
    }
    constructor(id = 'Vacuum') {
        this.temperature = BlueprintItem.defaultTemperature;
        this.buildableElements = [];
        this.uiSaveSettings = [];
        // Each template item should remember where it was added, to make removal easier
        this.tileIndexes = [];
        this.selected_ = false;
        this.isBuildCandidate = false;
        this.buildCandidateResult = new BuildCandidateResult();
        // TODO getter setter with prepare bounding box
        this.position = new vector2_1.Vector2();
        this.orientation = orientation_1.Orientation.Neutral;
        this.rotation = 0;
        this.scale = vector2_1.Vector2.one();
        this.topLeft = new vector2_1.Vector2();
        this.bottomRight = new vector2_1.Vector2();
        this.drawParts = [];
        this.depth = 0;
        this.alpha = 0;
        this.visible = false;
        this.tileable = [false, false, false, false];
        this.updateTileableParts = false;
        // This is used by the selection tool to prioritize opaque buildings during selection
        // TODO probably not used anymore, could delete
        this.isOpaque = false;
        this.visualizationTint = -1;
        // Pixi stuff
        this.utilitySprites = [];
        this.containerCreated = false;
        this.reloadCamera = true;
        this.destroyed = false;
        this.id = id;
        this.oniItem = oni_item_1.OniItem.getOniItem(this.id);
    }
    getName() {
        return this.id;
    }
    getDebug1() {
        //return '';
        let debug = {};
        debug.topLeft = this.topLeft;
        return JSON.stringify(debug);
    }
    getDebug2() {
        //return '';
        let debug = {};
        debug.bottomRight = this.bottomRight;
        return JSON.stringify(debug);
    }
    getDebug3() {
        return '';
        let debug = {};
        //if (this.realSpriteModifier != null && this.realSpriteModifier.getLastPart() != null)
        //  debug.scale = this.realSpriteModifier.getLastPart().scale;
        //debug.framebboxMax = this.realSpriteModifier.framebboxMax;
        return JSON.stringify(debug);
    }
    getDebug4() {
        return '';
        let debug = {};
        //if (this.realSpriteModifier != null)
        //debug.framebboxMin = this.realSpriteModifier.framebboxMin;
        //debug.framebboxMax = this.realSpriteModifier.framebboxMax;
        return JSON.stringify(debug);
    }
    getDebug5() {
        return '';
        let debug = {};
        //if (this.realSpriteModifier != null)
        //debug.framebboxMax = this.realSpriteModifier.framebboxMax;
        //debug.framebboxMax = this.realSpriteModifier.framebboxMax;
        return JSON.stringify(debug);
    }
    importOniBuilding(building) {
        this.position = new vector2_1.Vector2(building.location_x == null ? 0 : building.location_x, building.location_y == null ? 0 : building.location_y);
        switch (building.rotationOrientation) {
            case 'R90':
                this.changeOrientation(orientation_1.Orientation.R90);
                break;
            case 'R180':
                this.changeOrientation(orientation_1.Orientation.R180);
                break;
            case 'R270':
                this.changeOrientation(orientation_1.Orientation.R270);
                break;
            case 'FlipH':
                this.changeOrientation(orientation_1.Orientation.FlipH);
                break;
            case 'FlipV':
                this.changeOrientation(orientation_1.Orientation.FlipV);
                break;
        }
        this.setElement(building.element, 0);
        this.temperature = Math.floor(building.temperature);
        this.cleanUp();
        this.prepareBoundingBox();
        this.innerYaml = building;
    }
    importBniBuilding(building) {
        if (building.offset != null)
            this.position = new vector2_1.Vector2(building.offset.x == null ? 0 : building.offset.x, building.offset.y == null ? 0 : building.offset.y);
        else
            this.position = vector2_1.Vector2.zero();
        this.changeOrientation(building.orientation);
        this.cleanUp();
        this.prepareBoundingBox();
    }
    importMdbBuilding(original) {
        let position = vector2_1.Vector2.clone(original.position);
        if (position == null)
            position = vector2_1.Vector2.zero();
        this.position = position;
        if (original.elements != null && original.elements.length > 0)
            for (let indexElement = 0; indexElement < original.elements.length; indexElement++)
                if (original.elements[indexElement] != null)
                    this.setElement(original.elements[indexElement], indexElement);
                else
                    this.setElement(this.oniItem.defaultElement[indexElement].id, indexElement);
        if (original.settings != null && original.settings.length > 0) {
            this.uiSaveSettings = [];
            for (let setting of original.settings)
                this.uiSaveSettings.push(b_ui_screen_1.UiSaveSettings.clone(setting));
        }
        // TODO default temperature
        if (original.temperature == undefined)
            this.temperature = BlueprintItem.defaultTemperature;
        else
            this.temperature = original.temperature;
        this.changeOrientation(original.orientation);
        this.cleanUp();
        this.prepareBoundingBox();
    }
    updateRotationScale() {
        switch (this.orientation) {
            case orientation_1.Orientation.R90:
                this.rotation = 90;
                this.scale = vector2_1.Vector2.One;
                break;
            case orientation_1.Orientation.R180:
                this.rotation = 180;
                this.scale = vector2_1.Vector2.One;
                break;
            case orientation_1.Orientation.R270:
                this.rotation = 270;
                this.scale = vector2_1.Vector2.One;
                break;
            case orientation_1.Orientation.FlipH:
                this.rotation = 0;
                this.scale = new vector2_1.Vector2(-1, 1);
                break;
            case orientation_1.Orientation.FlipV:
                this.rotation = 0;
                this.scale = new vector2_1.Vector2(1, -1);
                break;
            case orientation_1.Orientation.Neutral:
            default:
                this.rotation = 0;
                this.scale = vector2_1.Vector2.One;
                break;
        }
        this.prepareBoundingBox();
    }
    nextOrientation() {
        let indexCurrentOrientation = this.oniItem.orientations.indexOf(this.orientation);
        indexCurrentOrientation = (indexCurrentOrientation + 1) % this.oniItem.orientations.length;
        this.changeOrientation(this.oniItem.orientations[indexCurrentOrientation]);
    }
    changeOrientation(newOrientation) {
        if (newOrientation == undefined)
            this.orientation = orientation_1.Orientation.Neutral;
        else
            this.orientation = newOrientation;
        this.updateRotationScale();
    }
    cleanUp() {
        if (this.rotation == null)
            this.rotation = BlueprintItem.defaultRotation;
        if (this.scale == null)
            this.scale = BlueprintItem.defaultScale;
        if (this.temperature == null)
            this.temperature = BlueprintItem.defaultTemperature;
        if (this.buildableElements == null)
            this.buildableElements = [];
        for (let indexElement = 0; indexElement < this.oniItem.buildableElementsArray.length; indexElement++)
            if (this.buildableElements[indexElement] == null)
                this.setElement(this.oniItem.defaultElement[indexElement].id, indexElement);
        if (this.uiSaveSettings == null)
            this.uiSaveSettings = [];
        for (let uiScreen of this.oniItem.uiScreens) {
            if (this.getUiSettings(uiScreen.id) == undefined) {
                let newSaveSettings = new b_ui_screen_1.UiSaveSettings(uiScreen.id);
                for (let indexValue = 0; indexValue < uiScreen.inputs.length; indexValue++) {
                    newSaveSettings.values[indexValue] = uiScreen.getDefaultValue(indexValue);
                }
                this.uiSaveSettings.push(newSaveSettings);
            }
        }
        if (this.orientation == null || this.orientation == orientation_1.Orientation.Neutral)
            this.changeOrientation(orientation_1.Orientation.Neutral);
        this.selected_ = false;
        this.tileable = [false, false, false, false];
        this.drawParts = [];
        let drawPartIndex = 0;
        for (let spriteModifier of this.oniItem.spriteGroup.spriteModifiers) {
            if (spriteModifier.tags.indexOf(sprite_tag_1.SpriteTag.ui) == -1) {
                let newDrawPart = new draw_part_1.DrawPart();
                newDrawPart.zIndex = 1 - (drawPartIndex / (this.oniItem.spriteGroup.spriteModifiers.length * 2));
                if (spriteModifier.tags.indexOf(sprite_tag_1.SpriteTag.white) != -1)
                    newDrawPart.zIndex = 1;
                newDrawPart.spriteModifier = spriteModifier;
                newDrawPart.visible = false;
                this.drawParts.push(newDrawPart);
            }
            drawPartIndex++;
        }
    }
    toMdbBuilding() {
        let returnValue = {
            id: this.id
        };
        let position = vector2_1.Vector2.clone(this.position);
        if (position == null)
            position = new vector2_1.Vector2(0, 0);
        returnValue.position = position;
        if (this.temperature != BlueprintItem.defaultTemperature)
            returnValue.temperature = this.temperature;
        let elements = [];
        let exportElements = false;
        for (let indexElement = 0; indexElement < this.buildableElements.length; indexElement++)
            if (this.buildableElements[indexElement] != this.oniItem.defaultElement[indexElement]) {
                elements[indexElement] = this.buildableElements[indexElement].id;
                exportElements = true;
            }
        if (exportElements)
            returnValue.elements = elements;
        if (this.uiSaveSettings.length > 0) {
            returnValue.settings = [];
            for (let setting of this.uiSaveSettings) {
                returnValue.settings.push(b_ui_screen_1.UiSaveSettings.clone(setting));
            }
        }
        if (this.orientation != orientation_1.Orientation.Neutral)
            returnValue.orientation = this.orientation;
        return returnValue;
    }
    toBniBuilding() {
        let returnValue = {
            buildingdef: this.id,
            flags: 0,
            offset: new vector2_1.Vector2(this.position.x, this.position.y),
            orientation: this.orientation,
            selected_elements: this.getSelectedElementsTag()
        };
        return returnValue;
    }
    getSelectedElementsTag() {
        let returnValue = [];
        for (let element of this.buildableElements)
            returnValue.push(element.tag);
        return returnValue;
    }
    prepareBoundingBox() {
        let realSize = this.oniItem.size;
        if (vector2_1.Vector2.Zero.equals(realSize))
            realSize = vector2_1.Vector2.One;
        let originalTopLeft = new vector2_1.Vector2(this.position.x + this.oniItem.tileOffset.x, this.position.y + this.oniItem.tileOffset.y + realSize.y - 1);
        let orignialBottomRight = new vector2_1.Vector2(originalTopLeft.x + realSize.x - 1, originalTopLeft.y - realSize.y + 1);
        let rotatedTopLeft = draw_helpers_1.DrawHelpers.rotateVector2(originalTopLeft, this.position, this.rotation);
        let rotatedBottomRight = draw_helpers_1.DrawHelpers.rotateVector2(orignialBottomRight, this.position, this.rotation);
        let flippedTopLeft = draw_helpers_1.DrawHelpers.scaleVector2(rotatedTopLeft, this.position, this.scale);
        let flippedBottomRight = draw_helpers_1.DrawHelpers.scaleVector2(rotatedBottomRight, this.position, this.scale);
        this.topLeft = new vector2_1.Vector2(flippedTopLeft.x < flippedBottomRight.x ? flippedTopLeft.x : flippedBottomRight.x, flippedTopLeft.y > flippedBottomRight.y ? flippedTopLeft.y : flippedBottomRight.y);
        this.bottomRight = new vector2_1.Vector2(flippedTopLeft.x > flippedBottomRight.x ? flippedTopLeft.x : flippedBottomRight.x, flippedTopLeft.y < flippedBottomRight.y ? flippedTopLeft.y : flippedBottomRight.y);
        this.tileIndexes = [];
        for (let x = this.topLeft.x; x <= this.bottomRight.x; x++)
            for (let y = this.topLeft.y; y >= this.bottomRight.y; y--)
                this.tileIndexes.push(draw_helpers_1.DrawHelpers.getTileIndex(new vector2_1.Vector2(x, y)));
        //console.log(this.tileIndexes); 
    }
    updateTileables(blueprint) {
        for (let i = 0; i < 4; i++)
            this.tileable[i] = false;
        // TODO fix beach chair
        if (this.oniItem.tileableLeftRight) {
            if (blueprint.getBlueprintItemsAt(new vector2_1.Vector2(this.position.x - 1, this.position.y)).filter(b => b.id == this.id).length > 0)
                this.tileable[0] = true;
            if (blueprint.getBlueprintItemsAt(new vector2_1.Vector2(this.position.x + 1, this.position.y)).filter(b => b.id == this.id).length > 0)
                this.tileable[1] = true;
            this.updateTileableParts = true;
        }
        if (this.oniItem.tileableTopBottom) {
            if (blueprint.getBlueprintItemsAt(new vector2_1.Vector2(this.position.x, this.position.y + 1)).filter(b => b.id == this.id).length > 0)
                this.tileable[2] = true;
            if (blueprint.getBlueprintItemsAt(new vector2_1.Vector2(this.position.x, this.position.y - 1)).filter(b => b.id == this.id).length > 0)
                this.tileable[3] = true;
            this.updateTileableParts = true;
        }
    }
    // This is used by the build tool, TODO something cleaner
    setInvisible() {
        this.position = new vector2_1.Vector2(-99999, -99999);
    }
    cameraChanged(camera) {
        // Special case : we show the buildings in element mode
        // TODO general case for elements
        if (camera.overlay == overlay_1.Overlay.Unknown)
            overlay_1.Overlay.Base;
        this.isOpaque = this.oniItem.isOverlayPrimary(camera.overlay) || this.oniItem.isOverlaySecondary(camera.overlay);
        if (this.isOpaque)
            this.alpha = 1;
        else
            this.alpha = 0.3;
        if (this.oniItem.isOverlayPrimary(camera.overlay))
            this.depth = this.oniItem.zIndex + 100;
        else if (this.oniItem.isOverlaySecondary(camera.overlay))
            this.depth = this.oniItem.zIndex + 50;
        else
            this.depth = this.oniItem.zIndex;
        if (this.isBuildCandidate)
            this.depth = 199;
        this.visualizationTint = -1;
        for (let drawPart of this.drawParts) {
            drawPart.prepareVisibilityBasedOnDisplay(camera.display);
            drawPart.tint = 0xFFFFFF;
            drawPart.alpha = 1;
            drawPart.makeInvisibileIfHasTag(sprite_tag_1.SpriteTag.white);
            if (this.isOpaque && (this.oniItem.isWire || this.oniItem.isBridge)) {
                if (drawPart.hasTag(sprite_tag_1.SpriteTag.white)) {
                    drawPart.visible = true;
                    drawPart.zIndex = 1;
                    this.visualizationTint = this.oniItem.backColor;
                    drawPart.alpha = 0.7;
                }
                if (camera.display == display_1.Display.blueprint) {
                    drawPart.makeInvisibileIfHasTag(sprite_tag_1.SpriteTag.place);
                    drawPart.makeVisibileIfHasTag(sprite_tag_1.SpriteTag.solid);
                }
            }
            if (camera.visualization == visualization_1.Visualization.temperature) {
                if (drawPart.hasTag(sprite_tag_1.SpriteTag.white)) {
                    drawPart.visible = true;
                    drawPart.zIndex = 1;
                    this.visualizationTint = draw_helpers_1.DrawHelpers.temperatureToColor(this.temperature);
                    drawPart.alpha = 0.7;
                }
            }
            if (camera.visualization == visualization_1.Visualization.elements) {
                if (drawPart.hasTag(sprite_tag_1.SpriteTag.white)) {
                    drawPart.visible = true;
                    drawPart.zIndex = 1;
                    this.visualizationTint = this.buildableElements[0].color;
                    drawPart.alpha = 0.8;
                }
            }
            if (drawPart.hasTag(sprite_tag_1.SpriteTag.white)) {
                drawPart.tint = this.visualizationTint;
            }
            this.applyTileablesToDrawPart(drawPart);
        }
    }
    modulateBuildCandidateTint(camera) {
        for (let drawPart of this.drawParts) {
            if (camera.display == display_1.Display.solid) {
                if (drawPart.hasTag(sprite_tag_1.SpriteTag.white)) {
                    if (this.buildCandidateResult.canBuild) {
                        drawPart.visible = false;
                    }
                    else {
                        drawPart.visible = true;
                        drawPart.zIndex = 1;
                        drawPart.tint = 0xEF0000;
                        drawPart.alpha = 0.7;
                    }
                }
            }
            else if (camera.display == display_1.Display.blueprint) {
                if (drawPart.hasTag(sprite_tag_1.SpriteTag.place)) {
                    if (this.buildCandidateResult.canBuild) {
                        drawPart.tint = 0xFFFFFF;
                    }
                    else {
                        drawPart.tint = 0xEA3333;
                    }
                }
                else if (drawPart.hasTag(sprite_tag_1.SpriteTag.white)) {
                    if (this.buildCandidateResult.canBuild) {
                        drawPart.tint = this.oniItem.backColor;
                    }
                    else {
                        drawPart.tint = 0xEA3333;
                    }
                }
            }
            this.applyTileablesToDrawPart(drawPart);
        }
    }
    modulateSelectedTint(camera) {
        for (let drawPart of this.drawParts) {
            if (camera.display == display_1.Display.solid) {
                if (drawPart.hasTag(sprite_tag_1.SpriteTag.white)) {
                    if (this.visualizationTint != -1) {
                        // If the drawPart is visible, we assume the code before already set the correct values, and we just modulate the tint
                        drawPart.tint = draw_helpers_1.DrawHelpers.blendColor(this.visualizationTint, 0x4CFF00, camera.sinWave);
                    }
                    else {
                        drawPart.visible = true;
                        drawPart.zIndex = 1;
                        drawPart.tint = 0x4CFF00;
                        drawPart.alpha = camera.sinWave * 0.8;
                    }
                }
            }
            else if (camera.display == display_1.Display.blueprint) {
                if (drawPart.hasTag(sprite_tag_1.SpriteTag.place)) {
                    drawPart.tint = draw_helpers_1.DrawHelpers.blendColor(drawPart.tint, 0x4CFF00, camera.sinWave);
                }
                else if (drawPart.hasTag(sprite_tag_1.SpriteTag.white)) {
                    drawPart.tint = draw_helpers_1.DrawHelpers.blendColor(drawPart.tint, 0x4CFF00, camera.sinWave);
                }
            }
            this.applyTileablesToDrawPart(drawPart);
        }
    }
    applyTileablesToDrawPart(drawPart) {
        if (this.tileable[0])
            drawPart.makeInvisibileIfHasTag(sprite_tag_1.SpriteTag.tileable_left);
        if (this.tileable[1])
            drawPart.makeInvisibileIfHasTag(sprite_tag_1.SpriteTag.tileable_right);
        if (this.tileable[2])
            drawPart.makeInvisibileIfHasTag(sprite_tag_1.SpriteTag.tileable_up);
        if (this.tileable[3])
            drawPart.makeInvisibileIfHasTag(sprite_tag_1.SpriteTag.tileable_down);
    }
    drawPixi(camera, pixiUtil) {
        this.drawPixiUtility(camera, pixiUtil);
        if (this.reloadCamera) {
            this.cameraChanged(camera);
            this.reloadCamera = false;
        }
        if (this.updateTileableParts) {
            for (let drawPart of this.drawParts)
                this.applyTileablesToDrawPart(drawPart);
            this.updateTileableParts = false;
        }
        if (this.selected)
            this.modulateSelectedTint(camera);
        if (this.isBuildCandidate)
            this.modulateBuildCandidateTint(camera);
        // Create the container
        if (!this.containerCreated) {
            this.container = pixiUtil.getNewContainer();
            //this.container.sortableChildren = true;
            camera.addToContainer(this.container);
            this.containerCreated = true;
            for (let drawPart of this.drawParts)
                drawPart.prepareSprite(this.container, this.oniItem, pixiUtil);
        }
        let sizeCorrected = new vector2_1.Vector2(camera.currentZoom / 100 * 1, camera.currentZoom / 100 * 1);
        let positionCorrected = new vector2_1.Vector2((this.position.x + camera.cameraOffset.x + 0.5) * camera.currentZoom, (-this.position.y + camera.cameraOffset.y + 0.5) * camera.currentZoom);
        // If the texture has not loaded, draw a debug rectangle
        // TODO draw debug until all drawParts are ready
        //if (!sprite.texture.baseTexture.valid) this.drawPixiDebug(camera, drawPixi, positionCorrected);
        // Debug
        //this.drawPixiDebug(camera, drawPixi, positionCorrected);
        this.container.x = positionCorrected.x;
        this.container.y = positionCorrected.y;
        //this.container.x = Math.floor(this.container.x);
        //this.container.y = Math.floor(this.container.y);
        this.container.scale.x = this.scale.x * sizeCorrected.x;
        this.container.scale.y = this.scale.y * sizeCorrected.y;
        this.container.angle = this.rotation;
        // Overlay stuff
        this.container.zIndex = this.depth;
        this.container.alpha = this.alpha;
    }
    drawPixiUtility(camera, pixiUtil) {
        if (this.utilitySprites == null)
            this.utilitySprites = [];
        for (let connexionIndex = 0; connexionIndex < this.oniItem.utilityConnections.length; connexionIndex++) {
            let connection = this.oniItem.utilityConnections[connexionIndex];
            //console.log(camera.overlay)
            // Pass to the next connection if this one should not be displayed on this overlay
            if (camera.overlay != utility_connection_1.ConnectionHelper.getConnectionOverlay(connection.type)) {
                // First we disable the sprites if they are created, then we move on the the next connection
                if (this.utilitySprites[connexionIndex] != null)
                    this.utilitySprites[connexionIndex].visible = false;
                continue;
            }
            else if (this.utilitySprites[connexionIndex] != null)
                this.utilitySprites[connexionIndex].visible = true;
            let connectionPosition = draw_helpers_1.DrawHelpers.rotateVector2(connection.offset, vector2_1.Vector2.Zero, this.rotation);
            connectionPosition = draw_helpers_1.DrawHelpers.scaleVector2(connectionPosition, vector2_1.Vector2.Zero, this.scale);
            let drawPos = new vector2_1.Vector2((this.position.x + connectionPosition.x + camera.cameraOffset.x + 0.25) * camera.currentZoom, (-this.position.y - connectionPosition.y + camera.cameraOffset.y + 0.25) * camera.currentZoom);
            let drawSize = new vector2_1.Vector2(0.5 * camera.currentZoom, 0.5 * camera.currentZoom);
            let connectionSprite = utility_connection_1.ConnectionHelper.getConnectionSprite(connection);
            let tint = connectionSprite.color;
            if (this.utilitySprites[connexionIndex] == null) {
                let connectionSpriteInfo = sprite_info_1.SpriteInfo.getSpriteInfo(connectionSprite.spriteInfoId);
                if (connectionSpriteInfo != null) {
                    let connectionTexture = connectionSpriteInfo.getTexture(pixiUtil);
                    if (connectionTexture != null) {
                        this.utilitySprites[connexionIndex] = pixiUtil.getSpriteFrom(connectionTexture);
                        this.utilitySprites[connexionIndex].tint = tint;
                        this.utilitySprites[connexionIndex].zIndex = 200;
                        camera.addToContainer(this.utilitySprites[connexionIndex]);
                    }
                }
            }
            // TODO correct sizes pour incons
            if (this.utilitySprites[connexionIndex] != null) {
                this.utilitySprites[connexionIndex].x = drawPos.x;
                this.utilitySprites[connexionIndex].y = drawPos.y;
                this.utilitySprites[connexionIndex].width = drawSize.x;
                this.utilitySprites[connexionIndex].height = drawSize.y;
                if (!this.utilitySprites[connexionIndex].texture.baseTexture.valid) {
                    /* TODO Add colored squares event if the images have not yet loaded
                    let delta = 0.25;
                    let rectanglePosition = new Vector2(
                      this.position.x + connectionPosition.x + 0.5,
                      this.position.y + connectionPosition.y - 0.5
                    );
                    drawPixi.drawTileRectangle(camera,
                      new Vector2(rectanglePosition.x - delta, rectanglePosition.y + delta),
                      new Vector2(rectanglePosition.x + delta, rectanglePosition.y - delta),
                      true, 2, tint, 0, 1, 1);
                      */
                }
            }
            //drawPixi.FillRect(0xFFFF00, drawPos.x, drawPos.y, drawSize.x, drawSize.y)
        }
    }
    /*
    // TODO Add debug drwaing if the image has not loaded yet
    private drawPixiDebug(camera: CameraService, drawPixi: DrawPixi, positionCorrected: Vector2)
    {
      let delta = 0.2;
      drawPixi.drawTileRectangle(
        camera,
        new Vector2(this.topLeft.x + delta, this.topLeft.y + 0 - delta),
        new Vector2(this.bottomRight.x + 1 - delta, this.bottomRight.y - 1 + delta),
        false,
        2,
        0xFF0000,
        0x000000,
        0.5,
        0.5
      );
  
      
      drawPixi.backGraphics.lineStyle(2, 0x000000, 1);
      drawPixi.backGraphics.moveTo(positionCorrected.x - 5, positionCorrected.y);
      drawPixi.backGraphics.lineTo(positionCorrected.x + 5, positionCorrected.y);
      drawPixi.backGraphics.moveTo(positionCorrected.x, positionCorrected.y - 5);
      drawPixi.backGraphics.lineTo(positionCorrected.x, positionCorrected.y + 5);
    }
    */
    sortChildren() {
        if (this.container != null)
            this.container.sortChildren();
    }
    destroy() {
        // Return if this is already destoryed
        if (this.destroyed) {
            return;
        }
        // Destroy the main sprite
        if (this.container != null)
            this.container.destroy({ baseTexture: false, texture: false, children: true });
        // And the utility sprites
        if (this.utilitySprites != null)
            for (let s of this.utilitySprites)
                if (s != null)
                    s.destroy();
        this.destroyed = true;
    }
}
exports.BlueprintItem = BlueprintItem;
BlueprintItem.defaultRotation = 0;
BlueprintItem.defaultScale = vector2_1.Vector2.One;
BlueprintItem.defaultTemperature = 30 + 273.15;
class BuildCandidateResult {
    constructor() {
        this.canBuild = true;
        this.cantBuildReason = '';
    }
}
exports.BuildCandidateResult = BuildCandidateResult;
