/* eslint-disable no-console */
import { configurationDB } from '../../../config/couch.config';
import { ModelsDocument } from '../../chatapi/models/chat.model';

let key: string | undefined;

const getConfig = async(): Promise<ModelsDocument | undefined> => {
  try {
    const allDocs = await configurationDB.list({ 'include_docs': true });
    if (allDocs.rows.length > 0) {
      const doc = allDocs.rows[0].doc as unknown as ModelsDocument;
      return doc;
    } else {
      console.error('No documents found in configurationDB');
    }
  } catch (error: any) {
    console.error(`Error fetching configurationDB: ${error}`);
  }
};

const getApiKey = async() => {
  try {
    const doc = await getConfig();
    if (!doc) {
      console.error('Configuration not found');
    }
    return doc?.keys.currency;
  } catch (error) {
    console.error(`Error initializing currency configuration: ${error}`);
  }
};

(async () => {
  key = await getApiKey();
})();

export { key };

