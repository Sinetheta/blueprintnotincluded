"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const string_helpers_1 = require("../string-helpers");
class BUiScreen {
    constructor(id) {
        this.id = id;
        this.inputs = [];
    }
    getDefaultValue(index) { return null; }
    importFrom(original) {
        this.inputs = [];
        for (let value of original.inputs)
            this.inputs.push(value);
    }
    static clone(original) {
        if (original.id == 'SingleSliderSideScreen') {
            let returnValue = new BSingleSliderSideScreen(original.id);
            returnValue.importFrom(original);
            return returnValue;
        }
        else if (original.id == 'ThresholdSwitchSideScreen') {
            let returnValue = new BThresholdSwitchSideScreen(original.id);
            returnValue.importFrom(original);
            return returnValue;
        }
        else if (original.id == 'ActiveRangeSideScreen') {
            let returnValue = new BActiveRangeSideScreen(original.id);
            returnValue.importFrom(original);
            return returnValue;
        }
        else if (original.id == 'LogicBitSelectorSideScreen') {
            let returnValue = new BBitSelectorSideScreen(original.id);
            returnValue.importFrom(original);
            return returnValue;
        }
        throw new Error('BUiScreen.clone : Unkown UI screen');
    }
}
exports.BUiScreen = BUiScreen;
class UiSaveSettings {
    constructor(id) {
        this.id = id;
        this.values = [];
    }
    importFrom(original) {
        for (let value of original.values)
            this.values.push(value);
    }
    static clone(original) {
        let returnValue = new UiSaveSettings(original.id);
        returnValue.importFrom(original);
        return returnValue;
    }
}
exports.UiSaveSettings = UiSaveSettings;
class BSingleSliderSideScreen extends BUiScreen {
    constructor(id) {
        super(id);
        this.title = '';
        this.sliderUnits = '';
        this.min = 0;
        this.max = 0;
        this.tooltip = '';
        this.sliderDecimalPlaces = 0;
        this.defaultValue = 0;
    }
    getDefaultValue(index) {
        if (index == 0)
            return this.defaultValue;
        else
            return null;
    }
    importFrom(original) {
        super.importFrom(original);
        this.title = original.title;
        this.sliderUnits = original.sliderUnits;
        this.min = original.min;
        this.max = original.max;
        this.tooltip = string_helpers_1.StringHelpers.stripHtml(original.tooltip);
        this.sliderDecimalPlaces = original.sliderDecimalPlaces;
        this.defaultValue = original.defaultValue;
    }
}
exports.BSingleSliderSideScreen = BSingleSliderSideScreen;
class BThresholdSwitchSideScreen extends BUiScreen {
    constructor(id) {
        super(id);
        this.title = '';
        this.aboveToolTip = '';
        this.belowToolTip = '';
        this.thresholdValueName = '';
        this.thresholdValueUnits = '';
        this.rangeMin = 0;
        this.rangeMax = 0;
        this.incrementScale = 0;
        this.defaultValue = 0;
        this.defaultBoolean = false;
    }
    getDefaultValue(index) {
        if (index == 0)
            return this.defaultValue;
        else if (index == 1)
            return this.defaultBoolean;
        else
            return null;
    }
    importFrom(original) {
        super.importFrom(original);
        this.title = original.title;
        this.aboveToolTip = string_helpers_1.StringHelpers.stripHtml(original.aboveToolTip);
        this.belowToolTip = string_helpers_1.StringHelpers.stripHtml(original.belowToolTip);
        this.thresholdValueName = original.thresholdValueName;
        this.thresholdValueUnits = original.thresholdValueUnits;
        this.rangeMin = original.rangeMin;
        this.rangeMax = original.rangeMax;
        this.incrementScale = original.incrementScale;
        this.defaultValue = original.defaultValue;
        this.defaultBoolean = original.defaultBoolean;
    }
}
exports.BThresholdSwitchSideScreen = BThresholdSwitchSideScreen;
class BActiveRangeSideScreen extends BUiScreen {
    constructor(id) {
        super(id);
        this.title = '';
        this.minValue = 0;
        this.maxValue = 0;
        this.defaultActivateValue = 0;
        this.defaultDeactivateValue = 0;
        this.activateSliderLabelText = '';
        this.deactivateSliderLabelText = '';
        this.activateTooltip = '';
        this.deactivateTooltip = '';
    }
    getDefaultValue(index) {
        if (index == 0)
            return this.minValue;
        else if (index == 1)
            return this.maxValue;
        else
            return null;
    }
    importFrom(original) {
        super.importFrom(original);
        this.title = original.title;
        this.activateTooltip = string_helpers_1.StringHelpers.stripHtml(original.activateTooltip);
        this.deactivateTooltip = string_helpers_1.StringHelpers.stripHtml(original.deactivateTooltip);
        this.minValue = original.minValue;
        this.maxValue = original.maxValue;
    }
}
exports.BActiveRangeSideScreen = BActiveRangeSideScreen;
class BBitSelectorSideScreen extends BUiScreen {
    constructor(id) {
        super(id);
        this.title = '';
        this.description = '';
    }
    getDefaultValue(index) {
        if (index == 0)
            return 0;
        else
            return null;
    }
    importFrom(original) {
        super.importFrom(original);
        this.title = original.title;
        this.description = original.description;
    }
}
exports.BBitSelectorSideScreen = BBitSelectorSideScreen;
