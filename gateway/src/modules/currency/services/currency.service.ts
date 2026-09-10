import { Request, Response } from 'express';

const currencyApiKey = process.env.CURRENCY_API_KEY;

export const getCurrencyRate = async (req: Request, res: Response) => {

  try {
    const apiResponse = await fetch(`https://v6.exchangerate-api.com/v6/${currencyApiKey}/pair/USD/GTQ`);
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
