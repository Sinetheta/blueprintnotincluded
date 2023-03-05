"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sprite_modifier_1 = require("./sprite-modifier");
class SpriteModifierGroup {
    constructor() {
        this.groupName = '';
        this.spriteModifiers = [];
    }
    importFrom(original) {
        this.groupName = original.groupName;
        for (let spriteName of original.spriteNames) {
            let spriteModifier = sprite_modifier_1.SpriteModifier.getSpriteModifer(spriteName);
            if (spriteModifier != null)
                this.spriteModifiers.push(spriteModifier);
        }
    }
}
exports.SpriteModifierGroup = SpriteModifierGroup;
