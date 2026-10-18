import { expect } from 'chai';
import mongoose from 'mongoose';

import { TestSetup } from '../setup/testSetup';

describe('Health API', function () {
  describe('GET /api/health', function () {
    it('returns 200 ok with the DB check, memory stats and uptime when the DB is connected', async function () {
      const response = await TestSetup.request().get('/api/health');

      expect(response.status).to.equal(200);
      expect(response.body.status).to.equal('ok');
      expect(response.body.checks.db).to.deep.equal({ status: 'connected', ok: true });

      const { memory } = response.body;
      expect(memory.heapUsedMb).to.be.a('number').and.greaterThan(0);
      expect(memory.heapTotalMb).to.be.a('number').and.greaterThan(0);
      expect(memory.rssMb).to.be.a('number').and.greaterThan(0);
      // Whole seconds since boot — 0 is legitimate when this runs first.
      expect(response.body.uptime).to.be.a('number').and.at.least(0);
    });

    // The deploy's health check reads the status code, so a lost DB
    // connection has to surface as a non-2xx, not as a 200 with a flag.
    it('returns 503 degraded when the DB is not connected', async function () {
      // readyState is a non-configurable accessor on Connection.prototype, so
      // sinon can't stub it; an own property on the instance shadows it.
      Object.defineProperty(mongoose.connection, 'readyState', {
        get: () => 0,
        configurable: true,
      });
      let response;
      try {
        response = await TestSetup.request().get('/api/health');
      } finally {
        delete (mongoose.connection as any).readyState;
      }

      expect(response.status).to.equal(503);
      expect(response.body.status).to.equal('degraded');
      expect(response.body.checks.db).to.deep.equal({ status: 'disconnected', ok: false });
    });
  });
});
