"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vector2_1 = require("../../vector2");
const orientation_1 = require("../../enums/orientation");
class BniBuilding {
    constructor() {
        this.offset = new vector2_1.Vector2();
        this.buildingdef = '';
        this.orientation = orientation_1.Orientation.Neutral;
        this.flags = 0;
        this.selected_elements = [];
    }
}
exports.BniBuilding = BniBuilding;
