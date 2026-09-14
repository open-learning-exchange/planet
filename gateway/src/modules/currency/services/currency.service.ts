import { Request, Response } from 'express';
import { key } from '../config/currency-provider.config';

export const getCurrencyRate = async (req: Request, res: Response) => {

  try {
    const apiResponse = await fetch(`https://v6.exchangerate-api.com/v6/${key}/pair/USD/GTQ`);
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
