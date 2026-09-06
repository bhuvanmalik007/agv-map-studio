import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { mapDocumentSchema, type MapDocument } from '../shared/schema.js';

export async function readMap(dataFile: string): Promise<MapDocument> {
  const contents = await readFile(dataFile, 'utf8');
  return mapDocumentSchema.parse(JSON.parse(contents));
}

export async function writeMap(
  dataFile: string,
  mapDocument: MapDocument,
): Promise<void> {
  await mkdir(path.dirname(dataFile), { recursive: true });
  const temporaryFile = `${dataFile}.${process.pid}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(mapDocument, null, 2)}\n`, 'utf8');
  await rename(temporaryFile, dataFile);
}
