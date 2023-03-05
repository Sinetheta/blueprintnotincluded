"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const blueprint_item_1 = require("./blueprint-item");
const draw_helpers_1 = require("../drawing/draw-helpers");
const vector2_1 = require("../vector2");
class BlueprintItemTile extends blueprint_item_1.BlueprintItem {
    constructor(id) {
        super(id);
        this.tileConnections_ = 0;
    }
    get tileConnections() { return this.tileConnections_; }
    set tileConnections(value) {
        if (value != this.tileConnections_)
            this.reloadCamera = true;
        this.tileConnections_ = value;
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
                drawPart.makeEverythingButThisTagInvisible(draw_helpers_1.DrawHelpers.connectionTag[this.tileConnections]);
    }
    updateTileables(blueprint) {
        let tempConnection = 0;
        if (blueprint.getBlueprintItemsAt(new vector2_1.Vector2(this.position.x - 1, this.position.y)).filter(b => b.id == this.id).length > 0)
            tempConnection += 1;
        if (blueprint.getBlueprintItemsAt(new vector2_1.Vector2(this.position.x + 1, this.position.y)).filter(b => b.id == this.id).length > 0)
            tempConnection += 2;
        if (blueprint.getBlueprintItemsAt(new vector2_1.Vector2(this.position.x, this.position.y + 1)).filter(b => b.id == this.id).length > 0)
            tempConnection += 4;
        if (blueprint.getBlueprintItemsAt(new vector2_1.Vector2(this.position.x, this.position.y - 1)).filter(b => b.id == this.id).length > 0)
            tempConnection += 8;
        this.tileConnections = tempConnection;
    }
}
exports.BlueprintItemTile = BlueprintItemTile;
