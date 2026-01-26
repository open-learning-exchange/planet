import { chat, chatNoSave } from '../services/chat.service';
import { keys } from '../config/ai-providers.config';
import { isValidData } from '../utils/validation.utils';

export const getWelcome = (req: any, res: any) => {
  res.status(200).json({
    'status': 'Success',
    'message': 'OLE Chat API Service',
  });
};

export const createChat = async (req: any, res: any) => {
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
    return res.status(500).json({ 'error': 'Internal Server Error', 'message': error.message });
  }
};

export const checkProviders = async (req: any, res: any) => {
  res.status(200).json({
    'openai': keys.openai.apiKey ? true : false,
    'perplexity': keys.perplexity.apiKey ? true : false,
    'deepseek': keys.deepseek.apiKey ? true : false,
    'gemini': keys.gemini.apiKey ? true : false
  });
};
