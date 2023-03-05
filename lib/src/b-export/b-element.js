"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildableElement = void 0;
const string_helpers_1 = require("../string-helpers");
// Elements that buildings can be made of (Exported from the game)
// TODO we don't currently handle "exotic" elements (ie reed fibers for paintings, or bleach stone for sanitation stations)
class BuildableElement {
    constructor() {
        // From export
        this.id = '';
        this.name = '';
        this.tag = 0;
        this.oreTags = [];
        this.icon = '';
        this.buildMenuSort = 0;
        this.color = 0;
        this.conduitColor = 0;
        this.uiColor = 0;
        // Generated
        this.iconUrl = '';
    }
    importFrom(original) {
        this.id = original.id;
        this.name = original.name;
        this.tag = original.tag;
        this.oreTags = [];
        if (original.oreTags != null)
            for (let s of original.oreTags)
                this.oreTags.push(s);
        this.icon = original.icon;
        this.iconUrl = string_helpers_1.StringHelpers.createUrl(this.icon, true);
        this.buildMenuSort = original.buildMenuSort;
        this.color = original.color;
        this.conduitColor = original.conduitColor;
        this.uiColor = original.uiColor;
    }
    hasTag(tag) {
        return this.oreTags.indexOf(tag) != -1;
    }
    static init() {
        BuildableElement.elements = [];
    }
    static load(originals) {
        for (let original of originals) {
            let newElement = new BuildableElement();
            newElement.importFrom(original);
            BuildableElement.elements.push(newElement);
        }
        let none = new BuildableElement();
        none.id = 'None';
        none.name = 'None';
        BuildableElement.elements.push(none);
    }
    static getElement(id) {
        for (let element of BuildableElement.elements)
            if (element.id == id)
                return element;
        throw new Error('BuildableElement.getElement : Element not found');
    }
    // Get a list of elements that have the parameter tag
    static getElementsFromTag(tag) {
        let returnValue = [];
        for (let element of BuildableElement.elements)
            if (returnValue.indexOf(element) == -1 && (element.id == tag || element.oreTags.indexOf(tag) != -1) && element.oreTags.indexOf('BuildableAny') != -1)
                returnValue.push(element);
        if (returnValue.length == 0)
            returnValue.push(BuildableElement.getElement('Unobtanium'));
        returnValue = returnValue.sort((i1, i2) => { return i1.buildMenuSort - i2.buildMenuSort; });
        return returnValue;
    }
    // Some buildings are made from more than one element (Steam Turbine)
    static getElementsFromTags(tags) {
        let returnValue = [];
        for (let indexTag = 0; indexTag < tags.length; indexTag++) {
            returnValue[indexTag] = [];
            returnValue[indexTag] = this.getElementsFromTag(tags[indexTag]);
        }
        return returnValue;
    }
}
exports.BuildableElement = BuildableElement;
