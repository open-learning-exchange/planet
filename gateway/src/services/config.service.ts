/* eslint-disable no-console */
import { configurationDB } from '../config/couch.config';

export interface Configuration {
  code: string;
  parentCode: string;
  models: Record<string, string>;
  assistant: { instructions: string };
}

interface Snapshot {
  configuration: Configuration;
  keys: Record<string, string>;
}

export class ConfigurationUnavailableError extends Error {
  statusCode = 503;

  constructor() {
    super('The planet configuration could not be read');
    this.name = 'Service Unavailable';
  }
}

let snapshot: Snapshot | undefined;
let reading: Promise<Snapshot> | undefined;

const stringOrEmpty = (value: unknown): string => (typeof value === 'string' ? value : '');

const stringsOnly = (value: unknown): Record<string, string> => Object.entries(value && typeof value === 'object' ? value : {})
  .reduce((entries, [ key, entry ]) => (typeof entry === 'string' ? { ...entries, [key]: entry } : entries), {} as Record<string, string>);

// The document the client edits: first by _id, and _find skips design documents
const readDocument = async (): Promise<any> => {
  const { docs } = await configurationDB.find({ 'selector': { '_id': { '$gt': null } }, 'limit': 1 });
  return docs[0];
};

const toSnapshot = (doc: any): Snapshot => ({
  'configuration': {
    'code': stringOrEmpty(doc.code),
    'parentCode': stringOrEmpty(doc.parentCode),
    'models': stringsOnly(doc.models),
    'assistant': { 'instructions': stringOrEmpty(doc.assistant?.instructions) }
  },
  'keys': stringsOnly(doc.keys)
});

const read = async (): Promise<Snapshot> => {
  try {
    const doc = await readDocument();
    if (!doc) {
      return toSnapshot({});
    }
    snapshot = toSnapshot(doc);
    return snapshot;
  } catch (error) {
    console.error(`Error reading the planet configuration: ${error}`);
    throw new ConfigurationUnavailableError();
  } finally {
    reading = undefined;
  }
};

// Read until the planet's configuration is found, then keep it until the gateway restarts
const currentSnapshot = async (): Promise<Snapshot> => {
  if (snapshot) {
    return snapshot;
  }
  reading = reading || read();
  return reading;
};

export const getConfiguration = async (): Promise<Configuration> => (await currentSnapshot()).configuration;

// For writes stamped with the planet's code and parent, which a manager can change while the gateway runs
export const getCurrentConfiguration = async (): Promise<Configuration> => {
  const doc = await readDocument().catch((error) => {
    console.error(`Error reading the planet configuration: ${error}`);
    throw new ConfigurationUnavailableError();
  });
  return toSnapshot(doc || {}).configuration;
};

export const getKeys = async (): Promise<Record<string, string>> => (await currentSnapshot()).keys;
