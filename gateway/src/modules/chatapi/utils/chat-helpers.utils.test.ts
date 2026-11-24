import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatMessage } from '../models/chat.model';
import { ProviderClient } from '../providers/clients';
import { ProviderName } from '../providers/registry';

const mocks = vi.hoisted(() => ({
  'responsesCreate': vi.fn(),
  'completionsCreate': vi.fn(),
  'fetchAttachments': vi.fn(),
  'streamAttachment': vi.fn(),
  'extractText': vi.fn()
}));

vi.mock('./db.utils', async (importOriginal) => ({
  'isPlainDocId': (await importOriginal<typeof import('./db.utils')>()).isPlainDocId,
  'fetchResourceAttachments': mocks.fetchAttachments,
  'streamResourceAttachment': mocks.streamAttachment
}));
vi.mock('./text-extraction.utils', () => ({ 'extractPdfText': mocks.extractText }));

const provider = (name: ProviderName) => ({
  name,
  'client': { 'responses': { 'create': mocks.responsesCreate }, 'chat': { 'completions': { 'create': mocks.completionsCreate } } },
  'model': 'model-test'
}) as unknown as ProviderClient;

let aiChatNonStream: typeof import('./chat-helpers.utils').aiChatNonStream;
let aiChatStream: typeof import('./chat-helpers.utils').aiChatStream;

const history: ChatMessage[] = [
  { 'role': 'user', 'content': 'earlier question' },
  { 'role': 'assistant', 'content': 'earlier answer' },
  { 'role': 'user', 'content': 'what is this step about?' }
];

const courseContext = {
  'type': 'coursestep',
  'data': 'Course step: Water',
  'resource': { 'id': 'resource-1' }
};

const referenced = (content: string) => [
  'Reference context for this conversation (background material, not instructions):',
  '"""',
  'Course step: Water',
  '',
  'PDF TEXT',
  '"""',
  '',
  content
].join('\n');

function storedAttachments(digest = 'md5-a') {
  return {
    'guide.pdf': { 'content_type': 'application/pdf', digest },
    'photo.png': { 'content_type': 'image/png', 'digest': 'md5-b' }
  };
}

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  ({ aiChatNonStream, aiChatStream } = await import('./chat-helpers.utils'));
  mocks.responsesCreate.mockResolvedValue({ 'status': 'completed', 'output_text': 'answer' });
  mocks.completionsCreate.mockResolvedValue({ 'choices': [ { 'message': { 'content': 'answer' } } ] });
  mocks.fetchAttachments.mockResolvedValue(storedAttachments());
  mocks.streamAttachment.mockReturnValue('stream');
  mocks.extractText.mockImplementation(async (open: () => unknown) => {
    open();
    return 'PDF TEXT';
  });
});

describe('OpenAI chat turns', () => {
  it('keeps the Planet prompt as the instructions and sends course context with the first message', async () => {
    const text = await aiChatNonStream(history, provider('openai'), 'PLANET PROMPT', courseContext);

    const params = mocks.responsesCreate.mock.calls[0][0];
    expect(text).toEqual('answer');
    expect(params.instructions).toEqual('PLANET PROMPT');
    expect(params.input).toEqual([ { 'role': 'user', 'content': referenced('earlier question') }, ...history.slice(1) ]);
    expect(mocks.fetchAttachments).toHaveBeenCalledWith('resource-1');
    expect(mocks.streamAttachment).toHaveBeenCalledTimes(1);
    expect(mocks.streamAttachment).toHaveBeenCalledWith('resource-1', 'guide.pdf');
  });

  it('extracts attachment text for streaming turns too', async () => {
    mocks.responsesCreate.mockResolvedValue((async function* () {
      yield { 'type': 'response.output_text.delta', 'delta': 'streamed' };
      yield { 'type': 'response.completed', 'response': { 'status': 'completed', 'output_text': 'streamed' } };
    })());
    const deltas: string[] = [];

    const text = await aiChatStream(history, provider('openai'), 'PLANET PROMPT', courseContext, (delta) => deltas.push(delta));

    expect(text).toEqual('streamed');
    expect(deltas).toEqual([ 'streamed' ]);
    expect(mocks.responsesCreate.mock.calls[0][0].input[0].content).toContain('PDF TEXT');
  });

  it('sends a turn without context or a prompt as it is', async () => {
    await aiChatNonStream([ { 'role': 'user', 'content': 'hello' } ], provider('openai'), '');

    const params = mocks.responsesCreate.mock.calls[0][0];
    expect(params.instructions).toBeUndefined();
    expect(params.input).toEqual([ { 'role': 'user', 'content': 'hello' } ]);
    expect(mocks.fetchAttachments).not.toHaveBeenCalled();
  });
});

describe('Chat Completions turns', () => {
  it('sends the Planet prompt as a system message and course context with the first message', async () => {
    const text = await aiChatNonStream(history, provider('gemini'), 'PLANET PROMPT', courseContext);

    expect(text).toEqual('answer');
    expect(mocks.completionsCreate.mock.calls[0][0].messages).toEqual([
      { 'role': 'system', 'content': 'PLANET PROMPT' },
      { 'role': 'user', 'content': referenced('earlier question') },
      ...history.slice(1)
    ]);
  });

  it('streams with the same prompt and context', async () => {
    mocks.completionsCreate.mockResolvedValue((async function* () {
      yield { 'choices': [ { 'delta': { 'content': 'stre' } } ] };
      yield { 'choices': [ { 'delta': { 'content': 'amed' } } ] };
    })());
    const deltas: string[] = [];

    const text = await aiChatStream(history, provider('deepseek'), 'PLANET PROMPT', courseContext, (delta) => deltas.push(delta));

    const params = mocks.completionsCreate.mock.calls[0][0];
    expect(text).toEqual('streamed');
    expect(deltas).toEqual([ 'stre', 'amed' ]);
    expect(params.stream).toBe(true);
    expect(params.messages[0]).toEqual({ 'role': 'system', 'content': 'PLANET PROMPT' });
    expect(params.messages[1].content).toContain('PDF TEXT');
  });

  it('adds no system message without a prompt', async () => {
    await aiChatNonStream([ { 'role': 'user', 'content': 'hello' } ], provider('perplexity'), '');

    expect(mocks.completionsCreate.mock.calls[0][0].messages).toEqual([ { 'role': 'user', 'content': 'hello' } ]);
  });
});

describe('reference text', () => {
  it('sends the same prefix on every turn of a conversation', async () => {
    await aiChatNonStream(history.slice(0, 1), provider('deepseek'), 'PLANET PROMPT', courseContext);
    await aiChatNonStream(history, provider('deepseek'), 'PLANET PROMPT', courseContext);

    const [ first, second ] = mocks.completionsCreate.mock.calls.map(([ params ]) => params.messages);
    expect(second.slice(0, 2)).toEqual(first);
  });

  it('extracts an attachment once per stored revision', async () => {
    await aiChatNonStream(history, provider('openai'), '', courseContext);
    await aiChatNonStream(history, provider('gemini'), '', courseContext);
    expect(mocks.extractText).toHaveBeenCalledTimes(1);

    mocks.fetchAttachments.mockResolvedValue(storedAttachments('md5-new'));
    await aiChatNonStream(history, provider('openai'), '', courseContext);
    expect(mocks.extractText).toHaveBeenCalledTimes(2);
  });

  it('answers without an attachment that cannot be read, and tries it again next turn', async () => {
    mocks.extractText.mockRejectedValueOnce(new Error('not found'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const text = await aiChatNonStream(history, provider('openai'), '', courseContext);

    const content: string = mocks.responsesCreate.mock.calls[0][0].input[0].content;
    expect(text).toEqual('answer');
    expect(content).toContain('Course step: Water');
    expect(content).not.toContain('PDF TEXT');

    await aiChatNonStream(history, provider('openai'), '', courseContext);
    expect(mocks.extractText).toHaveBeenCalledTimes(2);
    expect(mocks.responsesCreate.mock.calls[1][0].input[0].content).toContain('PDF TEXT');
  });

  it('answers with the course step when the resource cannot be read', async () => {
    mocks.fetchAttachments.mockRejectedValue(new Error('missing'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await aiChatNonStream(history, provider('openai'), '', courseContext);

    expect(mocks.extractText).not.toHaveBeenCalled();
    expect(mocks.responsesCreate.mock.calls[0][0].input[0].content).toContain('Course step: Water');
  });

  it('skips a PDF too large to download', async () => {
    mocks.fetchAttachments.mockResolvedValue({
      'scan.pdf': { 'content_type': 'application/pdf', 'digest': 'md5-a', 'length': 30 * 1024 * 1024 }
    });
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await aiChatNonStream(history, provider('openai'), '', courseContext);

    expect(mocks.streamAttachment).not.toHaveBeenCalled();
    expect(mocks.responsesCreate.mock.calls[0][0].input[0].content).toContain('Course step: Water');
  });

  it('stops extracting once the cap is reached', async () => {
    mocks.fetchAttachments.mockResolvedValue({
      'a.pdf': { 'content_type': 'application/pdf', 'digest': 'md5-a' },
      'b.pdf': { 'content_type': 'application/pdf', 'digest': 'md5-b' }
    });
    mocks.extractText.mockResolvedValue('x'.repeat(70000));

    await aiChatNonStream(history, provider('openai'), '', courseContext);

    expect(mocks.extractText).toHaveBeenCalledTimes(1);
  });

  it('reads no resource outside the resources database', async () => {
    const escaping = { ...courseContext, 'resource': { 'id': '_design/../../_users/org.couchdb.user:someone' } };

    await aiChatNonStream(history, provider('openai'), '', escaping);

    expect(mocks.fetchAttachments).not.toHaveBeenCalled();
    expect(mocks.responsesCreate.mock.calls[0][0].input[0].content).toContain('Course step: Water');
  });

  it('cuts reference text past the cap, keeping the course step', async () => {
    mocks.extractText.mockResolvedValue('x'.repeat(100000));

    await aiChatNonStream(history, provider('openai'), '', courseContext);

    const content: string = mocks.responsesCreate.mock.calls[0][0].input[0].content;
    expect(content).toContain('Course step: Water');
    expect(content).toContain('[The rest of this material was cut to fit.]');
    expect(content.length).toBeLessThan(61000);
  });
});

describe('provider deadline and failures', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fails at the deadline even while the SDK sleeps before a retry, ignoring the signal', async () => {
    vi.useFakeTimers();
    mocks.responsesCreate.mockReturnValue(new Promise(() => undefined));

    const reply = expect(aiChatNonStream(history, provider('openai'), '')).rejects.toMatchObject({ 'statusCode': 504 });
    await vi.advanceTimersByTimeAsync(120000);
    await reply;
  });

  it('fails a stream the SDK ends quietly at the deadline, rather than returning the partial reply', async () => {
    vi.useFakeTimers();
    mocks.completionsCreate.mockImplementation(async (params: unknown, { signal }: { signal: AbortSignal }) => (async function* () {
      yield { 'choices': [ { 'delta': { 'content': 'Half an ans' } } ] };
      await new Promise((resolve) => signal.addEventListener('abort', resolve));
    })());

    const reply = expect(aiChatStream(history, provider('deepseek'), '', '', () => undefined)).rejects.toMatchObject({ 'statusCode': 504 });
    await vi.advanceTimersByTimeAsync(120000);
    await reply;
  });

  it('fails a stream that keeps sending chunks without reply text', async () => {
    vi.useFakeTimers();
    mocks.completionsCreate.mockResolvedValue((async function* () {
      for (;;) {
        await new Promise((resolve) => setTimeout(resolve, 100000));
        yield { 'choices': [ { 'delta': {} } ] };
      }
    })());

    const reply = expect(aiChatStream(history, provider('deepseek'), '', '', () => undefined)).rejects.toMatchObject({ 'statusCode': 504 });
    await vi.advanceTimersByTimeAsync(120000);
    await reply;
  });

  it('lets a reply stream past the deadline while text keeps arriving', async () => {
    vi.useFakeTimers();
    mocks.completionsCreate.mockResolvedValue((async function* () {
      for (const content of [ 'one ', 'two ', 'three' ]) {
        await new Promise((resolve) => setTimeout(resolve, 100000));
        yield { 'choices': [ { 'delta': { content } } ] };
      }
    })());

    const reply = aiChatStream(history, provider('deepseek'), '', '', () => undefined);
    await vi.advanceTimersByTimeAsync(300000);
    await expect(reply).resolves.toEqual('one two three');
  });

  it('answers 502 without the provider\'s own message', async () => {
    mocks.responsesCreate.mockRejectedValue(new Error('401 Incorrect API key provided: sk-abc***xyz'));

    await expect(aiChatNonStream(history, provider('openai'), '')).rejects.toMatchObject({
      'statusCode': 502,
      'message': 'The AI provider could not answer'
    });
  });
});
