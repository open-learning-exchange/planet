/* eslint-disable no-console */
import { keysDB } from '../config/couch.config';
import { ConfigurationUnavailableError } from './config.service';

export type KeyService = 'ai' | 'currency';
type Keys = Record<string, string>;

let cached: Record<string, Keys> | undefined;

const keysOf = (doc: object): Keys => Object.entries(doc)
  .reduce((keys, [ name, key ]) => (name.startsWith('_') ? keys : { ...keys, [name]: key }), {} as Keys);

// Read from CouchDB on first use, then kept up to date by writeKey
const allKeys = async (): Promise<Record<string, Keys>> => {
  if (cached) {
    return cached;
  }
  try {
    const { rows } = await keysDB.list({ 'include_docs': true });
    cached = rows.reduce((services, row) => ({ ...services, [row.id]: keysOf(row.doc || {}) }), {} as Record<string, Keys>);
    return cached;
  } catch (error) {
    console.error(`Error reading the provider keys: ${error}`);
    throw new ConfigurationUnavailableError('The provider keys could not be read');
  }
};

export const getKeys = async (service: KeyService): Promise<Keys> => (await allKeys())[service] || {};

const writeKey = async (service: KeyService, name: string, key?: string): Promise<void> => {
  const doc: any = await keysDB.get(service).catch((error) => {
    if (error?.statusCode === 404) {
      return { '_id': service };
    }
    throw error;
  });
  const next = { ...doc, [name]: key };
  if (key === undefined) {
    delete next[name];
  }
  await keysDB.insert(next);
  if (cached) {
    cached = { ...cached, [service]: keysOf(next) };
  }
};

export const setKey = (service: KeyService, name: string, key: string) => writeKey(service, name, key);

export const removeKey = (service: KeyService, name: string) => writeKey(service, name);
