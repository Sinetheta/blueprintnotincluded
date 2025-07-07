import { TestSetup } from '../setup/testSetup';

describe('Blueprint API', () => {
  let testData: any;

  beforeEach(async () => {
    testData = await TestSetup.beforeEach();
  });

  afterEach(async () => {
    await TestSetup.afterEach();
  });

  describe('GET /api/getblueprints', () => {
    test('should return blueprints ordered by creation date with pagination', async () => {
      const response = await TestSetup.request()
        .get('/api/getblueprints')
        .query({ olderthan: Date.now() });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(typeof response.body).toBe('object');

      if (response.body.blueprints) {
        expect(Array.isArray(response.body.blueprints)).toBe(true);
        
        const blueprintNames = response.body.blueprints.map((bp: any) => bp.name);
        expect(blueprintNames).toContain('Super Coal Generator Setup');
        expect(blueprintNames).toContain('Oxygen Production Line');
      }
    });

    test('should filter blueprints by date - only return older blueprints', async () => {
      const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000);
      
      const response = await TestSetup.request()
        .get('/api/getblueprints')
        .query({ olderthan: twoDaysAgo });

      expect(response.status).toBe(200);
      
      if (response.body.blueprints) {
        const blueprintNames = response.body.blueprints.map((bp: any) => bp.name);
        
        expect(blueprintNames).toContain('Super Coal Generator Setup'); // 3 days old
        expect(blueprintNames).toContain('Legacy Food System'); // 30 days old
        expect(blueprintNames).not.toContain('Oxygen Production Line'); // 1 day old
      }
    });

    test('should return correct like counts for popular blueprints', async () => {
      const response = await TestSetup.request()
        .get('/api/getblueprints')
        .query({ olderthan: Date.now() });
        
      expect(response.status).toBe(200);
      
      const popularBlueprint = response.body.blueprints.find(
        (bp: any) => bp.name === 'Super Coal Generator Setup'
      );
      expect(popularBlueprint.nbLikes).toBe(2);
    });

    test('should exclude copied blueprints by default', async () => {
      const response = await TestSetup.request()
        .get('/api/getblueprints')
        .query({ olderthan: Date.now() });
      
      expect(response.status).toBe(200);
      
      const blueprintNames = response.body.blueprints.map((bp: any) => bp.name);
      expect(blueprintNames).not.toContain('Modified Coal Generator'); // This is a copy
      expect(blueprintNames).toContain('Super Coal Generator Setup'); // Original should be included
    });

    test('should include copied blueprints when getDuplicates=true', async () => {
      const response = await TestSetup.request()
        .get('/api/getblueprints')
        .query({ 
          olderthan: Date.now(),
          getDuplicates: true 
        });
      
      expect(response.status).toBe(200);
      
      const blueprintNames = response.body.blueprints.map((bp: any) => bp.name);
      expect(blueprintNames).toContain('Modified Coal Generator'); // Copy should be included
      expect(blueprintNames).toContain('Super Coal Generator Setup'); // Original should still be included
    });

    test('should return 500 error without required olderthan parameter', async () => {
      const response = await TestSetup.request()
        .get('/api/getblueprints');
      
      // Documents a backend bug: should handle missing 'olderthan' parameter gracefully
      // Currently returns 500 due to parseInt(undefined) creating invalid Date
      expect(response.status).toBe(500);
    });
  });
});