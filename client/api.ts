import { mapDocumentSchema, type MapDocument } from '../shared/schema';

async function parseResponse(response: Response): Promise<MapDocument> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
      issues?: string[];
    } | null;
    throw new Error(body?.issues?.join('\n') ?? body?.error ?? `Request failed (${response.status})`);
  }

  return mapDocumentSchema.parse(await response.json());
}

export async function getMap(): Promise<MapDocument> {
  return parseResponse(await fetch('/api/map'));
}

export async function saveMap(mapDocument: MapDocument): Promise<MapDocument> {
  return parseResponse(
    await fetch('/api/map', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapDocument),
    }),
  );
}
