import { Request, Response } from 'express';
import { key } from '../config/currency-provider.config';

export const getCurrencyRate = async (req: Request, res: Response) => {

  const { timestamp } = req.params;
  const dateObject = timestamp ? new Date(parseInt(timestamp, 10)) : new Date();
  // Use Chinese locale because that matches closest to YYYY-MM-DD used in the API
  const date = dateObject.toLocaleDateString('zh-CN', {
    'timeZone': 'UTC',
    'year':'numeric',
    'month': '2-digit',
    'day': '2-digit'
  }).replace(/\//g, '-');

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
