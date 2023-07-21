import express from 'express';
import { chatWithGpt } from './services/gpt-prompt.service';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();

app.use(cors());
// Parse JSON bodies (as sent by API clients)
app.use(express.json());

app.get('/', (req: any, res: any) => {
  res.status(200).json({
    'status': 'Success',
    'message': 'OLE Chat API Service',
  });
});

app.post('/', async (req: any, res: any) => {
  try {
    const userInput = req.body.content;

    if (userInput && typeof userInput === 'string') {
      const response = await chatWithGpt(userInput);
      res.status(200).json({
        'status': 'Success',
        'chat': response?.completionText,
        'history': response?.history,
        'couchDBResponse': response?.couchSaveResponse
      });
    } else {
      res.status(400).json({ 'error': 'Bad Request', 'message': 'The "content" field must be a non-empty string.' });
    }
  } catch (error: any) {
    res.status(500).json({ 'error': 'Internal Server Error', 'message': error.message });
  }
});

const port = process.env.SERVE_PORT || 5000;

app.listen(port, () => console.log(`Server running on port ${port}`)); // eslint-disable-line no-console
