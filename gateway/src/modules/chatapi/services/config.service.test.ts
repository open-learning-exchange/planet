import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  'configurationDB': { 'list': vi.fn() }
}));

vi.mock('../../../config/couch.config', () => ({ 'configurationDB': mocks.configurationDB }));

import { defaultPromptProfiles } from '../prompts/default-prompts';
import { getAIConfig, resetAIConfigCache } from './config.service';

const docRows = (doc: object) => ({ 'rows': [ { doc } ] });

describe('AI configuration service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAIConfigCache();
    delete process.env.AI_REQUEST_TIMEOUT_MS;
  });

  afterEach(() => {
    delete process.env.AI_REQUEST_TIMEOUT_MS;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('enables only providers with both a key and a model', async () => {
    mocks.configurationDB.list.mockResolvedValue(docRows({
      'keys': { 'openai': '', 'perplexity': 'pplx-key', 'deepseek': 'ds-key' },
      'models': { 'perplexity': 'sonar' }
    }));
    const config = await getAIConfig();
    expect(config.providers.openai.enabled).toEqual(false);
    expect(config.providers.deepseek.enabled).toEqual(false);
    expect(config.providers.perplexity.enabled).toEqual(true);
    expect(config.providers.perplexity.defaultModel).toEqual('sonar');
    expect(config.providers.perplexity.client).toBeTruthy();
    expect((config.providers.perplexity.client as any).maxRetries).toEqual(0);
  });

  it('constructs compatible provider clients with their expected base URLs', async () => {
    mocks.configurationDB.list.mockResolvedValue(docRows({
      'keys': { 'perplexity': 'pplx-key', 'deepseek': 'ds-key', 'gemini': 'gemini-key' },
      'models': { 'perplexity': 'sonar', 'deepseek': 'deepseek-chat', 'gemini': 'gemini-test' }
    }));
    const config = await getAIConfig();
    expect((config.providers.perplexity.client as any).baseURL).toEqual('https://api.perplexity.ai');
    expect((config.providers.deepseek.client as any).baseURL).toEqual('https://api.deepseek.com');
    expect((config.providers.gemini.client as any).baseURL).toEqual('https://generativelanguage.googleapis.com/v1beta/openai/');
  });

  it('falls back through prompt profiles, legacy instructions, and defaults', async () => {
    mocks.configurationDB.list.mockResolvedValue(docRows({
      'promptProfiles': { 'course_help': 'CUSTOM COURSE' },
      'assistant': { 'name': 'Planet Context', 'instructions': 'LEGACY INSTRUCTIONS' }
    }));
    const config = await getAIConfig();
    expect(config.promptProfiles.course_help).toEqual('CUSTOM COURSE');
    expect(config.promptProfiles.general_chat).toEqual('LEGACY INSTRUCTIONS');
    expect(config.promptProfiles.survey_analysis).toEqual(defaultPromptProfiles.survey_analysis);
  });

  it('composes default course help from the resolved general profile', async () => {
    mocks.configurationDB.list.mockResolvedValue(docRows({
      'promptProfiles': { 'general_chat': 'COMMUNITY GENERAL' }
    }));
    const config = await getAIConfig();
    expect(config.promptProfiles.course_help).toContain('COMMUNITY GENERAL');
    expect(config.promptProfiles.course_help).not.toContain(defaultPromptProfiles.general_chat);
  });

  it('caches the config and supports a forced reload', async () => {
    mocks.configurationDB.list.mockResolvedValue(docRows({ 'keys': { 'openai': 'sk-1' } }));
    await getAIConfig();
    await getAIConfig();
    expect(mocks.configurationDB.list).toHaveBeenCalledTimes(1);
    await getAIConfig(true);
    expect(mocks.configurationDB.list).toHaveBeenCalledTimes(2);
  });

  it('caches a Planet configuration document with no AI fields as a stable empty config', async () => {
    vi.useFakeTimers();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.configurationDB.list.mockResolvedValue(docRows({
      '_id': 'configuration',
      'name': 'Example Planet',
      'code': 'example',
      'planetType': 'community'
    }));

    const config = await getAIConfig();
    expect(config.providers.openai.enabled).toEqual(false);
    expect(config.promptProfiles.general_chat).toEqual(defaultPromptProfiles.general_chat);
    expect(config.planetCode).toEqual('example');
    expect(consoleError).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5001);
    await getAIConfig();
    expect(mocks.configurationDB.list).toHaveBeenCalledTimes(1);
  });

  it('selects the canonical Planet document before stray AI-shaped documents', async () => {
    mocks.configurationDB.list.mockResolvedValue({
      'rows': [
        { 'doc': { '_id': 'a-stray', 'keys': { 'openai': 'wrong' }, 'models': { 'openai': 'wrong-model' } } },
        {
          'doc': {
            '_id': 'z-planet',
            'code': 'local',
            'planetType': 'community',
            'keys': { 'openai': 'right' },
            'models': { 'openai': 'right-model' }
          }
        }
      ]
    });

    const config = await getAIConfig();
    expect(config.planetCode).toEqual('local');
    expect(config.providers.openai.defaultModel).toEqual('right-model');
  });

  it('runs a later CouchDB read when a forced reload overlaps an older refresh', async () => {
    let releaseFirst: ((value: ReturnType<typeof docRows>) => void) | undefined;
    mocks.configurationDB.list
      .mockImplementationOnce(() => new Promise((resolve) => { releaseFirst = resolve; }))
      .mockResolvedValueOnce(docRows({ 'promptProfiles': { 'general_chat': 'new' } }));

    const first = getAIConfig();
    const forced = getAIConfig(true);
    releaseFirst?.(docRows({ 'promptProfiles': { 'general_chat': 'old' } }));

    expect((await first).promptProfiles.general_chat).toEqual('old');
    expect((await forced).promptProfiles.general_chat).toEqual('new');
    expect((await getAIConfig()).promptProfiles.general_chat).toEqual('new');
    expect(mocks.configurationDB.list).toHaveBeenCalledTimes(2);
  });

  it('deduplicates concurrent configuration reloads', async () => {
    mocks.configurationDB.list.mockImplementation(async () => {
      await Promise.resolve();
      return docRows({ 'promptProfiles': { 'general_chat': 'CUSTOM GENERAL' } });
    });
    const [ first, second ] = await Promise.all([ getAIConfig(), getAIConfig() ]);
    expect(mocks.configurationDB.list).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  it('uses a configurable provider timeout with a safe fallback', async () => {
    process.env.AI_REQUEST_TIMEOUT_MS = '45000';
    mocks.configurationDB.list.mockResolvedValue(docRows({
      'keys': { 'openai': 'sk-1' },
      'models': { 'openai': 'gpt-test' }
    }));
    let config = await getAIConfig();
    expect((config.providers.openai.client as any).timeout).toEqual(45000);
    expect((config.providers.openai.client as any).maxRetries).toEqual(0);
    expect(config.providers.openai.requestTimeoutMs).toEqual(45000);

    process.env.AI_REQUEST_TIMEOUT_MS = 'invalid';
    config = await getAIConfig(true);
    expect((config.providers.openai.client as any).timeout).toEqual(120000);
    expect(config.providers.openai.requestTimeoutMs).toEqual(120000);
  });

  it('clamps provider timeouts to the maximum safe timer duration', async () => {
    process.env.AI_REQUEST_TIMEOUT_MS = '9999999999';
    mocks.configurationDB.list.mockResolvedValue(docRows({
      'keys': { 'openai': 'sk-1' },
      'models': { 'openai': 'gpt-test' }
    }));
    const config = await getAIConfig();
    expect(config.providers.openai.requestTimeoutMs).toEqual(2147483647);
    expect((config.providers.openai.client as any).timeout).toEqual(2147483647);
  });

  it('backs off failures briefly and recovers without waiting for the full config TTL', async () => {
    vi.useFakeTimers();
    mocks.configurationDB.list.mockRejectedValueOnce(new Error('connection refused'));
    let config = await getAIConfig();
    expect(config.providers.openai.enabled).toEqual(false);
    await getAIConfig();
    expect(mocks.configurationDB.list).toHaveBeenCalledTimes(1);

    mocks.configurationDB.list.mockResolvedValue(docRows({
      'keys': { 'openai': 'sk-1' },
      'models': { 'openai': 'gpt-test' }
    }));
    vi.advanceTimersByTime(5001);
    config = await getAIConfig();
    expect(mocks.configurationDB.list).toHaveBeenCalledTimes(2);
    expect(config.providers.openai.enabled).toEqual(true);
  });

  it('retains the last good config during a failed refresh', async () => {
    vi.useFakeTimers();
    mocks.configurationDB.list.mockResolvedValueOnce(docRows({
      'keys': { 'openai': 'sk-1' },
      'models': { 'openai': 'gpt-test' }
    }));
    expect((await getAIConfig()).providers.openai.enabled).toEqual(true);

    vi.advanceTimersByTime(30001);
    mocks.configurationDB.list.mockRejectedValueOnce(new Error('connection refused'));
    const config = await getAIConfig();
    expect(config.providers.openai.enabled).toEqual(true);
    await getAIConfig();
    expect(mocks.configurationDB.list).toHaveBeenCalledTimes(2);
  });

});
