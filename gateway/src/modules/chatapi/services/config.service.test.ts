import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  'configurationDB': { 'list': vi.fn() }
}));

vi.mock('../../../config/couch.config', () => ({ 'configurationDB': mocks.configurationDB }));

import { getAIConfig, resetAIConfigCache } from './config.service';
import { defaultPromptProfiles } from '../prompts/default-prompts';

const docRows = (doc: object) => ({ 'rows': [ { doc } ] });

describe('config service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAIConfigCache();
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
  });

  it('falls back through promptProfiles, legacy assistant instructions, then defaults', async () => {
    mocks.configurationDB.list.mockResolvedValue(docRows({
      'keys': {},
      'promptProfiles': { 'course_help': 'CUSTOM COURSE' },
      'assistant': { 'name': 'Planet Context', 'instructions': 'LEGACY INSTRUCTIONS' }
    }));
    const config = await getAIConfig();
    expect(config.promptProfiles.course_help).toEqual('CUSTOM COURSE');
    expect(config.promptProfiles.general_chat).toEqual('LEGACY INSTRUCTIONS');
    expect(config.promptProfiles.survey_analysis).toEqual(defaultPromptProfiles.survey_analysis);
  });

  it('caches the config within the TTL and reloads when forced', async () => {
    mocks.configurationDB.list.mockResolvedValue(docRows({ 'keys': { 'openai': 'sk-1' } }));
    await getAIConfig();
    await getAIConfig();
    expect(mocks.configurationDB.list).toHaveBeenCalledTimes(1);
    await getAIConfig(true);
    expect(mocks.configurationDB.list).toHaveBeenCalledTimes(2);
  });

  it('selects the document that carries AI config fields', async () => {
    mocks.configurationDB.list.mockResolvedValue({
      'rows': [
        { 'doc': { '_id': 'other', 'name': 'not it' } },
        { 'doc': { '_id': 'config', 'keys': { 'openai': 'sk-1' }, 'models': { 'openai': 'gpt-test' } } }
      ]
    });
    const config = await getAIConfig();
    expect(config.providers.openai.enabled).toEqual(true);
    expect(config.providers.openai.defaultModel).toEqual('gpt-test');
  });

  it('serves an empty config when CouchDB is unreachable', async () => {
    mocks.configurationDB.list.mockRejectedValue(new Error('connection refused'));
    const config = await getAIConfig();
    expect(config.providers.openai.enabled).toEqual(false);
    expect(config.promptProfiles.general_chat).toEqual(defaultPromptProfiles.general_chat);
  });
});
