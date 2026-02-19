import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import WebSocket from 'ws';

import { chat, chatNoSave } from './services/chat.service';
import { keys } from './config/ai-providers.config';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const isClientConfigError = (message: string) => [
  'The "assistant" field must be a boolean',
  'Assistant mode is only supported for the openai provider',
  'Assistant mode requires assistant configuration with both "name" and "instructions"',
  'Assistant mode requires a valid "context" object'
].includes(message);

app.use(cors());
// Parse JSON bodies (as sent by API clients)
app.use(express.json());

app.get('/', (req: any, res: any) => {
  res.status(200).json({
    'status': 'Success',
    'message': 'OLE Chat API Service',
  });
});

const isValidData = (data: any) => data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0;

// WebSocket connection handling
wss.on('connection', (ws) => {
  ws.on('message', async (data) => {
    try {
      data = JSON.parse(data.toString());
      if (!isValidData(data)) {
        ws.send(JSON.stringify({ 'error': 'Invalid data format.' }));
        return;
      }

      const chatResponse = await chat(data, true, (response) => {
        ws.send(JSON.stringify({ 'type': 'partial', response }));
      });

      if (chatResponse) {
        ws.send(JSON.stringify({
          'type': 'final',
          'completionText': chatResponse.completionText,
          'couchDBResponse': chatResponse.couchSaveResponse
        }));
      }
    } catch (error: any) {
      if (error.message === 'missing' || error.statusCode === 404 || error.error === 'not_found') {
        ws.send(JSON.stringify({ 'error': 'Not Found', 'message': 'Conversation not found' }));
      } else if (isClientConfigError(error.message)) {
        ws.send(JSON.stringify({ 'error': 'Bad Request', 'message': error.message }));
      } else {
        ws.send(JSON.stringify({ 'error': 'Internal Server Error', 'message': error.message }));
      }
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed'); // eslint-disable-line no-console
  });
});

app.post('/', async (req: any, res: any) => {
  const { data, save } = req.body;

  if (!isValidData(data)) {
    return res.status(400).json({ 'error': 'Bad Request', 'message': 'The "data" field must be a non-empty object' });
  }

  try {
    if (!save) {
      const response = await chatNoSave(data.content, data.aiProvider, data.assistant, data.context);
      return res.status(200).json({
        'status': 'Success',
        'chat': response
      });
    } else {
      const response = await chat(data, false);
      return res.status(201).json({
        'status': 'Success',
        'chat': response?.completionText,
        'couchDBResponse': response?.couchSaveResponse
      });
    }
  } catch (error: any) {
    if (error.message === 'missing' || error.statusCode === 404 || error.error === 'not_found') {
      return res.status(404).json({ 'error': 'Not Found', 'message': 'Conversation not found' });
    }
    if (isClientConfigError(error.message)) {
      return res.status(400).json({ 'error': 'Bad Request', 'message': error.message });
    }
    return res.status(500).json({ 'error': 'Internal Server Error', 'message': error.message });
  }
});

app.get('/checkproviders', async (req: any, res: any) => {
  res.status(200).json({
    'openai': keys.openai.apiKey ? true : false,
    'perplexity': keys.perplexity.apiKey ? true : false,
    'deepseek': keys.deepseek.apiKey ? true : false,
    'gemini': keys.gemini.apiKey ? true : false
  });
});

const port = process.env.SERVE_PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  server.listen(port, () => console.log(`Server running on port ${port}`)); // eslint-disable-line no-console
}

export { app };
