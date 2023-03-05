import { SpriteModifier } from "./sprite-modifier";
import { SpriteInfo } from "./sprite-info";
import { OniItem } from "../oni-item";
import { Display } from "../enums/display";
import { SpriteTag } from "../enums/sprite-tag";
import { PixiUtil } from "./pixi-util";
export declare class DrawPart {
    spriteModifier: SpriteModifier;
    spriteInfo: SpriteInfo;
    sprite: any;
    private alpha_;
    alpha: number;
    private tint_;
    tint: number;
    private zIndex_;
    zIndex: number;
    private visible_;
    visible: boolean;
    isReady: boolean;
    constructor();
    prepareSprite(container: any, oniItem: OniItem, pixiUtil: PixiUtil): void;
    hasTag(tag: SpriteTag): boolean;
    prepareVisibilityBasedOnDisplay(newDisplay: Display): void;
    makeEverythingButThisTagInvisible(tagFilter: SpriteTag): void;
    makeInvisibileIfHasTag(tagFilter: SpriteTag): void;
    makeVisibileIfHasTag(tagFilter: SpriteTag): void;
    addToContainer(container: any): void;
}
export declare enum DrawPartType {
    Main = 0,
    Solid = 1,
    Left = 2,
    Right = 3,
    Up = 4,
    Down = 5
}
//# sourceMappingURL=draw-part.d.ts.map