import OpenAI from 'openai';

import { ChatMessage, Citation, ProviderChatRequest, ProviderChatResult } from '../models/chat.model';
import { ProviderError } from '../utils/http-error';

const toInput = (messages: ChatMessage[]): OpenAI.Responses.ResponseInput =>
  messages.map((message) => ({ 'role': message.role, 'content': message.content }));

const collectCitations = (response: OpenAI.Responses.Response | undefined): Citation[] => {
  const citations: Citation[] = [];
  const seenFileIds = new Set<string>();
  for (const item of response?.output || []) {
    if (item.type !== 'message') {
      continue;
    }
    for (const part of item.content || []) {
      if (part.type !== 'output_text') {
        continue;
      }
      for (const annotation of part.annotations || []) {
        if (annotation.type === 'file_citation' && !seenFileIds.has(annotation.file_id)) {
          seenFileIds.add(annotation.file_id);
          citations.push({ 'fileId': annotation.file_id });
        }
      }
    }
  }
  return citations;
};

const reachedOutputLimit = (response: OpenAI.Responses.Response): boolean => {
  const reason = response.incomplete_details?.reason as string | undefined;
  return response.status === 'incomplete' && reason === 'max_output_tokens';
};

const requireUsableResponse = (response: OpenAI.Responses.Response, text: string): string => {
  if (response.status === 'failed') {
    throw new ProviderError(response.error?.message || 'AI response failed');
  }
  if (response.status && response.status !== 'completed' && !reachedOutputLimit(response)) {
    throw new ProviderError('AI response incomplete');
  }
  if (!text) {
    throw new ProviderError('Unexpected AI response');
  }
  return text;
};

const buildParams = (request: ProviderChatRequest): OpenAI.Responses.ResponseCreateParamsNonStreaming => ({
  'model': request.model,
  'store': false,
  'input': toInput(request.messages),
  'instructions': request.instructions,
  'tools': request.vectorStoreIds?.length
    ? [ { 'type': 'file_search', 'vector_store_ids': request.vectorStoreIds } ]
    : undefined,
  'text': request.jsonSchema
    ? { 'format': {
      'type': 'json_schema',
      'name': request.jsonSchema.name,
      'schema': request.jsonSchema.schema,
      'strict': true
    } }
    : undefined
});

/** Run a basic or streaming chat turn through the OpenAI Responses API. */
export async function openaiChat(client: OpenAI, request: ProviderChatRequest): Promise<ProviderChatResult> {
  if (!request.onDelta) {
    const response = await client.responses.create(buildParams(request), { 'signal': request.signal });
    return {
      'text': requireUsableResponse(response, response.output_text),
      'citations': collectCitations(response)
    };
  }

  const streamingParams: OpenAI.Responses.ResponseCreateParamsStreaming = { ...buildParams(request), 'stream': true };
  const stream = await client.responses.create(streamingParams, { 'signal': request.signal });
  let streamedText = '';
  let finalResponse: OpenAI.Responses.Response | undefined;
  for await (const event of stream) {
    if (event.type === 'response.output_text.delta') {
      streamedText += event.delta;
      request.onDelta(event.delta);
    } else if (event.type === 'response.completed') {
      finalResponse = event.response;
    } else if (event.type === 'response.failed') {
      throw new ProviderError(event.response.error?.message || 'AI response failed');
    } else if (event.type === 'response.incomplete') {
      finalResponse = event.response;
    } else if (event.type === 'error') {
      throw new ProviderError(event.message || 'AI response failed');
    }
  }
  if (!finalResponse) {
    throw new ProviderError('Unexpected AI response');
  }
  const text = requireUsableResponse(finalResponse, finalResponse.output_text || streamedText);
  return { text, 'citations': collectCitations(finalResponse) };
}
