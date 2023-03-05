"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const overlay_1 = require("../enums/overlay");
const vector2_1 = require("../vector2");
const b_sprite_info_1 = require("../b-export/b-sprite-info");
const sprite_tag_1 = require("../enums/sprite-tag");
class DrawHelpers {
    static createUrl(ressource, ui) {
        return 'assets/images/' + (ui ? 'ui/' : '') + ressource + '.png';
    }
    static getOverlayUrl(overlay) {
        switch (overlay) {
            case overlay_1.Overlay.Base: return DrawHelpers.createUrl('icon_category_base', true);
            case overlay_1.Overlay.Power: return DrawHelpers.createUrl('icon_category_electrical', true);
            case overlay_1.Overlay.Liquid: return DrawHelpers.createUrl('icon_category_plumbing', true);
            case overlay_1.Overlay.Gas: return DrawHelpers.createUrl('icon_category_ventilation', true);
            case overlay_1.Overlay.Automation: return DrawHelpers.createUrl('icon_category_automation', true);
            case overlay_1.Overlay.Conveyor: return DrawHelpers.createUrl('icon_category_shipping', true);
            default: return DrawHelpers.createUrl('icon_category_base', true);
        }
    }
    static rotateVector2(v, center, rotation) {
        if (rotation == 0)
            return v;
        let rotationRadian = -rotation * Math.PI / 180;
        let vOrigin = new vector2_1.Vector2(v.x - center.x, v.y - center.y);
        let returnValue = new vector2_1.Vector2(Math.cos(rotationRadian) * vOrigin.x - Math.sin(rotationRadian) * vOrigin.y, Math.sin(rotationRadian) * vOrigin.x + Math.cos(rotationRadian) * vOrigin.y);
        returnValue.x += center.x;
        returnValue.y += center.y;
        return returnValue;
    }
    static scaleVector2(v, center, scale) {
        if (vector2_1.Vector2.One.equals(scale))
            return v;
        let returnValue = new vector2_1.Vector2(v.x, v.y);
        if (scale.x == -1)
            returnValue.x = 2 * center.x - v.x;
        if (scale.y == -1)
            returnValue.y = 2 * center.y - v.y;
        return returnValue;
    }
    static getRandomColor() {
        return 'rgba(' + Math.floor(Math.random() * 256) + ',' + Math.floor(Math.random() * 256) + ',' + Math.floor(Math.random() * 256) + ',1)';
    }
    /*
    public static drawFullRectangle(ctx: CanvasRenderingContext2D, camera: CameraService, topLeft: Vector2, bottomRight: Vector2, color: string)
    {
      let rectanglePosition = new Vector2(
        (topLeft.x + camera.cameraOffset.x + 1) * camera.currentZoom,
        (-topLeft.y + camera.cameraOffset.y + 1) * camera.currentZoom
      );
      let rectangleSize = new Vector2(
        (bottomRight.x - topLeft.x + 1) * camera.currentZoom - 2*camera.currentZoom,
        (topLeft.y - bottomRight.y + 1) * camera.currentZoom - 2*camera.currentZoom
      );
  
      // Draw the debug rectangle
      ctx.fillStyle = color;
       ctx.fillRect(rectanglePosition.x, rectanglePosition.y, rectangleSize.x, rectangleSize.y);
    }
    */
    static hexToRgb(hex) {
        return hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => '#' + r + r + g + g + b + b)
            .substring(1).match(/.{2}/g)
            .map(x => parseInt(x, 16));
    }
    static colorToHex(color) {
        let R = ((color & 0xff0000) >> 16);
        let G = ((color & 0xff00) >> 8);
        let B = (color & 0xff);
        return '#' + this.toHex(R) + this.toHex(G) + this.toHex(B);
    }
    static toHex(colorComp) {
        var hex = colorComp.toString(16);
        while (hex.length < 2) {
            hex = "0" + hex;
        }
        return hex;
    }
    static blendColor(a, b, ratio) {
        if (ratio > 1)
            ratio = 1;
        else if (ratio < 0)
            ratio = 0;
        let iRatio = 1 - ratio;
        let aR = ((a & 0xff0000) >> 16);
        let aG = ((a & 0xff00) >> 8);
        let aB = (a & 0xff);
        let bR = ((b & 0xff0000) >> 16);
        let bG = ((b & 0xff00) >> 8);
        let bB = (b & 0xff);
        let R = Math.round((aR * iRatio) + (bR * ratio));
        let G = Math.round((aG * iRatio) + (bG * ratio));
        let B = Math.round((aB * iRatio) + (bB * ratio));
        return R << 16 | G << 8 | B;
    }
    static getConnectionArray(connections) {
        let returnValue = [false, false, false, false];
        for (let i = 0; i < 4; i++)
            returnValue[i] = ((connections & DrawHelpers.connectionBits[i]) == DrawHelpers.connectionBits[i]);
        return returnValue;
    }
    static getConnection(connectionArray) {
        let returnValue = 0;
        for (let i = 0; i < 4; i++)
            if (connectionArray[i])
                returnValue += DrawHelpers.connectionBits[i];
        return returnValue;
    }
    static getIntegerTile(floatTile) {
        return new vector2_1.Vector2(Math.floor(floatTile.x), Math.ceil(floatTile.y));
    }
    static getFloorTile(floatTile) {
        return new vector2_1.Vector2(Math.floor(floatTile.x), Math.floor(floatTile.y));
    }
    // TODO Remove this, generated in the Oxygen not Included export now 
    static generateTileSpriteInfo(kanimPrefix, textureName) {
        let returnValue = [];
        let rIndex = 0;
        let uIndex = 0;
        let dIndex = 0;
        let l = false;
        let r = false;
        let u = false;
        let d = false;
        let motifStart = 40;
        let currentUv = new vector2_1.Vector2(motifStart, motifStart);
        let size = 128;
        let uvSize = new vector2_1.Vector2(size, size);
        let margin = 30;
        let motifRepeatedEvery = 208;
        let deltaPivot = margin / (2 * size + 2 * margin); // Do the math lol
        for (let i = 0; i <= 15; i++) {
            let newSourceUv = new b_sprite_info_1.BSpriteInfo();
            returnValue.push(newSourceUv);
            newSourceUv.name = kanimPrefix;
            newSourceUv.textureName = textureName;
            //console.log(l+';'+r+';'+u+';'+d);
            let pivot = new vector2_1.Vector2(0.5, 0.5);
            // We know the clone will not be null because it is defined higher, so we can add "!"
            let uv = vector2_1.Vector2.clone(currentUv);
            let size = vector2_1.Vector2.clone(uvSize);
            if (!l && !r && !u && !d)
                newSourceUv.name = newSourceUv.name + 'None';
            if (l)
                newSourceUv.name = newSourceUv.name + 'L';
            else {
                uv.x -= margin;
                size.x += margin;
                pivot.x += deltaPivot;
            }
            if (r)
                newSourceUv.name = newSourceUv.name + 'R';
            else {
                size.x += margin;
                pivot.x -= deltaPivot;
            }
            if (u)
                newSourceUv.name = newSourceUv.name + 'U';
            else {
                uv.y -= margin;
                size.y += margin;
                pivot.y -= deltaPivot;
            }
            if (d)
                newSourceUv.name = newSourceUv.name + 'D';
            else {
                size.y += margin;
                pivot.y += deltaPivot;
            }
            newSourceUv.name = newSourceUv.name + '_place';
            // We know the clones will not be nullso we can add "!"
            newSourceUv.uvMin = vector2_1.Vector2.clone(uv);
            newSourceUv.uvSize = vector2_1.Vector2.clone(size);
            newSourceUv.realSize = new vector2_1.Vector2(size.x / 1.28, size.y / 1.28);
            newSourceUv.pivot = vector2_1.Vector2.clone(pivot);
            l = !l;
            rIndex = (rIndex + 1) % 8;
            if (rIndex == 0)
                r = !r;
            uIndex = (uIndex + 1) % 2;
            if (uIndex == 0)
                u = !u;
            dIndex = (dIndex + 1) % 4;
            if (dIndex == 0)
                d = !d;
            currentUv.y += motifRepeatedEvery;
            if (currentUv.y == motifStart + 4 * motifRepeatedEvery) {
                currentUv.y = motifStart;
                currentUv.x += motifRepeatedEvery;
            }
        }
        return returnValue;
    }
    static getTileIndex(position) {
        return (position.x + 500) + 1001 * (position.y + 500);
    }
    static getTilePosition(index) {
        let returnValue = new vector2_1.Vector2(0, 0);
        returnValue.x = (index % 1001);
        index -= returnValue.x;
        returnValue.y = index / 1001;
        returnValue.x -= 500;
        returnValue.y -= 500;
        return returnValue;
    }
    static temperatureToColor(temperature) {
        for (let indexThreshold = 1; indexThreshold < DrawHelpers.temperatureThresholds.length; indexThreshold++) {
            if (temperature <= DrawHelpers.temperatureThresholds[indexThreshold].temperature) {
                let coldColor = DrawHelpers.temperatureThresholds[indexThreshold - 1].color;
                let hotColor = DrawHelpers.temperatureThresholds[indexThreshold].color;
                let coldThreshold = DrawHelpers.temperatureThresholds[indexThreshold - 1].temperature;
                let hotThreshold = DrawHelpers.temperatureThresholds[indexThreshold].temperature;
                let ratio = (temperature - coldThreshold) / (hotThreshold - coldThreshold);
                return DrawHelpers.blendColor(coldColor, hotColor, ratio);
            }
        }
        return 0x000000;
    }
    static temperatureToScale(temperature) {
        for (let indexStep = 0; indexStep < DrawHelpers.scaleSteps.length; indexStep++) {
            let scaleStep = DrawHelpers.scaleSteps[indexStep];
            if (temperature < scaleStep.ymax || indexStep == DrawHelpers.scaleSteps.length - 1) {
                return scaleStep.xmin + ((temperature - scaleStep.ymin) / (scaleStep.ymax - scaleStep.ymin)) * (scaleStep.xmax - scaleStep.xmin);
            }
        }
        return 0;
    }
    static scaleToTemperature(scale) {
        for (let indexStep = 0; indexStep < DrawHelpers.scaleSteps.length; indexStep++) {
            let scaleStep = DrawHelpers.scaleSteps[indexStep];
            if (scale < scaleStep.xmax || indexStep == DrawHelpers.scaleSteps.length - 1) {
                return scaleStep.ymin + ((scale - scaleStep.xmin) / (scaleStep.xmax - scaleStep.xmin)) * (scaleStep.ymax - scaleStep.ymin);
            }
        }
        return 0;
    }
}
DrawHelpers.whiteColor = 0xFFFFFF;
DrawHelpers.connectionBits = [1, 2, 4, 8];
DrawHelpers.connectionBitsOpposite = [1, 0, 3, 2];
DrawHelpers.connectionVectors = [vector2_1.Vector2.Left, vector2_1.Vector2.Right, vector2_1.Vector2.Up, vector2_1.Vector2.Down];
DrawHelpers.scaleSteps = [
    { xmin: 0, xmax: 15, ymin: 0, ymax: 273.15 },
    { xmin: 15, xmax: 60, ymin: 273.15, ymax: 318.15 },
    { xmin: 60, xmax: 80, ymin: 318.15, ymax: 373.15 },
    { xmin: 80, xmax: 90, ymin: 373.15, ymax: 493.15 },
    { xmin: 90, xmax: 100, ymin: 493.15, ymax: 10272.15 }
];
DrawHelpers.temperatureThresholds = [
    { temperature: 0, color: 0x80fef0, label: 'Absolute Zero', code: 'EXTREMECOLD' },
    { temperature: 273.15, color: 0x2bcbff, label: 'Cold', code: 'VERYCOLD' },
    { temperature: 283, color: 0x1fa1ff, label: 'Chilled', code: 'COLD' },
    { temperature: 293, color: 0x3bfe4a, label: 'Temperate', code: 'TEMPERATE' },
    { temperature: 303, color: 0xefff00, label: 'Warm', code: 'HOT' },
    { temperature: 310, color: 0xffa924, label: 'Hot', code: 'VERYHOT' },
    { temperature: 373, color: 0xfb5350, label: 'Scorching', code: 'EXTREMEHOT' },
    { temperature: 2073, color: 0xfb0200, label: 'Molten', code: 'MAXHOT' },
    { temperature: 10272.15, color: 0xfb0200, label: 'Molten', code: 'MAXHOT' },
];
DrawHelpers.connectionString = [
    'None_place',
    'L_place',
    'R_place',
    'LR_place',
    'U_place',
    'LU_place',
    'RU_place',
    'LRU_place',
    'D_place',
    'LD_place',
    'RD_place',
    'LRD_place',
    'UD_place',
    'LUD_place',
    'RUD_place',
    'LRUD_place'
];
DrawHelpers.connectionTag = [
    sprite_tag_1.SpriteTag.noConnection,
    sprite_tag_1.SpriteTag.L,
    sprite_tag_1.SpriteTag.R,
    sprite_tag_1.SpriteTag.LR,
    sprite_tag_1.SpriteTag.U,
    sprite_tag_1.SpriteTag.LU,
    sprite_tag_1.SpriteTag.RU,
    sprite_tag_1.SpriteTag.LRU,
    sprite_tag_1.SpriteTag.D,
    sprite_tag_1.SpriteTag.LD,
    sprite_tag_1.SpriteTag.RD,
    sprite_tag_1.SpriteTag.LRD,
    sprite_tag_1.SpriteTag.UD,
    sprite_tag_1.SpriteTag.LUD,
    sprite_tag_1.SpriteTag.RUD,
    sprite_tag_1.SpriteTag.LRUD
];
DrawHelpers.connectionStringSolid = [
    'None',
    'L',
    'R',
    'LR',
    'U',
    'LU',
    'RU',
    'LRU',
    'D',
    'LD',
    'RD',
    'LRD',
    'UD',
    'LUD',
    'RUD',
    'LRUD'
];
DrawHelpers.overlayString = [
    'Buildings',
    'Power',
    'Plumbing',
    'Ventilation',
    'Automation',
    'Oxygen',
    'Shipment',
    'Decor',
    'Light',
    'Temperature',
    'Room',
    'Unknown'
];
exports.DrawHelpers = DrawHelpers;
