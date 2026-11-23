import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ 'getKeys': vi.fn(), 'getConfiguration': vi.fn() }));

vi.mock('../../../services/config.service', () => ({ 'getConfiguration': mocks.getConfiguration }));
vi.mock('../../../services/keys.service', () => ({ 'getKeys': mocks.getKeys }));

import { listProviders, providerClient } from './clients';
import { AIProvider } from '../models/chat.model';
import { ProviderName } from './registry';

describe('provider clients', () => {
  beforeEach(() => {
    mocks.getKeys.mockResolvedValue({ 'deepseek': 'ds-key', 'gemini': 'gemini-key' });
    mocks.getConfiguration.mockResolvedValue({ 'models': { 'openai': 'openai-model', 'deepseek': 'deepseek-model' } });
  });

  it('lists every AI provider, configured only with both a key and a model', async () => {
    expect(await listProviders()).toEqual([
      { 'name': 'openai', 'label': 'OpenAI', 'configured': false },
      { 'name': 'perplexity', 'label': 'Perplexity', 'configured': false },
      { 'name': 'deepseek', 'label': 'DeepSeek', 'configured': true },
      { 'name': 'gemini', 'label': 'Gemini', 'configured': false }
    ]);
  });

  it('refuses a name that is not a provider with 400, and a provider without a key or a model with 503', async () => {
    await expect(providerClient({ 'name': 'constructor' as ProviderName })).rejects.toMatchObject({ 'statusCode': 400 });
    await expect(providerClient({} as any)).rejects.toMatchObject({ 'statusCode': 400 });
    await expect(providerClient({ 'name': 'openai' })).rejects.toMatchObject({ 'statusCode': 503 });
    await expect(providerClient({ 'name': 'gemini' })).rejects.toMatchObject({ 'statusCode': 503 });
    await expect(providerClient({ 'name': 'deepseek' })).resolves.toMatchObject({ 'model': 'deepseek-model' });
  });

  it('uses the saved model, whatever model the turn sends', async () => {
    const costly = { 'name': 'deepseek', 'model': 'deepseek-costly' } as AIProvider;
    await expect(providerClient(costly)).resolves.toMatchObject({ 'model': 'deepseek-model' });
  });

  it('answers a turn that names no provider with the first configured one, or 503 when there is none', async () => {
    await expect(providerClient()).resolves.toMatchObject({ 'name': 'deepseek', 'model': 'deepseek-model' });
    mocks.getKeys.mockResolvedValue({ 'gemini': 'gemini-key' });
    await expect(providerClient()).rejects.toMatchObject({ 'statusCode': 503 });
  });
});
