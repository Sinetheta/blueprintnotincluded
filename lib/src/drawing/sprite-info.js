"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vector2_1 = require("../vector2");
const draw_helpers_1 = require("./draw-helpers");
const image_source_1 = require("./image-source");
class SpriteInfo {
    constructor(spriteInfoId) {
        this.imageId = '';
        // New stuff
        this.uvMin = new vector2_1.Vector2();
        this.uvSize = new vector2_1.Vector2();
        this.realSize = new vector2_1.Vector2();
        this.pivot = new vector2_1.Vector2();
        this.isIcon = false;
        this.isInputOutput = false;
        this.spriteInfoId = spriteInfoId;
        this.cleanUp();
    }
    cleanUp() {
    }
    // Keys is used for some repack stuff
    static get keys() { return Array.from(SpriteInfo.spriteInfosMap.keys()); }
    static get spriteInfos() { return Array.from(SpriteInfo.spriteInfosMap.values()); }
    static init() {
        SpriteInfo.spriteInfosMap = new Map();
    }
    static load(uiSprites) {
        for (let uiSprite of uiSprites) {
            let newUiSpriteInfo = new SpriteInfo(uiSprite.name);
            newUiSpriteInfo.copyFrom(uiSprite);
            let imageUrl = draw_helpers_1.DrawHelpers.createUrl(newUiSpriteInfo.imageId, false);
            image_source_1.ImageSource.AddImagePixi(newUiSpriteInfo.imageId, imageUrl);
            SpriteInfo.addSpriteInfo(newUiSpriteInfo);
        }
    }
    // TODO should this be here?
    static addSpriteInfoArray(sourceArray) {
        for (let sOriginal of sourceArray) {
            let spriteInfo = new SpriteInfo(sOriginal.name);
            spriteInfo.copyFrom(sOriginal);
            SpriteInfo.addSpriteInfo(spriteInfo);
        }
    }
    static addSpriteInfo(spriteInfo) {
        SpriteInfo.spriteInfosMap.set(spriteInfo.spriteInfoId, spriteInfo);
    }
    copyFrom(original) {
        // TODO refactor
        // DO NOT FORGET : if you add something here, you must add it to the texture repacker also
        let imageUrl = draw_helpers_1.DrawHelpers.createUrl(original.textureName, false);
        image_source_1.ImageSource.AddImagePixi(original.textureName, imageUrl);
        this.imageId = original.textureName;
        let uvMin = vector2_1.Vector2.clone(original.uvMin);
        if (uvMin == null)
            uvMin = new vector2_1.Vector2();
        this.uvMin = uvMin;
        let uvSize = vector2_1.Vector2.clone(original.uvSize);
        if (uvSize == null)
            uvSize = new vector2_1.Vector2();
        this.uvSize = uvSize;
        let realSize = vector2_1.Vector2.clone(original.realSize);
        if (realSize == null)
            realSize = new vector2_1.Vector2();
        this.realSize = realSize;
        let pivot = vector2_1.Vector2.clone(original.pivot);
        if (pivot == null)
            pivot = new vector2_1.Vector2();
        this.pivot = pivot;
        this.isIcon = original.isIcon;
        this.isInputOutput = original.isInputOutput;
    }
    static getSpriteInfo(spriteInfoId) {
        let returnValue = SpriteInfo.spriteInfosMap.get(spriteInfoId);
        if (returnValue != undefined)
            return returnValue;
        throw new Error('SpriteInfo.getSpriteInfo : Not found');
    }
    getTexture(pixiUtil) {
        if (this.texture == null) {
            let baseTex = image_source_1.ImageSource.getBaseTexture(this.imageId, pixiUtil);
            if (baseTex == null)
                return null;
            let rectangle = pixiUtil.getNewRectangle(this.uvMin.x, this.uvMin.y, this.uvSize.x, this.uvSize.y);
            this.texture = pixiUtil.getNewTexture(baseTex, rectangle);
        }
        return this.texture;
    }
    getTextureWithBleed(bleed, realBleed = new vector2_1.Vector2(), pixiUtil) {
        let baseTex = image_source_1.ImageSource.getBaseTexture(this.imageId, pixiUtil);
        if (baseTex == null)
            return null;
        let rectangle = pixiUtil.getNewRectangle(this.uvMin.x - bleed, this.uvMin.y - bleed, this.uvSize.x + bleed * 2, this.uvSize.y + bleed * 2);
        if (rectangle.x < 0)
            rectangle.x = 0;
        if (rectangle.y < 0)
            rectangle.y = 0;
        if (rectangle.x + rectangle.width > baseTex.width)
            rectangle.width = baseTex.width - rectangle.x;
        if (rectangle.y + rectangle.height > baseTex.height)
            rectangle.height = baseTex.height - rectangle.y;
        realBleed.x = this.uvMin.x - rectangle.x;
        realBleed.y = this.uvMin.y - rectangle.y;
        return pixiUtil.getNewTexture(baseTex, rectangle);
    }
}
exports.SpriteInfo = SpriteInfo;
