"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// TODO input output should be a boolean?
var ConnectionType;
(function (ConnectionType) {
    ConnectionType[ConnectionType["POWER_INPUT"] = 0] = "POWER_INPUT";
    ConnectionType[ConnectionType["POWER_OUTPUT"] = 1] = "POWER_OUTPUT";
    ConnectionType[ConnectionType["GAS_INPUT"] = 2] = "GAS_INPUT";
    ConnectionType[ConnectionType["GAS_OUTPUT"] = 3] = "GAS_OUTPUT";
    ConnectionType[ConnectionType["LIQUID_INPUT"] = 4] = "LIQUID_INPUT";
    ConnectionType[ConnectionType["LIQUID_OUTPUT"] = 5] = "LIQUID_OUTPUT";
    ConnectionType[ConnectionType["LOGIC_INPUT"] = 6] = "LOGIC_INPUT";
    ConnectionType[ConnectionType["LOGIC_OUTPUT"] = 7] = "LOGIC_OUTPUT";
    ConnectionType[ConnectionType["SOLID_INPUT"] = 8] = "SOLID_INPUT";
    ConnectionType[ConnectionType["SOLID_OUTPUT"] = 9] = "SOLID_OUTPUT";
    ConnectionType[ConnectionType["NONE"] = 10] = "NONE";
    ConnectionType[ConnectionType["LOGIC_RESET_UPDATE"] = 11] = "LOGIC_RESET_UPDATE";
    ConnectionType[ConnectionType["LOGIC_CONTROL_INPUT"] = 12] = "LOGIC_CONTROL_INPUT";
    ConnectionType[ConnectionType["LOGIC_RIBBON_INPUT"] = 13] = "LOGIC_RIBBON_INPUT";
    ConnectionType[ConnectionType["LOGIC_RIBBON_OUTPUT"] = 14] = "LOGIC_RIBBON_OUTPUT";
})(ConnectionType = exports.ConnectionType || (exports.ConnectionType = {}));
