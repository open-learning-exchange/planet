import OpenAI from 'openai';

import { ProviderChatRequest, ProviderChatResult } from '../models/chat.model';

// A denylist, so providers' own reasons (end_turn, differently cased length limits) and a missing one still count as finished
const UNUSABLE_FINISH_REASONS = new Set([ 'content_filter', 'tool_calls', 'function_call', 'insufficient_system_resource' ]);

const requireUsableText = (text: string, finishReason?: string | null): string => {
  if (UNUSABLE_FINISH_REASONS.has(finishReason || '')) {
    throw new Error(`AI response ended with ${finishReason}`);
  }
  if (!text.trim()) {
    throw new Error('Unexpected AI response');
  }
  return text;
};

export async function compatChat(client: OpenAI, request: ProviderChatRequest): Promise<ProviderChatResult> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = request.instructions
    ? [ { 'role': 'system', 'content': request.instructions }, ...request.messages ]
    : request.messages;

  if (!request.onDelta) {
    const completion = await client.chat.completions.create({ 'model': request.model, messages }, { 'signal': request.signal });
    const choice = completion.choices?.[0];
    return { 'text': requireUsableText(choice?.message?.content || '', choice?.finish_reason), 'citations': [] };
  }

  const stream = await client.chat.completions.create({ 'model': request.model, messages, 'stream': true }, { 'signal': request.signal });
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
  return { 'text': requireUsableText(text, finishReason), 'citations': [] };
}
