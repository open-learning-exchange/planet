import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ 'getKeys': vi.fn(), 'getConfiguration': vi.fn() }));

vi.mock('../../../services/config.service', () => ({ 'getKeys': mocks.getKeys, 'getConfiguration': mocks.getConfiguration }));

import { listProviders, providerClient } from './clients';
import { ProviderName } from './registry';

describe('provider clients', () => {
  beforeEach(() => {
    mocks.getKeys.mockResolvedValue({ 'deepseek': 'ds-key', 'gemini': 'gemini-key', 'currency': 'oxr-key' });
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
    await expect(providerClient(undefined as any)).rejects.toMatchObject({ 'statusCode': 400 });
    await expect(providerClient({ 'name': 'openai' })).rejects.toMatchObject({ 'statusCode': 503 });
    await expect(providerClient({ 'name': 'gemini' })).rejects.toMatchObject({ 'statusCode': 503 });
    await expect(providerClient({ 'name': 'deepseek' })).resolves.toMatchObject({ 'model': 'deepseek-model' });
  });
});
