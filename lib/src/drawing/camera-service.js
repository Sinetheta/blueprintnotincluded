"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vector2_1 = require("../vector2");
const display_1 = require("../enums/display");
const visualization_1 = require("../enums/visualization");
class CameraService {
    constructor(container) {
        this.overlay_ = -1;
        this.display_ = -1;
        this.visualization_ = -1;
        this.lastZoomCenter = new vector2_1.Vector2();
        this.linearReset = 0;
        // Public because this is used by the export images dialog
        this.zoomLevels = [16, 18, 20, 23, 27, 32, 38, 45, 54, 64, 76, 90, 108, 128];
        if (CameraService.cameraService_ == null)
            CameraService.cameraService_ = this;
        this.container = container;
        this.cameraOffset = new vector2_1.Vector2();
        this.targetCameraOffset = new vector2_1.Vector2();
        this.currentZoomIndex = 7;
        //this.currentZoomIndex = 13;
        this.targetZoom = this.currentZoom = this.zoomLevels[this.currentZoomIndex];
        this.sinWaveTime = 0;
        this.sinWave = 0;
        this.spinner = 0;
        this.triggerSortChildren = true;
        this.observersCameraChange = [];
        this.observersToAnimationChange = [];
        this.overlay = -1; //Overlay.Base;
        this.display = -1; //Display.solid;
        this.visualization = -1; //Visualization.none;
    }
    get overlay() { return this.overlay_; }
    set overlay(value) {
        let emitChange = this.overlay_ != value;
        this.overlay_ = value;
        if (emitChange) {
            this.triggerSortChildren = true;
            this.observersCameraChange.map((observer) => { observer.cameraChanged(this); });
        }
    }
    get display() { return this.display_; }
    set display(value) {
        let emitChange = this.display_ != value;
        this.display_ = value;
        if (emitChange) {
            this.triggerSortChildren = true;
            this.observersCameraChange.map((observer) => { observer.cameraChanged(this); });
        }
        if (value == display_1.Display.blueprint)
            this.visualization = visualization_1.Visualization.none;
    }
    get visualization() { return this.visualization_; }
    set visualization(value) {
        let emitChange = this.visualization_ != value;
        this.visualization_ = value;
        if (emitChange) {
            this.triggerSortChildren = true;
            this.observersCameraChange.map((observer) => { observer.cameraChanged(this); });
        }
        if (value != visualization_1.Visualization.none)
            this.display = display_1.Display.solid;
    }
    get showElementReport() { return this.visualization == visualization_1.Visualization.elements; }
    get showTemperatureScale() { return this.visualization == visualization_1.Visualization.temperature; }
    addToContainer(child) {
        this.container.addChild(child);
        this.triggerSortChildren = true;
    }
    static get cameraService() {
        return CameraService.cameraService_;
    }
    subscribeCameraChange(observer) {
        this.observersCameraChange.push(observer);
    }
    subscribeAnimationChange(observer) {
        this.observersToAnimationChange.push(observer);
    }
    setOverlayForItem(item) {
        this.overlay = item.overlay;
    }
    updateZoom() {
        // Snap if close enough
        if (this.currentZoom == this.targetZoom)
            return;
        if (Math.abs(this.currentZoom - this.targetZoom) < 0.1)
            this.changeZoom(this.targetZoom - this.currentZoom, this.lastZoomCenter);
        else
            this.changeZoom((this.targetZoom - this.currentZoom) / 10, this.lastZoomCenter);
    }
    resetSinWave() {
        this.sinWaveTime = 45;
    }
    updateAnimations(deltaTime) {
        this.updateSinWave(deltaTime);
        this.updateSpinner(deltaTime);
        this.updateLinearReset(deltaTime);
        this.observersToAnimationChange.map((observer) => { observer.animationChanged(); });
    }
    updateSinWave(deltaTime) {
        this.sinWaveTime += deltaTime / 3;
        if (this.sinWaveTime > 360)
            this.sinWaveTime -= 360;
        this.sinWave = Math.sin(this.sinWaveTime * Math.PI / 180) / 2 + 0.5;
    }
    updateSpinner(deltaTime) {
        this.spinner += deltaTime / 6;
        if (this.spinner > 360)
            this.spinner -= 360;
    }
    updateLinearReset(deltaTime) {
        this.linearReset += deltaTime / 12 / 100;
        while (this.linearReset > 1)
            this.linearReset -= 1;
    }
    resetZoom(canvasSize) {
        this.currentZoomIndex = 7;
        //this.currentZoomIndex = 13;
        this.targetZoom = this.currentZoom = this.zoomLevels[this.currentZoomIndex];
        this.cameraOffset.x = canvasSize.x * 0.5 / this.currentZoom;
        this.cameraOffset.y = canvasSize.y * 0.5 / this.currentZoom;
    }
    zoom(delta, zoomCenter) {
        this.lastZoomCenter = zoomCenter;
        this.currentZoomIndex += delta;
        if (this.currentZoomIndex < 0)
            this.currentZoomIndex = 0;
        if (this.currentZoomIndex >= this.zoomLevels.length)
            this.currentZoomIndex = this.zoomLevels.length - 1;
        this.targetZoom = this.zoomLevels[this.currentZoomIndex];
    }
    setHardZoom(zoomLevel) {
        this.targetZoom = this.currentZoom = zoomLevel;
        let zoomLevelDif = -1;
        for (let zoomLevelIndex = 0; zoomLevelIndex < this.zoomLevels.length; zoomLevelIndex++) {
            let dif = Math.abs(zoomLevel - this.zoomLevels[zoomLevelIndex]);
            if (zoomLevelDif == -1 || dif < zoomLevelDif) {
                this.currentZoomIndex = zoomLevelIndex;
                zoomLevelDif = dif;
            }
        }
    }
    changeZoom(zoomDelta, zoomCenter) {
        // TODO fix targetCameraOffset
        let oldZoomCenterTile = this.getTileCoordsForZoom(zoomCenter);
        this.currentZoom += zoomDelta;
        let newZoomCenterTile = this.getTileCoordsForZoom(zoomCenter);
        this.cameraOffset.x += newZoomCenterTile.x - oldZoomCenterTile.x;
        this.cameraOffset.y += newZoomCenterTile.y - oldZoomCenterTile.y;
        this.targetCameraOffset.x += newZoomCenterTile.x - oldZoomCenterTile.x;
        this.targetCameraOffset.y += newZoomCenterTile.y - oldZoomCenterTile.y;
    }
    // TODO refactor this
    getTileCoordsForZoom(screenCoords) {
        let returnValue = new vector2_1.Vector2();
        returnValue.x = screenCoords.x / this.currentZoom - this.cameraOffset.x;
        returnValue.y = screenCoords.y / this.currentZoom - this.cameraOffset.y;
        return returnValue;
    }
    getTileCoords(cursorPosition) {
        return new vector2_1.Vector2(cursorPosition.x / this.currentZoom - this.cameraOffset.x, -cursorPosition.y / this.currentZoom + this.cameraOffset.y);
    }
}
exports.CameraService = CameraService;
