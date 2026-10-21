import { Directive, inject } from "@angular/core";
import { Menu } from "primeng/menu";
import { Popover } from "primeng/popover";

// A strong ease-out: the overlay is nearly in place on the first frame, so it
// reads as answering the click rather than drifting in. PrimeNG's own default
// is a 120ms decelerate in and a linear fade out.
export const OVERLAY_SHOW = "150ms cubic-bezier(0.23, 1, 0.32, 1)";
export const OVERLAY_HIDE = "100ms ease-out";

export function prefersReducedMotion(): boolean {
  return (
    typeof window != "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/**
 * The site's open and close timing for a PrimeNG popover or popup menu, in
 * one place. PrimeNG enters them from scaleY(0.8), which reduced motion
 * should not see, so there they appear and go without a transition.
 */
@Directive({
  selector: "p-popover[appOverlayMotion], p-menu[appOverlayMotion]",
  standalone: true,
})
export class OverlayMotionDirective {
  constructor() {
    const overlay =
      inject(Popover, { self: true, optional: true }) ??
      inject(Menu, { self: true, optional: true });
    if (overlay == null) return;
    const reduce = prefersReducedMotion();
    overlay.showTransitionOptions = reduce ? "0ms" : OVERLAY_SHOW;
    overlay.hideTransitionOptions = reduce ? "0ms" : OVERLAY_HIDE;
  }
}
