"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlueprintHelpers = void 0;
const blueprint_item_1 = require("./blueprint-item");
const blueprint_item_wire_1 = require("./blueprint-item-wire");
const blueprint_item_tile_1 = require("./blueprint-item-tile");
const blueprint_item_element_1 = require("./blueprint-item-element");
const oni_item_1 = require("../oni-item");
const blueprint_item_info_1 = require("./blueprint-item-info");
class BlueprintHelpers {
    static createInstance(id) {
        let newTemplateItem;
        let oniItem = oni_item_1.OniItem.getOniItem(id);
        if (oniItem == null)
            throw new Error('BlueprintHelpers.createInstance : OniItem id not found');
        if (oniItem.isWire)
            newTemplateItem = new blueprint_item_wire_1.BlueprintItemWire(id);
        else if (oniItem.isTile)
            newTemplateItem = new blueprint_item_tile_1.BlueprintItemTile(id);
        else if (oniItem.id == oni_item_1.OniItem.elementId)
            newTemplateItem = new blueprint_item_element_1.BlueprintItemElement(id);
        else if (oniItem.id == oni_item_1.OniItem.infoId)
            newTemplateItem = new blueprint_item_info_1.BlueprintItemInfo(id);
        else
            newTemplateItem = new blueprint_item_1.BlueprintItem(id);
        return newTemplateItem;
    }
    static cloneBlueprintItem(original, withConnections = false, withOrientation = false) {
        let returnValue = BlueprintHelpers.createInstance(original.id);
        let mdbClone = original.toMdbBuilding();
        if (!withConnections)
            mdbClone.connections = undefined;
        if (!withOrientation)
            mdbClone.orientation = undefined;
        returnValue.importMdbBuilding(mdbClone);
        return returnValue;
    }
}
exports.BlueprintHelpers = BlueprintHelpers;
