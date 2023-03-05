"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpriteModifier = void 0;
const vector2_1 = require("../vector2");
class SpriteModifier {
    constructor(spriteModifierId) {
        this.spriteInfoName = '';
        this.tags = [];
        this.rotation = 0;
        this.scale = new vector2_1.Vector2();
        this.translation = new vector2_1.Vector2();
        this.spriteModifierId = spriteModifierId;
        this.cleanUp();
    }
    importFrom(original) {
        this.spriteInfoName = original.spriteInfoName;
        this.translation = original.translation;
        this.scale = original.scale;
        this.rotation = original.rotation;
        this.tags = [];
        if (original.tags != null && original.tags.length > 0)
            for (let tag of original.tags)
                this.tags.push(tag);
    }
    cleanUp() {
        if (this.rotation == null)
            this.rotation = 0;
        if (this.scale == null)
            this.scale = vector2_1.Vector2.one();
        if (this.translation == null)
            this.translation = vector2_1.Vector2.zero();
        if (this.tags == null)
            this.tags = [];
    }
    hasTag(tag) {
        return this.tags.indexOf(tag) != -1;
    }
    static AddSpriteModifier(bBuilding) {
        // TODO Why is this empty again?
    }
    static get spriteModifiers() { return Array.from(SpriteModifier.spriteModifiersMap.values()); }
    static init() {
        SpriteModifier.spriteModifiersMap = new Map();
    }
    static load(spriteModifiers) {
        for (let original of spriteModifiers) {
            let spriteModifier = new SpriteModifier(original.name);
            spriteModifier.cleanUp();
            spriteModifier.importFrom(original);
            SpriteModifier.spriteModifiersMap.set(spriteModifier.spriteModifierId, spriteModifier);
        }
    }
    static getSpriteModifer(spriteModifierId) {
        let returnValue = SpriteModifier.spriteModifiersMap.get(spriteModifierId);
        /* TODO everything should have a modifier
        if (returnValue == null)
        {
            returnValue = new SpriteModifier(spriteModifierId);
            returnValue.cleanUp();
            SpriteModifier.spriteModifiersMap.set(spriteModifierId, returnValue);
        }
        */
        if (returnValue != undefined)
            return returnValue;
        else
            throw new Error('SpriteModifier.getSpriteModifer : Sprite Modifier not found : ' + spriteModifierId);
    }
}
exports.SpriteModifier = SpriteModifier;
