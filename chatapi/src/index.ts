import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import { chat, chatNoSave } from './services/chat.service';

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
    const { data, save } = req.body;

    if (!save) {
      const response = await chatNoSave(data.content);
      res.status(200).json({
        'status': 'Success',
        'chat': response
      });
    } else if (save && data && typeof data === 'object') {
      const response = await chat(data);
      res.status(201).json({
        'status': 'Success',
        'chat': response?.completionText,
        'couchDBResponse': response?.couchSaveResponse
      });
    } else {
      res.status(400).json({ 'error': 'Bad Request', 'message': 'The "data" field must be a non-empty object' });
    }
  } catch (error: any) {
    res.status(500).json({ 'error': 'Internal Server Error', 'message': error.message });
  }
});

const port = process.env.SERVE_PORT || 5000;

app.listen(port, () => console.log(`Server running on port ${port}`)); // eslint-disable-line no-console
