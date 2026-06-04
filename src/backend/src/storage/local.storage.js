import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = process.env.UPLOAD_DIR || join(__dirname, '../../../../uploads');
const BASE_URL = process.env.API_URL || 'http://localhost:3000';

export class LocalStorage {
  constructor() {
    this.baseDir = UPLOAD_DIR;
    this.baseUrl = BASE_URL;
  }

  async upload(buffer, filename, contentType) {
    const filePath = join(this.baseDir, filename);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    return this.getUrl(filename);
  }

  getUrl(filename) {
    // Return URL path that Express static will serve
    return `${this.baseUrl}/uploads/${filename.replace(/\\/g, '/')}`;
  }

  async delete(filename) {
    const filePath = join(this.baseDir, filename);
    try {
      await unlink(filePath);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
}
