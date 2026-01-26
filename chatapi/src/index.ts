import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import WebSocket from 'ws';

import { chat } from './services/chat.service';
import { getWelcome, createChat, checkProviders } from './controllers/chat.controller';
import { isValidData } from './utils/validation.utils';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
// Parse JSON bodies (as sent by API clients)
app.use(express.json());

app.get('/', getWelcome);

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
      } else {
        ws.send(JSON.stringify({ 'error': 'Internal Server Error', 'message': error.message }));
      }
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed'); // eslint-disable-line no-console
  });
});

app.post('/', createChat);

app.get('/checkproviders', checkProviders);

const port = process.env.SERVE_PORT || 5000;

server.listen(port, () => console.log(`Server running on port ${port}`)); // eslint-disable-line no-console
