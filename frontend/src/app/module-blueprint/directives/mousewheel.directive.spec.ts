import { MouseWheelDirective } from "./mousewheel.directive";

const wheelEvent = (wheelDelta: number) =>
  ({
    wheelDelta,
    detail: 0,
    returnValue: true,
    preventDefault: vi.fn(),
  }) as any;

describe("MouseWheelDirective", () => {
  let dir: MouseWheelDirective;

  beforeEach(() => {
    dir = new MouseWheelDirective();
  });

  describe("mouseWheelFunc", () => {
    it("emits mouseWheel on a non-zero delta in either direction", () => {
      const wheelHandler = vi.fn();
      dir.mouseWheel.subscribe(wheelHandler);
      dir.mouseWheelFunc(wheelEvent(120));
      dir.mouseWheelFunc(wheelEvent(-120));
      expect(wheelHandler).toHaveBeenCalledTimes(2);
    });

    it("does not emit when delta is 0", () => {
      const wheelHandler = vi.fn();
      dir.mouseWheel.subscribe(wheelHandler);
      dir.mouseWheelFunc(wheelEvent(0));
      expect(wheelHandler).not.toHaveBeenCalled();
    });

    it("clamps delta to 1 for large positive wheelDelta", () => {
      const e = wheelEvent(999);
      dir.mouseWheelFunc(e);
      expect(e.delta).toBe(1);
    });

    it("clamps delta to -1 for large negative wheelDelta", () => {
      const e = wheelEvent(-999);
      dir.mouseWheelFunc(e);
      expect(e.delta).toBe(-1);
    });

    it("falls back to -detail when wheelDelta absent", () => {
      const e = {
        detail: -3,
        returnValue: true,
        preventDefault: vi.fn(),
      } as any;
      dir.mouseWheelFunc(e);
      expect(e.delta).toBe(1);
    });
  });
});
