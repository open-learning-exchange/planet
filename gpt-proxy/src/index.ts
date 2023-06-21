import express, {Request, Response, NextFunction} from 'express';
import {chatWithGpt} from './services/gpt-prompt.service';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

app.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userInput = req.body.content;

    if (userInput && typeof userInput === 'string') {
      const response = await chatWithGpt(userInput);
      res.status(200).json({
        message: 'Success',
        chat: response?.completionText,
        history: response?.history,
        couchDBResponse: response?.couchSaveResponse
      });
    } else {
      res.status(400).json({error: 'Bad Request', message: 'The "content" field must be a non-empty string.'});
    }
  } catch (error) {
    next(error);
  }
});

app.use((err: Error, req: Request, res: Response) => {
  res.status(500).json({error: 'Internal Server Error', message: err.message});
});

const port = process.env.PORT || 5000;

app.listen(port, () => console.log(`Server running on port ${port}`)); // eslint-disable-line no-console
