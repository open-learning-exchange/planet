import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import WebSocket from 'ws';

import { registerChatApiRoutes, registerChatApiWebSocket } from './modules/chatapi/register';
import { registerPublicRoutes } from './modules/public/register';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors({ 'origin': true, 'credentials': true }));
// Parse JSON bodies (as sent by API clients)
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  void req;
  res.status(200).json({
    'status': 'Success',
    'message': 'OLE Gateway Service',
  });
});

registerChatApiRoutes(app);
registerPublicRoutes(app);
registerChatApiWebSocket(wss);

app.use((error: any, req: Request, res: Response, next: any) => {
  void req;
  void next;
  res.status(error?.statusCode || 500).json({
    'error': error?.name || 'Internal Server Error',
    'message': error?.message || 'Unexpected error'
  });
});

const port = Number(process.env.SERVE_PORT || 5000);

server.listen(port, () => console.log(`Gateway running on port ${port}`)); // eslint-disable-line no-console
