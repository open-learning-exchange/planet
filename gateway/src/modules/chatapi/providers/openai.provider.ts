import OpenAI from 'openai';

import { ChatMessage, Citation, ProviderChatRequest, ProviderChatResult } from '../models/chat.model';

const toInput = (messages: ChatMessage[]): OpenAI.Responses.ResponseInput =>
  messages.map((message) => ({ 'role': message.role, 'content': message.content }));

const collectCitations = (response: OpenAI.Responses.Response | undefined): Citation[] => {
  const citations: Citation[] = [];
  const seen = new Set<string>();
  for (const item of response?.output || []) {
    if (item.type !== 'message') {
      continue;
    }
    for (const part of item.content || []) {
      if (part.type !== 'output_text') {
        continue;
      }
      for (const annotation of part.annotations || []) {
        if (annotation.type !== 'file_citation') {
          continue;
        }
        const title = (annotation as { filename?: string }).filename || annotation.file_id;
        if (!seen.has(title)) {
          seen.add(title);
          citations.push({ title, 'fileId': annotation.file_id });
        }
      }
    }
  }
  return citations;
};

const buildParams = (request: ProviderChatRequest): OpenAI.Responses.ResponseCreateParamsNonStreaming => ({
  'model': request.model,
  'input': toInput(request.messages),
  'instructions': request.instructions || undefined,
  'tools': request.vectorStoreIds?.length
    ? [ { 'type': 'file_search', 'vector_store_ids': request.vectorStoreIds } ]
    : undefined,
  'text': request.jsonSchema
    ? { 'format': { 'type': 'json_schema', 'name': request.jsonSchema.name, 'schema': request.jsonSchema.schema, 'strict': true } }
    : undefined
});

/**
 * OpenAI adapter on the Responses API (the Assistants API sunsets 2026-08-26).
 * Handles streaming via typed server-sent events and surfaces file_search
 * citations from output annotations.
 */
export async function openaiChat(client: OpenAI, request: ProviderChatRequest): Promise<ProviderChatResult> {
  if (!request.onDelta) {
    const response = await client.responses.create(buildParams(request));
    if (!response.output_text) {
      throw new Error('Unexpected AI response');
    }
    return { 'text': response.output_text, 'responseId': response.id, 'citations': collectCitations(response) };
  }

  const streamingParams: OpenAI.Responses.ResponseCreateParamsStreaming = { ...buildParams(request), 'stream': true };
  const stream = await client.responses.create(streamingParams);
  let streamedText = '';
  let finalResponse: OpenAI.Responses.Response | undefined;
  for await (const event of stream) {
    if (event.type === 'response.output_text.delta') {
      streamedText += event.delta;
      request.onDelta(event.delta);
    } else if (event.type === 'response.completed') {
      finalResponse = event.response;
    } else if (event.type === 'response.failed') {
      throw new Error(event.response.error?.message || 'AI response failed');
    } else if (event.type === 'error') {
      throw new Error(event.message || 'AI response failed');
    }
  }
  return {
    'text': finalResponse?.output_text || streamedText,
    'responseId': finalResponse?.id,
    'citations': collectCitations(finalResponse)
  };
}
