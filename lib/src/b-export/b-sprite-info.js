"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vector2_1 = require("../vector2");
class BSpriteInfo {
    constructor() {
        this.name = '';
        this.textureName = '';
        this.isIcon = false;
        this.isInputOutput = false;
        this.uvMin = new vector2_1.Vector2();
        this.uvSize = new vector2_1.Vector2();
        this.realSize = new vector2_1.Vector2();
        this.pivot = new vector2_1.Vector2();
    }
    // Used when repacking textures
    static clone(source) {
        let returnValue = new BSpriteInfo();
        returnValue.name = source.name;
        returnValue.textureName = source.textureName;
        returnValue.isIcon = source.isIcon;
        returnValue.isInputOutput = source.isInputOutput;
        returnValue.uvMin = vector2_1.Vector2.cloneNullToZero(source.uvMin);
        returnValue.uvSize = vector2_1.Vector2.cloneNullToZero(source.uvSize);
        returnValue.realSize = vector2_1.Vector2.cloneNullToZero(source.realSize);
        returnValue.pivot = vector2_1.Vector2.cloneNullToZero(source.pivot);
        return returnValue;
    }
}
exports.BSpriteInfo = BSpriteInfo;
