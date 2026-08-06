import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  'getAIConfig': vi.fn(),
  'runProviderChat': vi.fn()
}));

vi.mock('./config.service', () => ({ 'getAIConfig': mocks.getAIConfig }));
vi.mock('../providers', () => ({ 'runProviderChat': mocks.runProviderChat }));

import { analyze } from './analyze.service';

const config = () => ({
  'providers': {
    'openai': { 'name': 'openai', 'enabled': true, 'client': {}, 'defaultModel': 'gpt-test' },
    'perplexity': { 'name': 'perplexity', 'enabled': true, 'client': {}, 'defaultModel': 'sonar' },
    'deepseek': { 'name': 'deepseek', 'enabled': false, 'defaultModel': '' },
    'gemini': { 'name': 'gemini', 'enabled': false, 'defaultModel': '' }
  },
  'promptProfiles': { 'general_chat': 'G', 'course_help': 'C', 'survey_analysis': 'SURVEY PROFILE' },
  'streaming': false
});

const payload = () => ({
  'exam': { 'name': 'Community Survey', 'type': 'survey' },
  'questions': [ { 'question': 'Q1', 'type': 'select', 'responses': [ { 'response': 'A' } ] } ]
});

describe('analyze service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAIConfig.mockResolvedValue(config());
  });

  it('validates the payload', async () => {
    await expect(analyze({ 'exam': {}, 'questions': [] } as any)).rejects.toMatchObject({ 'statusCode': 400 });
    await expect(analyze({ 'exam': { 'name': 'x' }, 'questions': [] } as any)).rejects.toMatchObject({ 'statusCode': 400 });
  });

  it('requests structured output from openai and returns parsed sections', async () => {
    mocks.runProviderChat.mockResolvedValue({
      'text': JSON.stringify({ 'sections': [ { 'title': 'Individual Question Analysis', 'content': 'details' } ] }),
      'citations': []
    });
    const result = await analyze(payload());
    const request = mocks.runProviderChat.mock.calls[0][1];
    expect(request.jsonSchema?.name).toEqual('survey_analysis');
    expect(request.instructions).toEqual('SURVEY PROFILE');
    expect(request.messages[0].content).toContain('Community Survey');
    expect(result.sections).toEqual([ { 'title': 'Individual Question Analysis', 'content': 'details' } ]);
  });

  it('wraps unparsable openai output as a single section', async () => {
    mocks.runProviderChat.mockResolvedValue({ 'text': '{oops', 'citations': [] });
    const result = await analyze(payload());
    expect(result.sections).toEqual([ { 'title': 'AI Analysis', 'content': '{oops' } ]);
  });

  it('falls back to a single markdown section for non-openai providers', async () => {
    mocks.runProviderChat.mockResolvedValue({ 'text': '## Analysis\ncontent', 'citations': [] });
    const result = await analyze({ ...payload(), 'aiProvider': { 'name': 'perplexity' as const } });
    const request = mocks.runProviderChat.mock.calls[0][1];
    expect(request.jsonSchema).toBeUndefined();
    expect(result.sections).toEqual([ { 'title': 'AI Analysis', 'content': '## Analysis\ncontent' } ]);
  });
});
