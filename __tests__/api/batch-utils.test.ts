import { expect } from 'chai';
import * as sinon from 'sinon';
import { BatchUtils } from '../../app/api/batch/batch-utils';

describe('BatchUtils', () => {
  let consoleLogStub: sinon.SinonStub;

  beforeEach(() => {
    consoleLogStub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    consoleLogStub.restore();
  });

  it('should have valid position correction thresholds', () => {
    // Test the position correction logic with mock data
    const mockBlueprint = {
      name: 'Test Blueprint',
      data: {
        blueprintItems: [
          { position: { x: 8001, y: 100 }, id: 'test1' }, // Should be corrected
          { position: { x: 100, y: -8001 }, id: 'test2' }, // Should be corrected
          { position: { x: 100, y: 100 }, id: 'test3' }, // Should not be corrected
        ],
      },
      markModified: sinon.stub(),
      save: sinon.stub().returns(Promise.resolve()),
    };

    BatchUtils.UpdatePositionCorrection(mockBlueprint as any);

    // Verify corrections were applied
    expect(mockBlueprint.data.blueprintItems[0].position.x).to.equal(8001 - 9999);
    expect(mockBlueprint.data.blueprintItems[1].position.y).to.equal(-8001 + 9999);
    expect(mockBlueprint.data.blueprintItems[2].position.x).to.equal(100); // Unchanged
    expect(mockBlueprint.data.blueprintItems[2].position.y).to.equal(100); // Unchanged
  });

  it('should detect blueprint copies correctly', () => {
    const original = {
      id: 'original',
      name: 'Original Blueprint',
      data: {
        blueprintItems: Array.from({ length: 20 }, (_, i) => ({
          id: `item_${i}`,
          position: { x: i * 10, y: i * 10 },
        })),
      },
    };

    const copy: any = {
      id: 'copy',
      name: 'Copy Blueprint',
      data: {
        blueprintItems: original.data.blueprintItems.slice(), // Exact copy
      },
      save: sinon.stub().returns(Promise.resolve()),
    };

    BatchUtils.UpdateBasedOn(copy, [original as any], 1);

    // Verify copy was detected
    expect(copy.isCopy).to.be.true;
    expect(copy.copyOf).to.equal('original');
  });

  it('should not flag similar but different blueprints as copies', () => {
    const original = {
      id: 'original',
      name: 'Original Blueprint',
      data: {
        blueprintItems: Array.from({ length: 20 }, (_, i) => ({
          id: `item_${i}`,
          position: { x: i * 10, y: i * 10 },
        })),
      },
    };

    const similar: any = {
      id: 'similar',
      name: 'Similar Blueprint',
      data: {
        blueprintItems: Array.from({ length: 20 }, (_, i) => ({
          id: `different_${i}`, // Different IDs
          position: { x: i * 10, y: i * 10 },
        })),
      },
      save: sinon.stub().returns(Promise.resolve()),
    };

    BatchUtils.UpdateBasedOn(similar, [original as any], 1);

    // Verify it was not flagged as a copy
    expect(similar.isCopy).to.be.undefined;
    expect(similar.copyOf).to.be.undefined;
  });
});
