import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export default gemini;

