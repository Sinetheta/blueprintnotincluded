export class StringHelpers {
  public static stripHtml(html: string): string {
    // TODO FIX ME
    return html;
  }

  public static createUrl(ressource: string, ui: boolean): string {
    return 'assets/images/' + (ui ? 'ui/' : '') + ressource + '.png';
  }

  // The flat art the canvas draws a building, element or terrain feature with,
  // at the resolution the game export ships (hundreds of px per cell).
  public static flatIconUrl(name: string): string {
    return 'assets/ui_image/' + name + '.png';
  }

  // The same art for <img> use at menu size. `npm run import:2024` renders one
  // per ui_image PNG (app/api/batch/icon-thumbnails.ts); a build menu that
  // showed the canvas art at 48px pulled hundreds of KB per icon.
  public static iconThumbUrl(name: string): string {
    return 'assets/ui_thumb/' + name + '.webp';
  }
}
