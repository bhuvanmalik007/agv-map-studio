// @vitest-environment node
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app';
import type { MapDocument } from '../shared/schema';

const sampleMap: MapDocument = {
  map: {
    maxNeighborDistance: 1500,
    nodes: [{ x: 1000, y: 1000, code: 10001000, directions: ['North'] }],
  },
};

describe('map API', () => {
  let temporaryDirectory: string;
  let dataFile: string;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'agv-map-test-'));
    dataFile = path.join(temporaryDirectory, 'map.json');
    await writeFile(dataFile, JSON.stringify(sampleMap), 'utf8');
  });

  afterEach(async () => {
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it('reports service health', async () => {
    const response = await request(createApp({ dataFile })).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('loads the current map', async () => {
    const response = await request(createApp({ dataFile })).get('/api/map');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(sampleMap);
  });

  it('validates and atomically persists an updated map', async () => {
    const updated = {
      ...sampleMap,
      map: { ...sampleMap.map, maxNeighborDistance: 2200 },
    };
    const response = await request(createApp({ dataFile })).put('/api/map').send(updated);
    expect(response.status).toBe(200);
    expect(JSON.parse(await readFile(dataFile, 'utf8'))).toEqual(updated);
    expect((await readdir(temporaryDirectory)).filter((file) => file.endsWith('.tmp'))).toEqual([]);
  });

  it('returns useful validation errors without modifying stored data', async () => {
    const response = await request(createApp({ dataFile }))
      .put('/api/map')
      .send({ map: { maxNeighborDistance: -1, nodes: [] } });
    expect(response.status).toBe(422);
    expect(response.body.error).toMatch(/invalid/i);
    expect(response.body.issues[0]).toContain('maxNeighborDistance');
    expect(JSON.parse(await readFile(dataFile, 'utf8'))).toEqual(sampleMap);
  });

  it('rejects malformed JSON with a 400 response', async () => {
    const response = await request(createApp({ dataFile }))
      .put('/api/map')
      .set('Content-Type', 'application/json')
      .send('{ invalid json');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Request body must be valid JSON.' });
    expect(JSON.parse(await readFile(dataFile, 'utf8'))).toEqual(sampleMap);
  });

  it('returns JSON for unknown routes', async () => {
    const response = await request(createApp({ dataFile })).get('/api/unknown');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found.' });
  });
});
