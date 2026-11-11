/* eslint-disable no-console */
import { keysDB } from '../config/couch.config';
import { ConfigurationUnavailableError } from './config.service';

export type KeyService = 'ai' | 'currency';
type Keys = Record<string, string>;

let stored: Record<string, Keys> | undefined;
let reading: Promise<Record<string, Keys>> | undefined;
let writing: Promise<unknown> = Promise.resolve();

const keysOf = (doc: object): Keys => Object.entries(doc)
  .reduce((keys, [ name, key ]) => (name.startsWith('_') ? keys : { ...keys, [name]: key }), {} as Keys);

const read = async (): Promise<Record<string, Keys>> => {
  try {
    const { rows } = await keysDB.list({ 'include_docs': true });
    stored = rows.reduce((services, row) => ({ ...services, [row.id]: keysOf(row.doc || {}) }), {} as Record<string, Keys>);
    return stored;
  } catch (error) {
    console.error(`Error reading the provider keys: ${error}`);
    throw new ConfigurationUnavailableError('The provider keys could not be read');
  } finally {
    reading = undefined;
  }
};

const currentKeys = async (): Promise<Record<string, Keys>> => {
  if (stored) {
    return stored;
  }
  reading = reading || read();
  return reading;
};

export const getKeys = async (service: KeyService): Promise<Keys> => (await currentKeys())[service] || {};

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
  if (stored) {
    stored = { ...stored, [service]: keysOf(next) };
  }
};

// Writes to one service's document would conflict, as when every key is removed at once, so they run in turn
const queued = (task: () => Promise<void>): Promise<void> => {
  const run = writing.then(task, task);
  writing = run.catch(() => undefined);
  return run;
};

export const setKey = (service: KeyService, name: string, key: string) => queued(() => writeKey(service, name, key));

export const removeKey = (service: KeyService, name: string) => queued(() => writeKey(service, name));
