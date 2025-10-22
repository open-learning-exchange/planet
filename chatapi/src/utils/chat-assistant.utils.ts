import { assistant, keys } from '../config/ai-providers.config';
import { ChatMessage } from '../models/chat.model';

type ResponseInputMessage = {
  role: 'system' | 'user' | 'assistant' | 'developer';
  content: Array<{ type: 'text'; text: string }>;
};

type AssistantResponseParams = {
  model: string;
  input: ResponseInputMessage[];
  instructions?: string;
  tools?: Array<Record<string, any>>;
  response_format?: Record<string, any> | string;
  parallel_tool_calls?: boolean;
};

const DEFAULT_ASSISTANT_TOOLS: Array<Record<string, any>> = [ { 'type': 'code_interpreter' } ];

const buildInstructions = (contextData?: string): string | undefined => {
  const instructions: string[] = [];

  if (assistant?.instructions) {
    instructions.push(assistant.instructions);
  }

  if (contextData) {
    instructions.push(contextData);
  }

  if (instructions.length === 0) {
    return undefined;
  }

  return instructions.join('\n\n');
};

const toResponseMessage = (message: ChatMessage): ResponseInputMessage => ({
  'role': message.role,
  'content': [ { 'type': 'text', 'text': message.content } ]
});

const extractTextFromOutput = (output: any): string => {
  if (!output) {
    return '';
  }

  if (typeof output === 'string') {
    return output;
  }

  if (Array.isArray(output)) {
    return output.map(extractTextFromOutput).join('');
  }

  if (output.type === 'output_text' && typeof output.text === 'string') {
    return output.text;
  }

  if (Array.isArray(output.content)) {
    return output.content.map(extractTextFromOutput).join('');
  }

  if (output.results) {
    return extractTextFromOutput(output.results);
  }

  if (output.logs) {
    return String(output.logs);
  }

  return '';
};

const extractResponseText = (response: any): string => {
  if (!response) {
    return '';
  }

  if (typeof response.output_text === 'string') {
    return response.output_text;
  }

  if (Array.isArray(response.output_text)) {
    return response.output_text.join('');
  }

  if (Array.isArray(response.output)) {
    return response.output.map(extractTextFromOutput).join('');
  }

  if (response.response && typeof response.response === 'object') {
    return extractResponseText(response.response);
  }

  return '';
};

const extractDeltaText = (event: any): string => {
  if (!event) {
    return '';
  }

  if (typeof event.delta === 'string') {
    return event.delta;
  }

  if (Array.isArray(event.delta)) {
    return event.delta.map(extractTextFromOutput).join('');
  }

  if (event.type === 'response.code_interpreter_call.completed') {
    return extractTextFromOutput(event.code_interpreter_call?.results);
  }

  if (event.snapshot) {
    return extractTextFromOutput(event.snapshot);
  }

  if (event.response) {
    return extractResponseText(event.response);
  }

  return '';
};

export const buildAssistantResponseParams = (
  messages: ChatMessage[],
  model: string,
  contextData?: string
): AssistantResponseParams => {
  const instructions = buildInstructions(contextData);
  const inputMessages = messages.map(toResponseMessage);

  const params: AssistantResponseParams = {
    model,
    input: inputMessages,
  };

  if (instructions) {
    params.instructions = instructions;
  }

  if (assistant?.tools?.length) {
    params.tools = assistant.tools;
  } else {
    params.tools = DEFAULT_ASSISTANT_TOOLS;
  }

  if (assistant?.response_format) {
    params.response_format = assistant.response_format;
  }

  if (assistant?.parallel_tool_calls !== undefined) {
    params.parallel_tool_calls = assistant.parallel_tool_calls;
  }

  return params;
};

export const createAssistantResponse = async (params: AssistantResponseParams): Promise<string> => {
  const response = await keys.openai.responses.create(params);
  const text = extractResponseText(response);

  if (!text) {
    throw new Error('Unable to retrieve response from assistant');
  }

  return text;
};

export const createAssistantResponseStream = async (
  params: AssistantResponseParams,
  callback?: (response: string) => void
): Promise<string> => {
  const stream = await keys.openai.responses.stream(params);
  let completionText = '';
  let finalResponseText = '';

  try {
    for await (const event of stream) {
      const deltaText = extractDeltaText(event);
      if (deltaText) {
        completionText += deltaText;
        if (callback) {
          callback(deltaText);
        }
      }

      if (!finalResponseText && event.type === 'response.completed') {
        finalResponseText = extractResponseText(event.response);
      }
    }

    if (!finalResponseText) {
      const response = await stream.finalResponse();
      finalResponseText = extractResponseText(response);
    }

    if (finalResponseText) {
      if (!completionText) {
        completionText = finalResponseText;
        if (callback) {
          callback(finalResponseText);
        }
      } else if (finalResponseText.startsWith(completionText)) {
        const remainder = finalResponseText.slice(completionText.length);
        if (remainder && callback) {
          callback(remainder);
        }
        completionText = finalResponseText;
      } else {
        completionText = finalResponseText;
      }
    }

    return completionText;
  } finally {
    await stream.done().catch(() => undefined);
  }
};

export const parseAssistantResponseText = extractResponseText;
