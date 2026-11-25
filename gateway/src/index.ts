import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import http from 'http';
import WebSocket from 'ws';

import { authenticateUpgrade, OpenRoute, requireSessionExcept } from './middleware/auth';
import { respondWithError } from './middleware/errors';
import { browserCors } from './middleware/origin';
import { registerChatApiRoutes, registerChatApiWebSocket } from './modules/chatapi/register';
import { registerPublicRoutes } from './modules/public/register';
import { registerCurrencyRoutes } from './modules/currency/register';
import { registerKeyRoutes } from './modules/keys/register';
import { registerParentRoutes } from './modules/parent/register';
import { getConfiguration } from './services/config.service';
import { getKeys } from './services/keys.service';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ 'noServer': true });

const openRoutes: OpenRoute[] = [
  { 'methods': [ 'GET', 'HEAD' ], 'path': /^\/$/ },
  { 'methods': [ 'GET', 'HEAD' ], 'path': /^\/checkproviders\/?$/i },
  { 'methods': [ 'GET', 'HEAD', 'POST' ], 'path': /^\/public\/surveys\//i },
  // nginx's subrequest, which carries no session: logout's parent DELETE comes after the local one
  { 'methods': [ 'GET' ], 'path': /^\/parent-check$/ }
];

app.use(browserCors);
app.use(requireSessionExcept(openRoutes));
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
registerCurrencyRoutes(app);
registerKeyRoutes(app);
registerParentRoutes(app);
server.on('upgrade', authenticateUpgrade(wss));

app.use(respondWithError);

const port = Number(process.env.SERVE_PORT || 5000);

server.listen(port, () => console.log(`Gateway running on port ${port}`)); // eslint-disable-line no-console

// A failed read is logged, and the next request tries again
getConfiguration().catch(() => undefined);
getKeys('ai').catch(() => undefined);
