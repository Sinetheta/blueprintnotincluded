import dotenv from 'dotenv';
import * as fs from 'fs';
import * as jimp from 'jimp';
import { ImageSource, BuildableElement, BuildMenuCategory, BuildMenuItem, BSpriteInfo, SpriteInfo, BSpriteModifier, SpriteModifier, BBuilding, OniItem } from '../../../lib';
import { PixiNodeUtil } from '../pixi-node-util';

export class GenerateIcons {
  constructor(databasePath: string) {

    console.log('Running batch GenerateIcons')

    // initialize configuration
    dotenv.config();
    console.log(process.env.ENV_NAME);

    // Read database
    let rawdata = fs.readFileSync(databasePath).toString();
    let json = JSON.parse(rawdata);

    ImageSource.init();

    let elements: BuildableElement[] = json.elements;
    BuildableElement.init();
    BuildableElement.load(elements);

    let buildMenuCategories: BuildMenuCategory[] = json.buildMenuCategories;
    BuildMenuCategory.init();
    BuildMenuCategory.load(buildMenuCategories);

    let buildMenuItems: BuildMenuItem[] = json.buildMenuItems;
    BuildMenuItem.init();
    BuildMenuItem.load(buildMenuItems);

    let uiSprites: BSpriteInfo[] = json.uiSprites;
    SpriteInfo.init();
    SpriteInfo.load(uiSprites)

    let spriteModifiers: BSpriteModifier[] = json.spriteModifiers;
    SpriteModifier.init();
    SpriteModifier.load(spriteModifiers);

    let buildings: BBuilding[] = json.buildings;
    OniItem.init();
    OniItem.load(buildings);

    this.generateIcons();
  }

  async generateIcons() {

    let pixiNodeUtil = new PixiNodeUtil({ forceCanvas: true, preserveDrawingBuffer: true });
    await pixiNodeUtil.initTextures();

    console.log('start generating icons')
    for (let k of SpriteInfo.keys.filter(s => SpriteInfo.getSpriteInfo(s).isIcon && !SpriteInfo.getSpriteInfo(s).isInputOutput)) {
      let uiSpriteInfo = SpriteInfo.getSpriteInfo(k);

      // Only generate icons for sprite not in the texture atlases
      if (!uiSpriteInfo.isIcon || uiSpriteInfo.isInputOutput) continue;

      //console.log('generating icon for ' + k);

      if (k == 'electrical_disconnected') console.log(uiSpriteInfo)




      let texture = uiSpriteInfo.getTexture(pixiNodeUtil);
      let uiSprite = pixiNodeUtil.getSpriteFrom(texture);

      let size = Math.max(texture.width, texture.height)

      let container = pixiNodeUtil.getNewContainer();
      container.addChild(uiSprite);

      uiSprite.x = 0;
      uiSprite.y = 0;

      if (texture.width > texture.height) uiSprite.y += (texture.width / 2 - texture.height / 2);
      if (texture.height > texture.width) uiSprite.x += (texture.height / 2 - texture.width / 2);

      let brt = pixiNodeUtil.getNewBaseRenderTexture({ width: size, height: size });
      let rt = pixiNodeUtil.getNewRenderTexture(brt);

      pixiNodeUtil.pixiApp.renderer.render(container, rt, true);
      let base64: string = pixiNodeUtil.pixiApp.renderer.plugins.extract.canvas(rt).toDataURL();

      let icon = await jimp.read(Buffer.from(base64.replace(/^data:image\/png;base64,/, ""), 'base64'));
      let iconPath = './assets/images/ui/' + k + '.png';
      console.log('saving icon to ' + iconPath);
      icon.write(iconPath);
      let frontendIconPath = './frontend/src/assets/images/ui/' + k + '.png';
      console.log('saving icon to ' + frontendIconPath);
      icon.write(frontendIconPath);

      // Free memory
      brt.destroy();
      brt = null;
      rt.destroy();
      rt = null;
      container.destroy({ children: true });
      container = null;
      global.gc();
    }
    console.log('done generating icons')
  }
}

// Only execute this script if loaded directly with node
if (require.main === module) {
  new GenerateIcons('./assets/database/database.json');
}
