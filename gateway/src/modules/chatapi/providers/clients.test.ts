import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ 'getKeys': vi.fn(), 'getConfiguration': vi.fn() }));

vi.mock('../../../services/config.service', () => ({ 'getKeys': mocks.getKeys, 'getConfiguration': mocks.getConfiguration }));

import { ProviderName } from '../models/chat.model';
import { configuredProviders, providerClient } from './clients';

describe('provider clients', () => {
  beforeEach(() => {
    mocks.getKeys.mockResolvedValue({ 'deepseek': 'ds-key', 'currency': 'oxr-key' });
    mocks.getConfiguration.mockResolvedValue({ 'models': {} });
  });

  it('reports only the AI providers that have a saved key', async () => {
    expect(await configuredProviders()).toEqual({ 'openai': false, 'perplexity': false, 'deepseek': true, 'gemini': false });
  });

  it('refuses a provider without a key, and a name that is not a provider', async () => {
    await expect(providerClient('openai')).rejects.toThrow('openai is not configured');
    await expect(providerClient('constructor' as ProviderName)).rejects.toThrow('Unsupported AI provider');
  });
});
