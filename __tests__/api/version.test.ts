import { expect } from 'chai';

import { TestSetup } from '../setup/testSetup';

describe('Version API (Mocha)', function () {
  describe('GET /api/version', function () {
    it('should return the package name and semver version from package.json', async function () {
      const response = await TestSetup.request().get('/api/version');

      expect(response.status).to.equal(200);
      expect(response.body.version).to.match(/^\d+\.\d+\.\d+$/); // Semantic version format
      expect(response.body.name).to.equal('blueprintnotincluded-backend');
      // ENV_NAME from .env.test
      expect(response.body.environment).to.equal('development');
    });

    it('should return a valid ISO build time and the Node.js version', async function () {
      const response = await TestSetup.request().get('/api/version');

      expect(response.status).to.equal(200);
      expect(response.body.buildTime).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO format
      expect(new Date(response.body.buildTime).getTime()).to.not.be.NaN;
      expect(response.body.nodeVersion).to.match(/^v\d+\.\d+\.\d+/); // Node version format
    });
  });
});
