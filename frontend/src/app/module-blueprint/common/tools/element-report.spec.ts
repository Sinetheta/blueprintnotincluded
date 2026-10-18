import { ElementReport } from "./element-report";

const makeBuildableElement = (name: string, color = 0xff0000) => ({
  name,
  color,
});

const makeOniItem = (overrides: Partial<any> = {}) => ({
  isElement: false,
  buildableElementsArray: [makeBuildableElement("Iron")],
  materialMass: [100],
  secondaryMaterialCosts: [],
  ...overrides,
});

const makeBlueprintItem = (
  oniItem: any,
  buildableElements: any[],
  overrides: Partial<any> = {},
) => ({
  oniItem,
  buildableElements,
  mass: 50,
  ...overrides,
});

describe("ElementReport", () => {
  let mockBlueprintService: any;
  let mockBlueprint: any;
  let report: ElementReport;

  beforeEach(() => {
    mockBlueprint = {
      subscribeBlueprintChanged: vi.fn(),
      blueprintItems: [],
    };
    mockBlueprintService = { blueprint: mockBlueprint };
    report = new ElementReport(mockBlueprintService as any);
  });

  it("recomputes when the blueprint announces a change", () => {
    const observer = mockBlueprint.subscribeBlueprintChanged.mock.calls[0][0];
    const elem = makeBuildableElement("Steel");
    mockBlueprint.blueprintItems = [
      makeBlueprintItem(makeOniItem({ buildableElementsArray: [elem] }), [
        elem,
      ]),
    ];

    observer.blueprintChanged();

    expect(report.data.map((d) => d.buildableElement)).toEqual([elem]);
  });

  describe("updateElementReport", () => {
    it("aggregates mass for a non-element building item", () => {
      const elem = makeBuildableElement("Steel");
      const item = makeBlueprintItem(
        makeOniItem({ buildableElementsArray: [elem], materialMass: [200] }),
        [elem],
      );
      mockBlueprint.blueprintItems = [item];
      report.updateElementReport();
      expect(report.data).toHaveLength(1);
      expect(report.data[0].totalMass).toBe(200);
      expect(report.data[0].buildableElement).toBe(elem);
    });

    it("counts an element cell's own mass, not a material cost", () => {
      const water = makeBuildableElement("Water");
      const cell = makeBlueprintItem(
        makeOniItem({
          isElement: true,
          buildableElementsArray: [water],
          materialMass: [999],
        }),
        [water],
        { mass: 50 },
      );
      mockBlueprint.blueprintItems = [cell];
      report.updateElementReport();
      expect(report.data).toHaveLength(1);
      expect(report.data[0].buildableElement).toBe(water);
      expect(report.data[0].totalMass).toBe(50);
    });

    it("charges each material slot of a building to that slot's element", () => {
      const copper = makeBuildableElement("Copper");
      const glass = makeBuildableElement("Glass");
      const oniItem = makeOniItem({
        buildableElementsArray: [copper, glass],
        materialMass: [100, 25],
      });
      mockBlueprint.blueprintItems = [
        makeBlueprintItem(oniItem, [copper, glass]),
      ];
      report.updateElementReport();
      expect(report.data.map((d) => [d.buildableElement, d.totalMass])).toEqual(
        [
          [copper, 100],
          [glass, 25],
        ],
      );
    });

    it("sums mass for multiple items using the same element", () => {
      const elem = makeBuildableElement("Iron");
      const oniItem = makeOniItem({
        buildableElementsArray: [elem],
        materialMass: [100],
      });
      const item1 = makeBlueprintItem(oniItem, [elem]);
      const item2 = makeBlueprintItem(oniItem, [elem]);
      mockBlueprint.blueprintItems = [item1, item2];
      report.updateElementReport();
      expect(report.data).toHaveLength(1);
      expect(report.data[0].totalMass).toBe(200);
    });

    it("keeps separate entries for different elements", () => {
      const iron = makeBuildableElement("Iron");
      const steel = makeBuildableElement("Steel");
      const ironItem = makeOniItem({
        buildableElementsArray: [iron],
        materialMass: [100],
      });
      const steelItem = makeOniItem({
        buildableElementsArray: [steel],
        materialMass: [150],
      });
      mockBlueprint.blueprintItems = [
        makeBlueprintItem(ironItem, [iron]),
        makeBlueprintItem(steelItem, [steel]),
      ];
      report.updateElementReport();
      expect(report.data).toHaveLength(2);
    });

    it("sorts data by totalMass descending", () => {
      const iron = makeBuildableElement("Iron");
      const steel = makeBuildableElement("Steel");
      const ironOni = makeOniItem({
        buildableElementsArray: [iron],
        materialMass: [50],
      });
      const steelOni = makeOniItem({
        buildableElementsArray: [steel],
        materialMass: [300],
      });
      mockBlueprint.blueprintItems = [
        makeBlueprintItem(ironOni, [iron]),
        makeBlueprintItem(steelOni, [steel]),
      ];
      report.updateElementReport();
      expect(report.data[0].totalMass).toBeGreaterThan(
        report.data[1].totalMass,
      );
      expect(report.data[0].buildableElement).toBe(steel);
    });

    it("adds mass from secondaryMaterialCosts", () => {
      const primary = makeBuildableElement("Iron");
      const secondary = makeBuildableElement("Fiber");
      const oniItem = makeOniItem({
        buildableElementsArray: [primary],
        materialMass: [100],
        secondaryMaterialCosts: [{ element: secondary, mass: 25 }],
      });
      mockBlueprint.blueprintItems = [makeBlueprintItem(oniItem, [primary])];
      report.updateElementReport();
      const fiberEntry = report.data.find(
        (d) => d.buildableElement === secondary,
      );
      expect(fiberEntry).toBeDefined();
      expect(fiberEntry!.totalMass).toBe(25);
    });

    it("resets data on each call", () => {
      const elem = makeBuildableElement("Iron");
      const oniItem = makeOniItem({
        buildableElementsArray: [elem],
        materialMass: [100],
      });
      mockBlueprint.blueprintItems = [makeBlueprintItem(oniItem, [elem])];
      report.updateElementReport();
      mockBlueprint.blueprintItems = [];
      report.updateElementReport();
      expect(report.data).toEqual([]);
    });
  });
});
