import express from 'express';
import { chatWithGpt } from './services/gpt-prompt.service';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import WebSocket from 'ws';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
// Parse JSON bodies (as sent by API clients)
app.use(express.json());

app.get('/', (req: any, res: any) => {
  res.status(200).json({
    'status': 'Success',
    'message': 'OLE Chat API Service',
  });
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    try {
      const userInput = message.toString();

      if (userInput && typeof userInput === 'string') {
        await chatWithGpt(userInput, true, (response) => {
          ws.send(response);
        });
      }
    } catch (error: any) {
      throw new Error(error);
    }
  });
});

app.post('/', async (req: any, res: any) => {
  try {
    const { content } = req.body;

    if (content && typeof content === 'string') {
      const response = await chatWithGpt(content, false);
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

server.listen(port, () => console.log(`Server running on port ${port}`)); // eslint-disable-line no-console
