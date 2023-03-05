"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const csharp_binary_stream_1 = require("csharp-binary-stream");
const blueprint_helpers_1 = require("./blueprint-helpers");
const blueprint_item_element_1 = require("./blueprint-item-element");
const vector2_1 = require("../vector2");
const oni_item_1 = require("../oni-item");
const bni_blueprint_1 = require("../io/bni/bni-blueprint");
const bni_building_1 = require("../io/bni/bni-building");
const overlay_1 = require("../enums/overlay");
const draw_helpers_1 = require("../drawing/draw-helpers");
class Blueprint {
    constructor() {
        this.templateTiles = [];
        // We need a utility map because some objects have utilities outside of their size (HighWattageWireBridge)
        this.utilities = [];
        this.currentOverlay = overlay_1.Overlay.Base;
        // Sometimes we need to pause the events (when lots of changes are happening at once)
        this.pauseChangeEvents_ = false;
        this.blueprintItems = [];
        this.observersBlueprintChanged = [];
    }
    importFromOni(oniBlueprint) {
        this.blueprintItems = [];
        // Copy the buildings
        for (let building of oniBlueprint.buildings) {
            let oniItem = oni_item_1.OniItem.getOniItem(building.id);
            let newTemplateItem = blueprint_helpers_1.BlueprintHelpers.createInstance(building.id);
            if (newTemplateItem == null)
                continue;
            newTemplateItem.importOniBuilding(building);
            this.addBlueprintItem(newTemplateItem);
        }
        // Copy the cells
        for (let cell of oniBlueprint.cells) {
            let elementPosition = new vector2_1.Vector2();
            if (cell.location_x != null)
                elementPosition.x = cell.location_x;
            if (cell.location_y != null)
                elementPosition.y = cell.location_y;
            let currentElement = undefined;
            let buildingsAtPosition = this.getBlueprintItemsAt(elementPosition);
            for (let building of buildingsAtPosition)
                if (building.oniItem.id == 'Element') {
                    currentElement = building;
                    currentElement.setElement(cell.element, 0);
                }
            if (currentElement == undefined) {
                currentElement = new blueprint_item_element_1.BlueprintItemElement('Element');
                currentElement.position = elementPosition;
                currentElement.temperature = cell.temperature;
                currentElement.mass = cell.mass;
                currentElement.setElement(cell.element, 0);
                currentElement.cleanUp();
                // TODO boolean in export instead
                if (currentElement.buildableElements[0].hasTag('Liquid') || currentElement.buildableElements[0].hasTag('Gas') || currentElement.buildableElements[0].hasTag('Vacuum'))
                    this.addBlueprintItem(currentElement);
            }
        }
        // Keep a copy of the yaml object in memory
        this.innerYaml = oniBlueprint;
    }
    importFromBni(bniBlueprint) {
        this.blueprintItems = [];
        for (let building of bniBlueprint.buildings) {
            try {
                let newTemplateItem = blueprint_helpers_1.BlueprintHelpers.createInstance(building.buildingdef);
                if (newTemplateItem == null)
                    continue;
                newTemplateItem.importBniBuilding(building);
                this.addBlueprintItem(newTemplateItem);
            }
            catch (error) {
                console.log(error);
            }
        }
    }
    importFromMdb(mdbBlueprint) {
        this.blueprintItems = [];
        for (let originalTemplateItem of mdbBlueprint.blueprintItems) {
            let newTemplateItem = blueprint_helpers_1.BlueprintHelpers.createInstance(originalTemplateItem.id);
            // Don't import buildings we don't recognise
            if (newTemplateItem == null)
                continue;
            newTemplateItem.importMdbBuilding(originalTemplateItem);
            this.addBlueprintItem(newTemplateItem);
        }
    }
    importFromBinary(template) {
        const reader = new csharp_binary_stream_1.BinaryReader(template);
        let bniBlueprint = new bni_blueprint_1.BniBlueprint();
        bniBlueprint.friendlyname = reader.readString(csharp_binary_stream_1.Encoding.Utf8);
        bniBlueprint.buildings = [];
        let buildingCount = reader.readInt();
        for (let buildingIndex = 0; buildingIndex < buildingCount; buildingIndex++) {
            let bniBuilding = new bni_building_1.BniBuilding();
            let offsetX = reader.readInt();
            let offsetY = reader.readInt();
            bniBuilding.offset = new vector2_1.Vector2(offsetX, offsetY);
            let buildingDef = reader.readString(csharp_binary_stream_1.Encoding.Utf8);
            bniBuilding.buildingdef = buildingDef;
            let selectedElementCount = reader.readInt();
            for (let elementIndex = 0; elementIndex < selectedElementCount; elementIndex++) {
                let tag = reader.readInt();
            }
            let orientation = reader.readInt();
            bniBuilding.orientation = orientation;
            let flags = reader.readInt();
            bniBuilding.flags = flags;
            bniBlueprint.buildings.push(bniBuilding);
        }
        this.importFromBni(bniBlueprint);
    }
    destroyAndCopyItems(source, emitChanges = true) {
        this.destroy(emitChanges);
        this.pauseChangeEvents();
        for (let blueprintItem of source.blueprintItems)
            this.addBlueprintItem(blueprintItem);
        this.resumeChangeEvents(emitChanges);
    }
    prepareOverlayInfo(currentOverlay) {
        this.currentOverlay = currentOverlay;
        this.refreshOverlayInfo();
    }
    refreshOverlayInfo() {
        //for (let blueprintItem of this.blueprintItems) blueprintItem.overlayChanged(this.currentOverlay);
    }
    addBlueprintItem(blueprintItem) {
        this.blueprintItems.push(blueprintItem);
        if (blueprintItem.tileIndexes == null)
            blueprintItem.prepareBoundingBox();
        for (let tileIndex of blueprintItem.tileIndexes)
            this.getBlueprintItemsAtIndex(tileIndex).push(blueprintItem);
        for (let connection of blueprintItem.oniItem.utilityConnections) {
            let connectionPosition = vector2_1.Vector2.cloneNullToZero(connection.offset);
            connectionPosition = draw_helpers_1.DrawHelpers.rotateVector2(connectionPosition, vector2_1.Vector2.Zero, blueprintItem.rotation);
            connectionPosition = draw_helpers_1.DrawHelpers.scaleVector2(connectionPosition, vector2_1.Vector2.Zero, blueprintItem.scale);
            connectionPosition.x += blueprintItem.position.x;
            connectionPosition.y += blueprintItem.position.y;
            let newUtilityTracker = { blueprintItem: blueprintItem, utilityConnection: connection };
            this.getUtilityConnectionsAtIndex(draw_helpers_1.DrawHelpers.getTileIndex(connectionPosition)).push(newUtilityTracker);
            //console.log(this.getUtilityConnectionsAtIndex(DrawHelpers.getTileIndex(connectionPosition)))
        }
        this.emitItemAdded(blueprintItem);
    }
    destroyBlueprintItem(templateItem) {
        // If the item is a wire, we need to disconnect it
        if (templateItem.oniItem.isWire) {
            let templateItemWire = templateItem;
            let connectionsArray = draw_helpers_1.DrawHelpers.getConnectionArray(templateItemWire.connections);
            for (let i = 0; i < 4; i++) {
                if (connectionsArray[i]) {
                    let offsetToModify = draw_helpers_1.DrawHelpers.connectionVectors[i];
                    let positionToModify = new vector2_1.Vector2(templateItem.position.x + offsetToModify.x, templateItem.position.y + offsetToModify.y);
                    let itemsToModify = this.getBlueprintItemsAt(positionToModify).filter(i => i.oniItem.objectLayer == templateItem.oniItem.objectLayer);
                    for (let itemToModify of itemsToModify) {
                        let itemToModifyWire = itemToModify;
                        if (itemToModifyWire != null) {
                            let connectionsArrayToModify = draw_helpers_1.DrawHelpers.getConnectionArray(itemToModifyWire.connections);
                            connectionsArrayToModify[draw_helpers_1.DrawHelpers.connectionBitsOpposite[i]] = false;
                            itemToModifyWire.connections = draw_helpers_1.DrawHelpers.getConnection(connectionsArrayToModify);
                        }
                    }
                }
            }
        }
        // First remove from the tilemap
        if (templateItem.tileIndexes != null && templateItem.tileIndexes.length > 0)
            for (let tileIndex of templateItem.tileIndexes) {
                const indexInTileMap = this.templateTiles[tileIndex].indexOf(templateItem, 0);
                if (indexInTileMap > -1)
                    this.templateTiles[tileIndex].splice(indexInTileMap, 1);
            }
        // Then from the utility map
        for (let connection of templateItem.oniItem.utilityConnections) {
            let connectionPosition = vector2_1.Vector2.cloneNullToZero(connection.offset);
            connectionPosition = draw_helpers_1.DrawHelpers.rotateVector2(connectionPosition, vector2_1.Vector2.Zero, templateItem.rotation);
            connectionPosition = draw_helpers_1.DrawHelpers.scaleVector2(connectionPosition, vector2_1.Vector2.Zero, templateItem.scale);
            connectionPosition.x += templateItem.position.x;
            connectionPosition.y += templateItem.position.y;
            let utilitiesAtPosition = this.getUtilityConnectionsAtIndex(draw_helpers_1.DrawHelpers.getTileIndex(connectionPosition));
            for (let index = 0; index < utilitiesAtPosition.length; index++) {
                if (utilitiesAtPosition[index].blueprintItem == templateItem && utilitiesAtPosition[index].utilityConnection == connection) {
                    utilitiesAtPosition.splice(index, 1);
                    break;
                }
            }
            //console.log(utilitiesAtPosition)
        }
        // Then remove from the item list, 
        const index = this.blueprintItems.indexOf(templateItem, 0);
        if (index > -1)
            this.blueprintItems.splice(index, 1);
        // Then destroy the sprite
        templateItem.destroy();
        // Then fire the events
        this.emitItemDestroyed();
    }
    getBlueprintItemsAt(position) {
        let arrayIndex = draw_helpers_1.DrawHelpers.getTileIndex(position);
        return this.getBlueprintItemsAtIndex(arrayIndex);
    }
    getBlueprintItemsAtIndex(index) {
        if (this.templateTiles == null)
            this.templateTiles = [];
        let returnValue = this.templateTiles[index];
        if (returnValue == null) {
            returnValue = [];
            this.templateTiles[index] = returnValue;
        }
        return returnValue;
    }
    getUtilityConnectionsAtIndex(index) {
        if (this.utilities == null)
            this.utilities = [];
        let returnValue = this.utilities[index];
        if (returnValue == null) {
            returnValue = [];
            this.utilities[index] = returnValue;
        }
        return returnValue;
    }
    pauseChangeEvents() {
        this.pauseChangeEvents_ = true;
    }
    resumeChangeEvents(emitChanges = true) {
        this.pauseChangeEvents_ = false;
        if (emitChanges)
            this.emitBlueprintChanged();
    }
    subscribeBlueprintChanged(observer) {
        this.observersBlueprintChanged.push(observer);
    }
    emitItemDestroyed() {
        if (!this.pauseChangeEvents_) {
            this.observersBlueprintChanged.map((observer) => { observer.itemDestroyed(); });
            this.emitBlueprintChanged();
        }
    }
    emitItemAdded(blueprintItem) {
        if (!this.pauseChangeEvents_) {
            this.observersBlueprintChanged.map((observer) => { observer.itemAdded(blueprintItem); });
            this.emitBlueprintChanged();
        }
    }
    emitBlueprintChanged() {
        if (!this.pauseChangeEvents_) {
            this.observersBlueprintChanged.map((observer) => { observer.blueprintChanged(); });
            for (let blueprintItem of this.blueprintItems)
                blueprintItem.updateTileables(this);
        }
    }
    toMdbBlueprint() {
        let returnValue = {
            blueprintItems: []
        };
        for (let originalTemplateItem of this.blueprintItems)
            returnValue.blueprintItems.push(originalTemplateItem.toMdbBuilding());
        return returnValue;
    }
    toBniBlueprint(friendlyname) {
        let returnValue = {
            friendlyname: friendlyname,
            buildings: [],
            digcommands: []
        };
        for (let originalTemplateItem of this.blueprintItems)
            if (originalTemplateItem.id != oni_item_1.OniItem.elementId && originalTemplateItem.id != oni_item_1.OniItem.infoId)
                returnValue.buildings.push(originalTemplateItem.toBniBuilding());
        return returnValue;
    }
    clone() {
        let mdb = this.toMdbBlueprint();
        let returnValue = new Blueprint();
        returnValue.importFromMdb(mdb);
        return returnValue;
    }
    getBoundingBox() {
        let topLeft = new vector2_1.Vector2(9999, 9999);
        let bottomRight = new vector2_1.Vector2(-9999, -9999);
        this.blueprintItems.map((item) => {
            item.tileIndexes.map((index) => {
                let position = draw_helpers_1.DrawHelpers.getTilePosition(index);
                if (topLeft.x > position.x)
                    topLeft.x = position.x;
                if (topLeft.y > position.y)
                    topLeft.y = position.y;
                if (bottomRight.x < position.x)
                    bottomRight.x = position.x;
                if (bottomRight.y < position.y)
                    bottomRight.y = position.y;
            });
        });
        return [topLeft, bottomRight];
    }
    sortChildren() {
        for (let blueprintItem of this.blueprintItems)
            blueprintItem.sortChildren();
    }
    destroy(emitChanges = true) {
        if (this.blueprintItems != null) {
            let blueprintItemsCopy = [];
            for (let b of this.blueprintItems)
                blueprintItemsCopy.push(b);
            this.pauseChangeEvents();
            for (let b of blueprintItemsCopy)
                this.destroyBlueprintItem(b);
            this.resumeChangeEvents(emitChanges);
        }
    }
}
exports.Blueprint = Blueprint;
