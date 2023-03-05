"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ImageSource {
    constructor(imageId, imageUrl) {
        this.imageId = imageId;
        this.imageUrl = imageUrl;
    }
    static get keys() { return Array.from(ImageSource.imageSourcesMapPixi.keys()); }
    static init() {
        ImageSource.imageSourcesMapPixi = new Map();
    }
    static AddImagePixi(imageId, imageUrl) {
        let newImageSource = new ImageSource(imageId, imageUrl);
        ImageSource.imageSourcesMapPixi.set(newImageSource.imageId, newImageSource);
    }
    static isTextureLoaded(imageId) {
        let imageSource = ImageSource.imageSourcesMapPixi.get(imageId);
        if (imageSource == null)
            return false;
        return imageSource.baseTexture != null;
    }
    static getBaseTexture(imageId, pixiUtil) {
        let imageSource = ImageSource.imageSourcesMapPixi.get(imageId);
        if (imageSource == null)
            return undefined;
        if (imageSource.baseTexture == null) {
            imageSource.baseTexture = pixiUtil.getNewBaseTexture(imageSource.imageUrl);
        }
        return imageSource.baseTexture;
    }
    static setBaseTexture(imageId, baseTexture /*PIXI.BaseTexture*/) {
        let imageSource = ImageSource.imageSourcesMapPixi.get(imageId);
        if (imageSource == null)
            return;
        if (imageSource.baseTexture == null) {
            imageSource.baseTexture = baseTexture;
        }
    }
    static getUrl(imageId) {
        let imageSource = ImageSource.imageSourcesMapPixi.get(imageId);
        if (imageSource == null)
            throw new Error('ImageSource.getUrl : imageId not found : ' + imageId);
        return imageSource.imageUrl;
    }
    static setUrl(imageId, imageUrl) {
        let imageSource = ImageSource.imageSourcesMapPixi.get(imageId);
        if (imageSource != null)
            imageSource.imageUrl = imageUrl;
    }
}
exports.ImageSource = ImageSource;
