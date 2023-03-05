"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrawPartType = exports.DrawPart = void 0;
const sprite_info_1 = require("./sprite-info");
const vector2_1 = require("../vector2");
const display_1 = require("../enums/display");
const sprite_tag_1 = require("../enums/sprite-tag");
class DrawPart {
    get alpha() { return this.alpha_; }
    set alpha(value) {
        if (this.sprite != null)
            this.sprite.alpha = value;
        this.alpha_ = value;
    }
    get tint() { return this.tint_; }
    set tint(value) {
        if (this.sprite != null)
            this.sprite.tint = value;
        this.tint_ = value;
    }
    get zIndex() { return this.zIndex_; }
    set zIndex(value) {
        if (this.sprite != null)
            this.sprite.zIndex = value;
        this.zIndex_ = value;
    }
    get visible() { return this.visible_; }
    set visible(value) {
        if (this.sprite != null)
            this.sprite.visible = value;
        this.visible_ = value;
    }
    constructor() {
        this.alpha_ = 0;
        this.tint_ = 0;
        this.zIndex_ = 0;
        this.visible_ = false;
        this.isReady = false;
        this.alpha = 1;
        this.tint = 0xFFFFFF;
    }
    prepareSprite(container /*PIXI.Container*/, oniItem, pixiUtil) {
        if (!this.isReady) {
            if (this.spriteModifier != null)
                this.spriteInfo = sprite_info_1.SpriteInfo.getSpriteInfo(this.spriteModifier.spriteInfoName);
            let texture; // PIXI.Texture;
            if (this.spriteInfo != null)
                texture = this.spriteInfo.getTexture(pixiUtil);
            if (texture != null) {
                // TODO Invert pivoTY in export
                this.sprite = pixiUtil.getSpriteFrom(texture);
                //if (!this.sprite.texture.baseTexture.valid) console.log('not valid')
                this.sprite.anchor.set(this.spriteInfo.pivot.x, 1 - this.spriteInfo.pivot.y);
                this.sprite.alpha = this.alpha;
                this.sprite.tint = this.tint;
                this.sprite.zIndex = this.zIndex;
                this.sprite.visible = this.visible;
                let tileOffset = new vector2_1.Vector2(oniItem.size.x % 2 == 0 ? 50 : 0, -50);
                // TODO invert translation in export
                this.sprite.x = 0 + (this.spriteModifier.translation.x + tileOffset.x);
                this.sprite.y = 0 - (this.spriteModifier.translation.y + tileOffset.y);
                this.sprite.scale.x = 1;
                this.sprite.scale.y = 1;
                this.sprite.width = this.spriteInfo.realSize.x;
                this.sprite.height = this.spriteInfo.realSize.y;
                this.sprite.scale.x *= this.spriteModifier.scale.x;
                this.sprite.scale.y *= this.spriteModifier.scale.y;
                // TODO invert rotation in export
                this.sprite.angle = -this.spriteModifier.rotation;
                container.addChild(this.sprite);
                this.isReady = true;
            }
        }
    }
    hasTag(tag) {
        return this.spriteModifier.hasTag(tag);
    }
    prepareVisibilityBasedOnDisplay(newDisplay) {
        let tagFilter = newDisplay == display_1.Display.blueprint ? sprite_tag_1.SpriteTag.place : sprite_tag_1.SpriteTag.solid;
        if (this.spriteModifier == null)
            this.visible = false;
        else if (!this.hasTag(tagFilter))
            this.visible = false;
        else
            this.visible = true;
    }
    makeEverythingButThisTagInvisible(tagFilter) {
        if (this.spriteModifier == null)
            this.visible = false;
        else if (!this.hasTag(tagFilter))
            this.visible = false;
        else
            this.visible = this.visible && true;
    }
    makeInvisibileIfHasTag(tagFilter) {
        if (this.hasTag(tagFilter))
            this.visible = false;
    }
    makeVisibileIfHasTag(tagFilter) {
        if (this.hasTag(tagFilter))
            this.visible = true;
    }
    addToContainer(container /*PIXI.Container*/) {
        if (this.spriteModifier != null)
            this.spriteInfo = sprite_info_1.SpriteInfo.getSpriteInfo(this.spriteModifier.spriteInfoName);
    }
}
exports.DrawPart = DrawPart;
var DrawPartType;
(function (DrawPartType) {
    DrawPartType[DrawPartType["Main"] = 0] = "Main";
    DrawPartType[DrawPartType["Solid"] = 1] = "Solid";
    DrawPartType[DrawPartType["Left"] = 2] = "Left";
    DrawPartType[DrawPartType["Right"] = 3] = "Right";
    DrawPartType[DrawPartType["Up"] = 4] = "Up";
    DrawPartType[DrawPartType["Down"] = 5] = "Down";
})(DrawPartType = exports.DrawPartType || (exports.DrawPartType = {}));
