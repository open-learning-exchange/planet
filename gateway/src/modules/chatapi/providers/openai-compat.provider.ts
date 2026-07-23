import OpenAI from 'openai';

import { ProviderChatRequest, ProviderChatResult } from '../models/chat.model';

/**
 * Adapter for providers exposing an OpenAI-compatible Chat Completions API
 * (Perplexity, DeepSeek, Gemini). Instructions are injected as a system
 * message since these providers have no separate instructions channel.
 */
export async function compatChat(client: OpenAI, request: ProviderChatRequest): Promise<ProviderChatResult> {
  const history = request.messages.map(({ role, content }) => ({ role, content } as OpenAI.Chat.ChatCompletionMessageParam));
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = request.instructions
    ? [ { 'role': 'system', 'content': request.instructions }, ...history ]
    : history;

  if (!request.onDelta) {
    const completion = await client.chat.completions.create({ 'model': request.model, messages });
    const text = completion.choices[0]?.message?.content;
    if (!text) {
      throw new Error('Unexpected AI response');
    }
    return { text, 'citations': [] };
  }

  const stream = await client.chat.completions.create({ 'model': request.model, messages, 'stream': true });
  let text = '';
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content || '';
    if (delta) {
      text += delta;
      request.onDelta(delta);
    }
  }
  return { text, 'citations': [] };
}
