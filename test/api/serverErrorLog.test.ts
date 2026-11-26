import express from 'express';
import request from 'supertest';
import { logServerErrorResponses } from '@api/utils/serverErrorLog';

function buildApp() {
  const app = express();
  app.use(logServerErrorResponses);
  app.get('/boom', (_req, res) => res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR' } }));
  app.get('/missing', (_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND' } }));
  app.get('/ok', (_req, res) => res.json({ ok: true }));
  return app;
}

describe('logServerErrorResponses', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('logs one API_5XX line for a 500 response', async () => {
    await request(buildApp()).get('/boom').expect(500);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toBe('API_5XX status=500 GET /boom');
  });

  it('does not log 4xx or 2xx responses', async () => {
    await request(buildApp()).get('/missing').expect(404);
    await request(buildApp()).get('/ok').expect(200);

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
