import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const perplexity = new OpenAI({
  'apiKey': process.env.PERPLEXITY_API_KEY || '',
  'baseURL': 'https://api.perplexity.ai',
});

export default perplexity;
