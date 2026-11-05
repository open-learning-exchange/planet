import { Request, Response } from 'express';
import { key } from '../config/currency-provider.config';
import { teamsDB } from '../../../config/couch.config';

/**
 * Interface for transaction documents in CouchDB
 */
export interface TransactionDoc {
  _id?: string;
  _rev?: string;
  docType: 'transaction';
  teamId: string;
  teamType: string;
  teamPlanetCode: string;
  type: 'credit' | 'debit';
  amount: number;
  date: number;
  description: string;
  status?: string;
  receiptImages?: any;
  _attachments?: any;
}

// See https://docs.openexchangerates.org/reference/historical-json
const OPENEXCHANGERATES_MIN_YEAR = 1999;

const isValidDate = (dateString: string, timestamp: number): boolean => {

  if (dateString === 'Invalid Date' || timestamp > Date.now()) {
    return false;
  }

  const [ year ]: number[] = dateString.split('-').map((v) => parseInt(v, 10));

  if (year < OPENEXCHANGERATES_MIN_YEAR) {
    return false;
  }

  return true;

};

export const getCurrencyRate = async (req: Request, res: Response) => {

  const { timestamp } = req.params;
  const parsedTimestamp = parseInt(timestamp, 10);

  const dateObject = timestamp ? new Date(parsedTimestamp) : new Date();
  // Use Chinese locale because that matches closest to YYYY-MM-DD used in the API
  const date = dateObject.toLocaleDateString('zh-CN', {
    'timeZone': 'UTC',
    'year':'numeric',
    'month': '2-digit',
    'day': '2-digit'
  }).replace(/\//g, '-');

  if (!isValidDate(date, parsedTimestamp)) {
    return res.status(400).json({
      'error': 'Invalid date',
      'message': 'Number must parse to valid date after 1st January 1999 and before current time'
    });
  }

  try {
    const apiResponse = await fetch(`https://openexchangerates.org/api/historical/${date}.json?app_id=${key}&symbols=GTQ`);
    const data = await apiResponse.json();
    if (data.error) {
      return res.status(data.status).json({
        'error': data.error,
        'message': data.description
      });
    }
    return res.status(200).json({
      'status': 'Success',
      data
    });
  } catch (e) {
    return res.status(400).json({
      'error': e,
      'message': 'Request to currency exchange API failed.'
    });
  }

};

/**
 * Validates transaction data
 */
const validateTransaction = (data: any): void => {
  const requiredFields = [ 'teamId', 'teamType', 'teamPlanetCode', 'type', 'amount', 'date', 'description' ];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (data.type !== 'credit' && data.type !== 'debit') {
    throw new Error('Invalid transaction type. Must be "credit" or "debit"');
  }

  if (typeof data.amount !== 'number' || data.amount < 0) {
    throw new Error('Amount must be a non-negative number');
  }

  if (typeof data.date !== 'number' || isNaN(data.date)) {
    throw new Error('Date must be a valid timestamp');
  }
};

/**
 * Create or update a transaction document in CouchDB
 * @param req - Express request with transaction data
 * @param res - Express response
 */
export const submitTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teamId, teamType, teamPlanetCode, type, description, amount, date, receiptImages, status } = req.body;

    validateTransaction(req.body);

    const transactionDoc: TransactionDoc = {
      'docType': 'transaction',
      teamId,
      teamType,
      teamPlanetCode,
      type,
      'amount': Number(amount),
      'date': Number(date),
      description,
      ...(status ? { status } : {}),
      ...(receiptImages ? { receiptImages } : {}),
      // _attachments will be set by the caller if needed
    };

    // Check if this is an update (has _id)
    if (req.body._id) {
      transactionDoc._id = req.body._id;

      // Fetch existing document to get _rev
      const existingDoc = await teamsDB.get(req.body._id);
      transactionDoc._rev = existingDoc._rev;

      // Preserve attachments if updating
      if ((existingDoc as any)._attachments) {
        transactionDoc._attachments = (existingDoc as any)._attachments;
      }
    }

    // Save document to CouchDB
    const response = await (teamsDB as any).post(transactionDoc);

    res.status(201).json({
      'status': 'Success',
      'couchDBResponse': response
    });
  } catch (error: any) {

    if (error.status === 404) {
      res.status(404).json({
        'error': 'Not Found',
        'message': 'Team document not found'
      });
    } else if (error.status === 409) {
      res.status(409).json({
        'error': 'Conflict',
        'message': 'Document update conflict. Please refresh and try again.'
      });
    } else {
      res.status(500).json({
        'error': 'Internal Server Error',
        'message': error.message || 'Failed to save transaction'
      });
    }
  }
};

