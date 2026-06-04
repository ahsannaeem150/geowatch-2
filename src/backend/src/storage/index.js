import { LocalStorage } from './local.storage.js';
// import { R2Storage } from './r2.storage.js';  // Phase B (production)

const PROVIDER = process.env.STORAGE_PROVIDER || 'local';

export function getStorageEngine() {
  switch (PROVIDER) {
    case 'local':
      return new LocalStorage();
    // case 'r2':
    //   return new R2Storage();
    default:
      throw new Error(`Unknown storage provider: ${PROVIDER}`);
  }
}

export { LocalStorage };
