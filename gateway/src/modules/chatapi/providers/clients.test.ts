import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ 'getKeys': vi.fn(), 'getConfiguration': vi.fn() }));

vi.mock('../../../services/config.service', () => ({ 'getConfiguration': mocks.getConfiguration }));
vi.mock('../../../services/keys.service', () => ({ 'getKeys': mocks.getKeys }));

import { listProviders, providerClient } from './clients';
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

  it('refuses a provider without a key, and a name that is not a provider', async () => {
    await expect(providerClient('openai')).rejects.toThrow('openai is not configured');
    await expect(providerClient('constructor' as ProviderName)).rejects.toThrow('Unsupported AI provider');
  });
});
