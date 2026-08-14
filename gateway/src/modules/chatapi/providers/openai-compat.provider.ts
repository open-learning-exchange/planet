import OpenAI from 'openai';

import { ProviderChatRequest, ProviderChatResult } from '../models/chat.model';
import { ProviderError } from '../utils/http-error';

const isUsableTextCompletion = (text: string, finishReason: string | null): boolean =>
  !!text && (finishReason === null || finishReason === 'stop' || finishReason === 'length' ||
    finishReason === 'content_filter' || finishReason === 'tool_calls');

/** Run chat through providers exposing an OpenAI-compatible Chat Completions API. */
export async function compatChat(client: OpenAI, request: ProviderChatRequest): Promise<ProviderChatResult> {
  const history = request.messages
    .map(({ role, content }) => ({ role, content } as OpenAI.Chat.ChatCompletionMessageParam));
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = request.instructions
    ? [ { 'role': 'system', 'content': request.instructions }, ...history ]
    : history;

  if (!request.onDelta) {
    const completion = await client.chat.completions.create(
      { 'model': request.model, messages },
      { 'signal': request.signal }
    );
    const choice = completion.choices[0];
    if (!choice) {
      throw new ProviderError('Unexpected AI response');
    }
    const text = choice.message?.content || '';
    if (!isUsableTextCompletion(text, choice.finish_reason)) {
      throw new ProviderError(text ? 'AI response incomplete' : 'Unexpected AI response');
    }
    return { text, 'citations': [] };
  }

  const stream = await client.chat.completions.create(
    { 'model': request.model, messages, 'stream': true },
    { 'signal': request.signal }
  );
  let text = '';
  let finishReason: string | null = null;
  for await (const chunk of stream) {
    const choice = chunk.choices?.[0];
    const delta = choice?.delta?.content || '';
    finishReason = choice?.finish_reason || finishReason;
    if (delta) {
      text += delta;
      request.onDelta(delta);
    }
  }
  if (!isUsableTextCompletion(text, finishReason)) {
    throw new ProviderError(text ? 'AI response incomplete' : 'Unexpected AI response');
  }
  return { text, 'citations': [] };
}
