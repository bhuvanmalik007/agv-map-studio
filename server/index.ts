import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 3001);
const dataFile = process.env.MAP_DATA_FILE ?? path.resolve(process.cwd(), 'data/map.json');
const staticDirectory = path.resolve(currentDirectory, '../../client');

createApp({ dataFile, staticDirectory }).listen(port, '0.0.0.0', () => {
  console.log(`AGV Map Studio is listening on http://localhost:${port}`);
});
