import { RocketInteriorModule } from "../../../../../lib/index";

// Display names for the rocket-interior choice, shared by the save dialog's
// select and the editor menu so the two never disagree. null is "none".
export function rocketInteriorLabel(
  module: RocketInteriorModule | null,
): string {
  switch (module) {
    case "small":
      return $localize`:rocket interior choice:Small habitat (nose cone)`;
    case "medium":
      return $localize`:rocket interior choice:Medium habitat`;
    default:
      return $localize`:rocket interior choice:None`;
  }
}
