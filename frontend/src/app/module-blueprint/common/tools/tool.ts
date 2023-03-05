import { CameraService, Vector2 } from "../../../../../../lib/index";
import { DrawPixi } from '../../drawing/draw-pixi';

export enum ToolType
{
    select,
    build,
    elementReport
}

export interface ITool
{
  switchFrom();
  switchTo();

  // Input
  leftClick(tile: Vector2);
  rightClick(tile: Vector2);
  mouseDown(tile: Vector2);
  mouseOut();
  hover(tile: Vector2);
  drag(tileStart: Vector2, tileStop: Vector2);
  dragStop();
  keyDown(keyCode: string);
  draw(drawPixi: DrawPixi, camera: CameraService);

  // Tool switching
  toggleable: boolean; // Can we close this tool by clicking on it a second time
  visible: boolean; // Can we see this tool? Also use to set to check icon in menu
  captureInput: boolean; // Can this tool capture canvas mouse and keyboard input
  toolType: ToolType; // Each tool is aware of its nature
  toolGroup: number; // All tools with the same number are exclusive

}

export interface IChangeTool
{
  changeTool(toolType: ToolType);
}
