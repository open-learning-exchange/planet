import { Request, Response } from 'express';
import { key } from '../config/currency-provider.config';

// See https://docs.openexchangerates.org/reference/historical-json
const OPENEXCHANGERATES_MIN_YEAR = 1999;

const isValidDate = (dateString: string, timestamp: number): boolean => {

  if (dateString === 'Invalid Date' || timestamp > Date.now()) {
    return false;
  }

  const [ year ]: number[] = dateString.split('-').map((v) => parseInt(v, 10));

  if (year < 1999) {
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
    return res.status(201).json({
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
