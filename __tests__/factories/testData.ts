import { Types } from 'mongoose';

export interface TestUser {
  _id?: Types.ObjectId;
  email: string;
  username: string;
  hash?: string;
  salt?: string;
  authProvider?: string;
}

export interface TestBlueprint {
  _id?: Types.ObjectId;
  owner: Types.ObjectId;
  name: string;
  ratingCount?: number;
  ratingAverage?: number;
  createdAt: Date;
  modifiedAt: Date;
  thumbnail: string;
  // Absent by default: fixtures represent pre-backfill documents; tests that
  // need post-migration behavior override it explicitly
  thumbnailType?: 'real' | 'svg' | 'svg_nothing';
  isCopy?: boolean;
  copyOf?: Types.ObjectId;
  data: any;
  deletedAt?: Date | null;
  isPublished?: boolean;
}

export class TestDataFactory {
  private static userCounter = 0;
  private static blueprintCounter = 0;

  static createUser(overrides: Partial<TestUser> = {}): TestUser {
    this.userCounter++;
    const timestamp = Date.now();
    return {
      _id: new Types.ObjectId(),
      email: `testuser${this.userCounter}_${timestamp}@example.com`,
      username: `testuser${this.userCounter}_${timestamp}`,
      hash: 'dummy_hash_for_testing',
      salt: 'dummy_salt_for_testing',
      authProvider: 'legacy',
      ...overrides,
    };
  }

  static createBlueprint(
    owner: Types.ObjectId,
    overrides: Partial<TestBlueprint> = {}
  ): TestBlueprint {
    this.blueprintCounter++;
    const now = new Date();

    const blueprint: TestBlueprint = {
      _id: new Types.ObjectId(),
      owner,
      name: `Test Blueprint ${this.blueprintCounter}`,
      ratingCount: 0,
      ratingAverage: 0,
      createdAt: new Date(now.getTime() - this.blueprintCounter * 1000 * 60 * 60), // Spread creation times
      modifiedAt: new Date(now.getTime() - this.blueprintCounter * 1000 * 60 * 30), // Modified more recently
      thumbnail: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`,
      data: {
        version: '1.0',
        blueprintItems: [
          {
            id: 'Generator',
            x: 0,
            y: 0,
            element: 'SandStone',
            temperature: 293.15,
          },
        ],
        cells: [],
        info: {
          name: `Test Blueprint ${this.blueprintCounter}`,
          description: 'A test blueprint for automated testing',
        },
      },
      deletedAt: null,
      // Fixtures represent pre-existing public blueprints (matches the backfill
      // migration); draft tests override with isPublished: false
      isPublished: true,
      ...overrides,
    };
    return blueprint;
  }

  static reset(): void {
    this.userCounter = 0;
    this.blueprintCounter = 0;
  }
}
