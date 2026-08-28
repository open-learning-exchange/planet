import { FormBuilder } from '@angular/forms';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ChatService } from '../../shared/chat.service';
import { StateService } from '../../shared/state.service';
import { UserService } from '../../shared/user.service';
import { ChatWindowComponent } from './chat-window.component';

const createComponent = () => {
  const error$ = new Subject<string>();
  const chatService = {
    newChatSelected$: new Subject<void>(),
    selectedConversationId$: new BehaviorSubject<object | null>(null),
    toggleAIService$: new Subject<string>(),
    listAIProviders: vi.fn().mockReturnValue(of([])),
    getErrorStream: vi.fn().mockReturnValue(error$),
    getChatStream: vi.fn().mockReturnValue(new Subject<string>()),
    getChatAIProvider: vi.fn().mockReturnValue(undefined),
    setChatAIProvider: vi.fn(),
    chatErrorMessage: vi.fn((error, fallback) => error?.message || fallback || 'Chat request failed'),
    getPrompt: vi.fn().mockReturnValue(of({
      chat: 'answer', citations: [], couchDBResponse: { id: 'chat1', rev: '1-a' }
    })),
    findConversations: vi.fn(),
    sendNewChatAddedSignal: vi.fn(),
    sendUserInput: vi.fn(),
    initializeWebSocket: vi.fn(),
    closeWebSocket: vi.fn()
  };
  const component = new ChatWindowComponent(
    chatService as unknown as ChatService,
    new FormBuilder().nonNullable,
    { configuration: { streaming: false } } as StateService,
    { get: () => ({ name: 'amara' }) } as unknown as UserService
  );
  component.conversations = [];
  component.createForm();
  return { component, chatService, error$ };
};

describe('ChatWindowComponent', () => {
  it('uses the first enabled provider rather than a hidden OpenAI fallback', () => {
    const { component, chatService } = createComponent();
    component.providers = [ { name: 'perplexity' } ];
    component.promptForm.controls.prompt.setValue('hello');

    component.submitPrompt();

    expect(chatService.getPrompt).toHaveBeenCalledWith(expect.objectContaining({
      aiProvider: { name: 'perplexity' }
    }), true);
    expect(chatService.setChatAIProvider).toHaveBeenCalledWith({ name: 'perplexity' });
  });

  it('falls back when the previously selected provider is no longer enabled', () => {
    const { component, chatService } = createComponent();
    component.provider = { name: 'deepseek' };
    component.providers = [ { name: 'openai' } ];
    component.promptForm.controls.prompt.setValue('hello');

    component.submitPrompt();

    expect(chatService.getPrompt).toHaveBeenCalledWith(expect.objectContaining({
      aiProvider: { name: 'openai' }
    }), true);
  });

  it('uses an attachment-capable provider for course resources instead of a replayed selection', () => {
    const { component, chatService } = createComponent();
    component.context = {
      type: 'coursestep',
      resource: { id: 'resource-1', attachments: { 'guide.pdf': { content_type: 'application/pdf' } } }
    };
    component.provider = { name: 'gemini', capabilities: [ 'chat' ] };
    component.providers = [
      component.provider,
      {
        name: 'openai',
        capabilities: [ 'chat', 'fileSearch' ],
        fileSearchContentTypes: [ 'application/pdf' ]
      }
    ];
    component.promptForm.controls.prompt.setValue('summarize the guide');

    component.submitPrompt();

    expect(chatService.getPrompt).toHaveBeenCalledWith(expect.objectContaining({
      aiProvider: {
        name: 'openai',
        capabilities: [ 'chat', 'fileSearch' ],
        fileSearchContentTypes: [ 'application/pdf' ]
      }
    }), true);
    expect(chatService.setChatAIProvider).not.toHaveBeenCalled();
  });

  it('does not switch providers for attachments that file search cannot use', () => {
    const { component, chatService } = createComponent();
    component.context = {
      type: 'coursestep',
      resource: { id: 'resource-1', attachments: { 'video.mp4': { content_type: 'video/mp4' } } }
    };
    component.provider = { name: 'gemini', capabilities: [ 'chat' ] };
    component.providers = [
      component.provider,
      {
        name: 'openai',
        capabilities: [ 'chat', 'fileSearch' ],
        fileSearchContentTypes: [ 'application/pdf' ]
      }
    ];
    component.promptForm.controls.prompt.setValue('explain the course step');

    component.submitPrompt();

    expect(chatService.getPrompt).toHaveBeenCalledWith(expect.objectContaining({
      aiProvider: component.provider
    }), true);
    expect(chatService.setChatAIProvider).toHaveBeenCalledWith(component.provider);
  });

  it('renders the sanitized gateway reason for non-streaming failures', () => {
    const { component, chatService } = createComponent();
    component.providers = [ { name: 'gemini' } ];
    component.promptForm.controls.prompt.setValue('hello');
    chatService.getPrompt.mockReturnValue(throwError({
      message: 'Http failure response', error: { message: 'AI provider "gemini" is not configured' }
    }));

    component.submitPrompt();

    expect(component.conversations[0]).toMatchObject({
      query: 'hello', response: 'Error: AI provider "gemini" is not configured', error: true
    });
  });

  it('finishes cleanly when a non-streaming response has an empty body', () => {
    const { component, chatService } = createComponent();
    component.providers = [ { name: 'openai' } ];
    component.promptForm.controls.prompt.setValue('hello');
    chatService.getPrompt.mockReturnValue(of(null));

    expect(() => component.submitPrompt()).not.toThrow();

    expect(component.conversations).toHaveLength(1);
    expect(component.spinnerOn).toEqual(true);
    expect(component.promptForm.controls.prompt.value).toEqual('');
  });

  it('clears the streaming lock when an error arrives after the pending turn was replaced', () => {
    const { component, error$ } = createComponent();
    component.streaming = true;
    component.providers = [ { name: 'openai' } ];
    component.promptForm.controls.prompt.setValue('hello');
    component.initializeErrorStream();
    component.submitPrompt();
    component.conversations = [];

    error$.next('WebSocket connection closed');

    expect(component.streamingPending).toEqual(false);
  });

  it('marks the pending turn failed without splitting off partial streaming output', () => {
    const { component, chatService, error$ } = createComponent();
    component.streaming = true;
    component.providers = [ { name: 'openai' } ];
    component.promptForm.controls.prompt.setValue('hello');
    component.initializeErrorStream();

    component.submitPrompt();
    component.conversations[0].response = 'partial answer';
    error$.next('Provider stream failed');

    expect(chatService.sendUserInput).toHaveBeenCalled();
    expect(component.conversations).toHaveLength(1);
    expect(component.conversations[0]).toMatchObject({
      query: 'hello',
      response: 'partial answer\n\nError: Provider stream failed',
      error: true
    });
    expect(component.streamingPending).toEqual(false);
  });

  it('cancels the active stream and ignores its late frames when changing chats', () => {
    const { component, chatService } = createComponent();
    component.streaming = true;
    component.providers = [ { name: 'openai' } ];
    component.promptForm.controls.prompt.setValue('hello');
    component.submitPrompt();

    component.resetConversation();

    expect(chatService.closeWebSocket).toHaveBeenCalled();
    expect(chatService.initializeWebSocket).not.toHaveBeenCalled();
    expect(() => component.handleIncomingMessage({ type: 'partial', response: 'late' })).not.toThrow();
    expect(component.conversations).toEqual([]);
    expect(component.streamingPending).toEqual(false);
  });
});
