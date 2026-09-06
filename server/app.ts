import express, { type ErrorRequestHandler } from 'express';
import { access } from 'node:fs/promises';
import path from 'node:path';
import {
  formatValidationIssues,
  mapDocumentSchema,
} from '../shared/schema.js';
import { readMap, writeMap } from './mapStore.js';

interface AppOptions {
  dataFile: string;
  staticDirectory?: string;
}

export function createApp({ dataFile, staticDirectory }: AppOptions) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.get('/api/map', async (_request, response, next) => {
    try {
      response.json(await readMap(dataFile));
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/map', async (request, response, next) => {
    const result = mapDocumentSchema.safeParse(request.body);

    if (!result.success) {
      response.status(422).json({
        error: 'The map document is invalid.',
        issues: formatValidationIssues(result.error),
      });
      return;
    }

    try {
      await writeMap(dataFile, result.data);
      response.json(result.data);
    } catch (error) {
      next(error);
    }
  });

  if (staticDirectory) {
    app.use(express.static(staticDirectory));
    app.use(async (request, response, next) => {
      if (request.method !== 'GET' || request.path.startsWith('/api/')) {
        next();
        return;
      }

      const indexFile = path.join(staticDirectory, 'index.html');
      try {
        await access(indexFile);
        response.sendFile(indexFile);
      } catch {
        next();
      }
    });
  }

  app.use((_request, response) => {
    response.status(404).json({ error: 'Not found.' });
  });

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof SyntaxError && 'body' in error) {
      response.status(400).json({ error: 'Request body must be valid JSON.' });
      return;
    }

    console.error(error);
    response.status(500).json({ error: 'The server could not complete the request.' });
  };
  app.use(errorHandler);

  return app;
}
