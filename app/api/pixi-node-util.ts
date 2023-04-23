const { loadImage } = require('canvas');
const PIXI = require('../pixi-shim');
require('../pixi-shim/lib/pixi-shim-node.js');

import Jimp from 'jimp';
import { PixiUtil, ImageSource, Blueprint, Vector2, CameraService, Overlay, Display } from "../../lib";
import {resources} from 'pixi.js-legacy';

class NodeCanvasResource extends resources.BaseImageResource
{
    constructor(source: any) {
        super(source);
    }
}

export class PixiNodeUtil implements PixiUtil {

  pixiApp: PIXI.Application;
  pixiGraphicsBack: PIXI.Graphics;
  pixiGraphicsFront: PIXI.Graphics;

  constructor(options: any) {
    this.pixiApp = new PIXI.Application(options);
    this.pixiGraphicsFront = this.getNewGraphics();
    this.pixiGraphicsBack = this.getNewGraphics();
  }

  getNewPixiApp(options: any) {
    return this.pixiApp;
    //return new PIXI.Application(options);
  }
  getNewBaseRenderTexture(options: any) {
    return new PIXI.BaseRenderTexture(options);
  }
  getNewRenderTexture(brt: any) {
    return new PIXI.RenderTexture(brt);
  }
  getNewGraphics() {
    return new PIXI.Graphics();
  }
  getNewContainer() {
    return new PIXI.Container();
  }
  getSpriteFrom(ressource: any) {
    return PIXI.Sprite.from(ressource);
  }
  getNewBaseTexture(url: string) {
    throw new Error('This should not be called on node : all textures should be preloaded')
  }
  getNewTexture(baseTex: any, rectangle: any) {
    return new PIXI.Texture(baseTex, rectangle);
  }

  public getNewTextureWhole(baseTex: PIXI.BaseTexture) {
    return new PIXI.Texture(baseTex);
  }

  getNewRectangle(x1: number, y1: number, x2: number, y2: number) {
    return new PIXI.Rectangle(x1, y1, x2, y2);
  }

  getUtilityGraphicsBack(): any {
    return this.pixiGraphicsBack;
  }

  getUtilityGraphicsFront(): any {
    return this.pixiGraphicsFront;
  }

  async initTextures() {
    for (let k of ImageSource.keys) {
      let imageUrl = ImageSource.getUrl(k)!;
      let brt = await this.getImageFromCanvas(imageUrl);
      ImageSource.setBaseTexture(k, brt);
    }
  }

  async getImageFromCanvas(path: string) {
    
    console.log('loading image from file : ' + path)
  
    try {
      let image = await loadImage(path);
      let resource = new NodeCanvasResource(image);
      let bt = new PIXI.BaseTexture(resource);
      return bt;
    } catch (error) {
        console.warn(`Failed to load image from file: ${path}.  Removing 'solid' and trying again.`);
        try {
          path = path.replace('_solid', '');
          let image = await loadImage(path);
          let resource = new NodeCanvasResource(image);
          let bt = new PIXI.BaseTexture(resource);
          return bt;
        } catch (error) {
          console.error(`Failed to load image from ${path}.`);
      }
    }
  }

  // Define the generateFallbackRescueImage function
  async generateFallbackRescueImage() {
    // Set the dimensions for the fallback rescue image
    const width = 100;
    const height = 100;
    
    const data = await Jimp.read('./assets/images/unknown.png');
    return data;
  }

  async getImageWhite(path: string) {
    console.log('reading ' + path);
    
    let data;
    try {
      data = await Jimp.read(path);
    } catch (error) {
      console.warn(`Failed to read image from file: ${path}. Removing 'solid' and trying again.`);
      try {
        path = path.replace('_solid', '');
        data = await Jimp.read(path);
      } catch (error) {
        console.warn(`Failed to read image from file and solid: ${path}, trying rescue fallback.`);
        data = await this.generateFallbackRescueImage(); // You should define this function to create a fallback rescue image
      }
    }

    let width = data.getWidth();
    let height = data.getHeight();

    let brt = this.getNewBaseRenderTexture({width: width, height: height });
    let rt = this.getNewRenderTexture(brt);

    let graphics = this.getNewGraphics();

    let container = this.getNewContainer();
    container.addChild(graphics);

    for (let x = 0; x < width; x++)
      for (let y = 0; y < height; y++) {
        let color = data.getPixelColor(x, y);
        let colorObject = Jimp.intToRGBA(color);
        let alpha = colorObject.a / 255;
        graphics.beginFill(0xFFFFFF, alpha);
        graphics.drawRect(x, y, 1, 1);
        graphics.endFill();
      }

    this.pixiApp.renderer.render(container, rt, false);

    // Release memory
    container.destroy({children: true});
    container = null;
    rt.destroy();
    rt = null;
    data = null;
    global.gc();

    //console.log('render done for ' + path);
    return brt;
  }

  generateThumbnail(angularBlueprint: Blueprint) {

    let boundingBox = angularBlueprint.getBoundingBox();
    let topLeft = boundingBox[0];
    let bottomRight = boundingBox[1];
    let totalTileSize = new Vector2(bottomRight.x - topLeft.x + 3, bottomRight.y - topLeft.y + 3);

    let thumbnailSize = 200;
    let maxTotalSize = Math.max(totalTileSize.x, totalTileSize.y);
    let thumbnailTileSize = thumbnailSize / maxTotalSize;
    let cameraOffset = new Vector2(-topLeft.x + 1, bottomRight.y + 1);
    if (totalTileSize.x > totalTileSize.y) cameraOffset.y += totalTileSize.x / 2 - totalTileSize.y / 2;
    if (totalTileSize.y > totalTileSize.x) cameraOffset.x += totalTileSize.y / 2 - totalTileSize.x / 2;

    thumbnailTileSize = Math.floor(thumbnailTileSize);
    cameraOffset.x = Math.floor(cameraOffset.x);
    cameraOffset.y = Math.floor(cameraOffset.y);

    let exportCamera = new CameraService(this.getNewContainer());
    exportCamera.setHardZoom(thumbnailTileSize);
    exportCamera.cameraOffset = cameraOffset;
    exportCamera.overlay = Overlay.Base;
    exportCamera.display = Display.solid;

    exportCamera.container = this.getNewContainer();
    exportCamera.container.sortableChildren = true;

    let graphics = this.getNewGraphics();
    exportCamera.container.addChild(graphics);

    graphics.beginFill(0xffffff);
    graphics.drawRect(0, 0, 200, 200);
    graphics.endFill();

    angularBlueprint.blueprintItems.map((item) => {
      item.updateTileables(angularBlueprint);
      item.drawPixi(exportCamera, this);
    });

    let brt = this.getNewBaseRenderTexture({width: thumbnailSize, height: thumbnailSize });
    let rt = this.getNewRenderTexture(brt);

    this.pixiApp.renderer.render(exportCamera.container, rt, false);

    let base64: string = this.pixiApp.renderer.plugins.extract.canvas(rt).toDataURL();

    // Memory release
    exportCamera.container.destroy({children: true});
    brt.destroy();
    rt.destroy();

    //console.log(base64)
    return base64;
  }
}
