import { expect } from 'chai';
import {
  DIG_COLOR,
  digCommandsKey,
  digOverlayGeometry,
  digRegionAt,
  drawDigCells,
} from '../../lib';

// lib/src/drawing/dig-markers.ts — the dig overlay's geometry, shared by the
// editor, the client-side exports and the server preview worker.

// A PIXI Graphics stand-in that records what was drawn.
function recordingGraphics() {
  const calls: { method: string; args: any[] }[] = [];
  const record =
    (method: string) =>
    (...args: any[]) => {
      calls.push({ method, args });
    };
  return {
    calls,
    lineStyle: record('lineStyle'),
    beginFill: record('beginFill'),
    endFill: record('endFill'),
    drawRect: record('drawRect'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
  };
}

describe('dig markers', function () {
  it('places a cell with its top-left corner at originY - y * zoom', () => {
    const geometry = digOverlayGeometry([{ x: 2, y: 3 }], 10, 100, 200);
    expect(geometry.size).to.equal(10);
    expect(geometry.cells).to.deep.equal([{ left: 120, top: 170 }]);
  });

  it('keeps every hatch line inside its cell', () => {
    const geometry = digOverlayGeometry([{ x: 0, y: 0 }], 12);
    expect(geometry.hatch).to.have.length(5);
    for (const [x0, y0, x1, y1] of geometry.hatch)
      for (const [x, y] of [
        [x0, y0],
        [x1, y1],
      ]) {
        expect(x).to.be.within(0, 12);
        expect(y).to.be.within(0, 12);
      }
  });

  it('outlines a region, not each cell', () => {
    expect(digOverlayGeometry([{ x: 0, y: 0 }], 10).edges).to.have.length(4);
    // Two side by side share a side: 6 edges, none of them on x = 10.
    const pair = digOverlayGeometry(
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
      10
    );
    expect(pair.edges).to.have.length(6);
    expect(pair.edges.some(([x0, , x1]) => x0 === 10 && x1 === 10)).to.equal(false);
    // A 2x2 block is outlined by its 8 outer sides.
    const block = digOverlayGeometry(
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ],
      10
    );
    expect(block.edges).to.have.length(8);
  });

  it('continues the stripes across neighbouring cells', () => {
    // Where cell (0,0)'s stripes leave through its right side, cell (1,0)'s
    // enter through its left side: the same heights on x = zoom.
    const zoom = 9;
    const crossings = (x: number) =>
      digOverlayGeometry([{ x, y: 0 }], zoom)
        .hatch.flatMap(([x0, y0, x1, y1]) => [
          [x0, y0],
          [x1, y1],
        ])
        .filter(([px, py]) => Math.abs(px - zoom) < 1e-9 && py > 1e-9 && py < zoom - 1e-9)
        .map(([, py]) => Math.round(py * 1000) / 1000)
        .sort((a, b) => a - b);
    expect(crossings(0)).to.deep.equal([3, 6]);
    expect(crossings(1)).to.deep.equal(crossings(0));
  });

  it('draws a repeated cell once, and nothing for no cells', () => {
    expect(
      digOverlayGeometry(
        [
          { x: 4, y: 4 },
          { x: 4, y: 4 },
        ],
        10
      ).cells
    ).to.have.length(1);
    expect(digOverlayGeometry([], 10).cells).to.deep.equal([]);
    expect(digOverlayGeometry(null, 10).cells).to.deep.equal([]);
    const graphics = recordingGraphics();
    drawDigCells(graphics, [], 10);
    expect(graphics.calls).to.deep.equal([]);
  });

  it('fills, hatches and outlines in the dig colour', () => {
    const graphics = recordingGraphics();
    drawDigCells(graphics, [{ x: 0, y: 0 }], 10, 5, 5);
    const fills = graphics.calls.filter(c => c.method === 'beginFill');
    expect(fills).to.have.length(1);
    expect(fills[0].args[0]).to.equal(DIG_COLOR);
    expect(graphics.calls.filter(c => c.method === 'drawRect')).to.deep.equal([
      { method: 'drawRect', args: [5, 5, 10, 10] },
    ]);
    // 5 hatch lines + 4 edges.
    expect(graphics.calls.filter(c => c.method === 'lineTo')).to.have.length(9);
    // The faint preview scales every alpha.
    const faint = recordingGraphics();
    drawDigCells(faint, [{ x: 0, y: 0 }], 10, 0, 0, 0.5);
    expect(faint.calls.find(c => c.method === 'beginFill')!.args[1]).to.equal(
      fills[0].args[1] * 0.5
    );
  });

  it('keys the cells in order', () => {
    expect(digCommandsKey([{ x: 1, y: 2 }])).to.equal(digCommandsKey([{ x: 1, y: 2 }]));
    expect(
      digCommandsKey([
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ])
    ).to.not.equal(
      digCommandsKey([
        { x: 3, y: 4 },
        { x: 1, y: 2 },
      ])
    );
    expect(digCommandsKey(null)).to.equal('');
  });

  describe('digRegionAt', () => {
    const sorted = (cells: { x: number; y: number }[]) =>
      cells.map(c => `${c.x},${c.y}`).sort();

    it('is empty off a dig', () => {
      expect(digRegionAt([{ x: 0, y: 0 }], { x: 1, y: 0 })).to.deep.equal([]);
      expect(digRegionAt(null, { x: 0, y: 0 })).to.deep.equal([]);
    });

    it('takes every dig joined through shared sides, from any of its cells', () => {
      // An L of four cells, a diagonal neighbour, and a separate cell.
      const digs = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 1 },
        { x: 3, y: 2 },
        { x: 7, y: 7 },
      ];
      const l = ['0,0', '1,0', '2,0', '2,1'];
      expect(sorted(digRegionAt(digs, { x: 0, y: 0 }))).to.deep.equal(l);
      expect(sorted(digRegionAt(digs, { x: 2, y: 1 }))).to.deep.equal(l);
      // Corners do not join regions, as the overlay outlines them apart.
      expect(sorted(digRegionAt(digs, { x: 3, y: 2 }))).to.deep.equal(['3,2']);
      expect(sorted(digRegionAt(digs, { x: 7, y: 7 }))).to.deep.equal(['7,7']);
    });

    it('lists a repeated cell once', () => {
      const digs = [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 1 },
      ];
      expect(sorted(digRegionAt(digs, { x: 0, y: 1 }))).to.deep.equal(['0,0', '0,1']);
    });
  });
});
