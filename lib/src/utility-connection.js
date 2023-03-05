"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionHelper = exports.ConnectionSprite = void 0;
const connection_type_1 = require("./enums/connection-type");
const overlay_1 = require("./enums/overlay");
const z_index_1 = require("./enums/z-index");
class ConnectionSprite {
    constructor() {
        this.spriteInfoId = '';
        this.color = 0;
    }
}
exports.ConnectionSprite = ConnectionSprite;
class ConnectionHelper {
    static getConnectionOverlay(connectionType) {
        switch (connectionType) {
            case connection_type_1.ConnectionType.POWER_OUTPUT:
            case connection_type_1.ConnectionType.POWER_INPUT: return overlay_1.Overlay.Power;
            case connection_type_1.ConnectionType.GAS_INPUT:
            case connection_type_1.ConnectionType.GAS_OUTPUT: return overlay_1.Overlay.Gas;
            case connection_type_1.ConnectionType.LIQUID_INPUT:
            case connection_type_1.ConnectionType.LIQUID_OUTPUT: return overlay_1.Overlay.Liquid;
            case connection_type_1.ConnectionType.LOGIC_INPUT:
            case connection_type_1.ConnectionType.LOGIC_OUTPUT:
            case connection_type_1.ConnectionType.LOGIC_RIBBON_INPUT:
            case connection_type_1.ConnectionType.LOGIC_RIBBON_OUTPUT:
            case connection_type_1.ConnectionType.LOGIC_RESET_UPDATE:
            case connection_type_1.ConnectionType.LOGIC_CONTROL_INPUT: return overlay_1.Overlay.Automation;
            case connection_type_1.ConnectionType.SOLID_INPUT:
            case connection_type_1.ConnectionType.SOLID_OUTPUT: return overlay_1.Overlay.Conveyor;
            default: return overlay_1.Overlay.Unknown;
        }
    }
    static getConnectionName(connectionType) {
        switch (connectionType) {
            case connection_type_1.ConnectionType.POWER_OUTPUT: return 'Power Output';
            case connection_type_1.ConnectionType.POWER_INPUT: return 'Power Input';
            case connection_type_1.ConnectionType.GAS_INPUT: return 'Gas Input';
            case connection_type_1.ConnectionType.GAS_OUTPUT: return 'Gas Output';
            case connection_type_1.ConnectionType.LIQUID_INPUT: return 'Liquid Input';
            case connection_type_1.ConnectionType.LIQUID_OUTPUT: return 'Liquid Output';
            case connection_type_1.ConnectionType.LOGIC_INPUT: return 'Logic Input';
            case connection_type_1.ConnectionType.LOGIC_OUTPUT: return 'Logic Output';
            case connection_type_1.ConnectionType.LOGIC_RIBBON_INPUT: return 'Logic Ribbon Input';
            case connection_type_1.ConnectionType.LOGIC_RIBBON_OUTPUT: return 'Logic Ribbon Output';
            case connection_type_1.ConnectionType.LOGIC_RESET_UPDATE: return 'Logic Reset Input';
            case connection_type_1.ConnectionType.LOGIC_CONTROL_INPUT: return 'Logic Control Input';
            case connection_type_1.ConnectionType.SOLID_INPUT: return 'Conveyor Input';
            case connection_type_1.ConnectionType.SOLID_OUTPUT: return 'Conveyor Output';
            default: return 'Unknown';
        }
    }
    static getConnectionSprite(connectionType) {
        // TODO isInput as boolean
        // Green  : 6BD384
        // Orange : FBB03B
        let connectionSprite;
        connectionSprite = { color: 0xFFFFFF, spriteInfoId: 'electrical_disconnected' };
        if (connectionType.type == connection_type_1.ConnectionType.POWER_INPUT)
            connectionSprite = { color: 0xFFFFFF, spriteInfoId: 'electrical_disconnected' };
        if (connectionType.type == connection_type_1.ConnectionType.POWER_OUTPUT)
            connectionSprite = { color: 0x6BD384, spriteInfoId: 'electrical_disconnected' };
        if (connectionType.type == connection_type_1.ConnectionType.GAS_INPUT)
            connectionSprite = { color: 0xFFFFFF, spriteInfoId: 'input' };
        if (connectionType.type == connection_type_1.ConnectionType.GAS_OUTPUT)
            connectionSprite = { color: 0x6BD384, spriteInfoId: 'output' };
        if (connectionType.type == connection_type_1.ConnectionType.LIQUID_INPUT)
            connectionSprite = { color: 0xFFFFFF, spriteInfoId: 'input' };
        if (connectionType.type == connection_type_1.ConnectionType.LIQUID_OUTPUT)
            connectionSprite = { color: 0x6BD384, spriteInfoId: 'output' };
        if (connectionType.type == connection_type_1.ConnectionType.LOGIC_INPUT)
            connectionSprite = { color: 0xFFFFFF, spriteInfoId: 'logicInput' };
        if (connectionType.type == connection_type_1.ConnectionType.LOGIC_OUTPUT)
            connectionSprite = { color: 0x6BD384, spriteInfoId: 'logicOutput' };
        if (connectionType.type == connection_type_1.ConnectionType.SOLID_INPUT)
            connectionSprite = { color: 0xFFFFFF, spriteInfoId: 'input' };
        if (connectionType.type == connection_type_1.ConnectionType.SOLID_OUTPUT)
            connectionSprite = { color: 0x6BD384, spriteInfoId: 'output' };
        if (connectionType.type == connection_type_1.ConnectionType.LOGIC_RESET_UPDATE)
            connectionSprite = { color: 0xFFFFFF, spriteInfoId: 'logicResetUpdate' };
        if (connectionType.type == connection_type_1.ConnectionType.LOGIC_CONTROL_INPUT)
            connectionSprite = { color: 0xFFFFFF, spriteInfoId: 'logicResetUpdate' };
        if (connectionType.type == connection_type_1.ConnectionType.LOGIC_RIBBON_INPUT)
            connectionSprite = { color: 0xFFFFFF, spriteInfoId: 'logic_ribbon_all_in' };
        if (connectionType.type == connection_type_1.ConnectionType.LOGIC_RIBBON_OUTPUT)
            connectionSprite = { color: 0xFFFFFF, spriteInfoId: 'logic_ribbon_all_out' };
        if (connectionType.isSecondary)
            connectionSprite.color = 0xFBB03B;
        return connectionSprite;
    }
    // TODO should not be here
    static getOverlayFromLayer(sceneLayer) {
        switch (sceneLayer) {
            case z_index_1.ZIndex.NoLayer:
            case z_index_1.ZIndex.Background:
            case z_index_1.ZIndex.Backwall: return overlay_1.Overlay.Unknown;
            case z_index_1.ZIndex.Gas: return overlay_1.Overlay.Gas;
            case z_index_1.ZIndex.GasConduits:
            case z_index_1.ZIndex.GasConduitBridges: return overlay_1.Overlay.Gas;
            case z_index_1.ZIndex.LiquidConduits:
            case z_index_1.ZIndex.LiquidConduitBridges: return overlay_1.Overlay.Liquid;
            case z_index_1.ZIndex.SolidConduits:
            case z_index_1.ZIndex.SolidConduitContents:
            case z_index_1.ZIndex.SolidConduitBridges: return overlay_1.Overlay.Conveyor;
            case z_index_1.ZIndex.Wires:
            case z_index_1.ZIndex.WireBridges:
            case z_index_1.ZIndex.WireBridgesFront: return overlay_1.Overlay.Power;
            case z_index_1.ZIndex.LogicWires:
            case z_index_1.ZIndex.LogicGates:
            case z_index_1.ZIndex.LogicGatesFront: return overlay_1.Overlay.Automation;
            case z_index_1.ZIndex.InteriorWall:
            case z_index_1.ZIndex.InteriorWall:
            case z_index_1.ZIndex.GasFront:
            case z_index_1.ZIndex.BuildingBack:
            case z_index_1.ZIndex.Building:
            case z_index_1.ZIndex.BuildingUse:
            case z_index_1.ZIndex.BuildingFront:
            case z_index_1.ZIndex.TransferArm:
            case z_index_1.ZIndex.Ore:
            case z_index_1.ZIndex.Creatures:
            case z_index_1.ZIndex.Move:
            case z_index_1.ZIndex.Front:
            case z_index_1.ZIndex.GlassTile:
            case z_index_1.ZIndex.Liquid:
            case z_index_1.ZIndex.Ground:
            case z_index_1.ZIndex.TileMain:
            case z_index_1.ZIndex.TileFront:
            case z_index_1.ZIndex.FXFront:
            case z_index_1.ZIndex.FXFront2:
            case z_index_1.ZIndex.SceneMAX: return overlay_1.Overlay.Base;
            default: return overlay_1.Overlay.Base;
        }
    }
}
exports.ConnectionHelper = ConnectionHelper;
