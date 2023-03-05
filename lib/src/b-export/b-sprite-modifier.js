"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BSpriteModifier = void 0;
const vector2_1 = require("../vector2");
class BSpriteModifier {
    constructor() {
        this.name = '';
        this.spriteInfoName = '';
        this.translation = new vector2_1.Vector2();
        this.scale = new vector2_1.Vector2();
        this.rotation = 0;
        this.tags = [];
    }
    // This is used by database editing stuff
    static clone(original) {
        let returnValue = new BSpriteModifier();
        returnValue.name = original.name;
        returnValue.spriteInfoName = original.spriteInfoName;
        let translation = vector2_1.Vector2.clone(original.translation);
        if (translation == null)
            translation = new vector2_1.Vector2();
        returnValue.translation = translation;
        let scale = vector2_1.Vector2.clone(original.scale);
        if (scale == null)
            scale = new vector2_1.Vector2();
        returnValue.scale = scale;
        returnValue.rotation = original.rotation;
        returnValue.tags = [];
        for (let tag of original.tags)
            returnValue.tags.push(tag);
        return returnValue;
    }
}
exports.BSpriteModifier = BSpriteModifier;
