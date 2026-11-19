/* eslint-disable no-console */
import { configurationDB } from '../config/couch.config';

export interface Configuration {
  code: string;
  parentCode: string;
  models: Record<string, string>;
  assistant: { instructions: string };
}

export class ConfigurationUnavailableError extends Error {
  statusCode = 503;

  constructor(message = 'The planet configuration could not be read') {
    super(message);
    this.name = 'Service Unavailable';
  }
}

let snapshot: Configuration | undefined;
let reading: Promise<Configuration> | undefined;

const stringOrEmpty = (value: unknown): string => (typeof value === 'string' ? value : '');

const stringsOnly = (value: unknown): Record<string, string> => Object.entries(value && typeof value === 'object' ? value : {})
  .reduce((entries, [ key, entry ]) => (typeof entry === 'string' ? { ...entries, [key]: entry } : entries), {} as Record<string, string>);

// The document the client edits: first by _id, and _find skips design documents
const readDocument = async (): Promise<any> => {
  const { docs } = await configurationDB.find({ 'selector': { '_id': { '$gt': null } }, 'limit': 1 });
  return docs[0];
};

const toConfiguration = (doc: any): Configuration => ({
  'code': stringOrEmpty(doc.code),
  'parentCode': stringOrEmpty(doc.parentCode),
  'models': stringsOnly(doc.models),
  'assistant': { 'instructions': stringOrEmpty(doc.assistant?.instructions) }
});

const read = async (): Promise<Configuration> => {
  try {
    const doc = await readDocument();
    if (!doc) {
      return toConfiguration({});
    }
    snapshot = toConfiguration(doc);
    return snapshot;
  } catch (error) {
    console.error(`Error reading the planet configuration: ${error}`);
    throw new ConfigurationUnavailableError();
  } finally {
    reading = undefined;
  }
};

// Read until the planet's configuration is found, then keep it until the gateway restarts
export const getConfiguration = async (): Promise<Configuration> => {
  if (snapshot) {
    return snapshot;
  }
  reading = reading || read();
  return reading;
};

// For writes stamped with the planet's code and parent, which a manager can change while the gateway runs
export const getCurrentConfiguration = async (): Promise<Configuration> => {
  const doc = await readDocument().catch((error) => {
    console.error(`Error reading the planet configuration: ${error}`);
    throw new ConfigurationUnavailableError();
  });
  return toConfiguration(doc || {});
};
