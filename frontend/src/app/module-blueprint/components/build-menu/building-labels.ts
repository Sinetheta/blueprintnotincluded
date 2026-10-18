import { OniItem, dlcLabel } from "../../../../../../lib/index";

// Pack names for the DLC marker on a build-menu tile. Empty for base-game
// buildings, which is what keeps them visually unchanged: the badge and chip
// are both gated on this being non-empty. Names come from dlcLabel() so the
// build menu, card and details page can never disagree about what a pack is
// called, and an id without a label still shows its raw id rather than
// hiding the fact that the building is DLC content.
export function buildingDlcLabels(item: OniItem): string[] {
  return (item.dlcIds ?? []).map(dlcLabel);
}

// The building's name with where it comes from: the mod that adds it, and
// the packs it needs.
export function buildingTooltip(item: OniItem): string {
  const name =
    item.mod != null
      ? $localize`${item.name} — from ${item.modTitle} (mod)`
      : item.name;
  const dlcs = buildingDlcLabels(item);
  return dlcs.length > 0
    ? $localize`:buildTool.dlcTooltip:${name} — requires ${dlcs.join(", ")}`
    : name;
}
