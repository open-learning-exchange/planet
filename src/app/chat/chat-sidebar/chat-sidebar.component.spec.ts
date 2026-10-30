import { FormBuilder } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';

import { DeviceType } from '@shared/ui/device-info.service';
import { Conversation } from '../chat.model';
import { ChatSidebarComponent } from './chat-sidebar.component';

describe('ChatSidebarComponent', () => {
  const sampleConversation: Conversation = {
    _id: 'conv-1',
    _rev: '1-abc',
    user: 'planet',
    conversations: [ { id: '1', query: 'What is OLE?', response: 'Open Learning Exchange' } ],
    title: 'Original title',
    createdDate: 1000,
    updatedDate: 2000,
    shared: true
  };

  const secondConversation: Conversation = {
    _id: 'conv-2',
    _rev: '1-xyz',
    user: 'planet',
    conversations: [ { id: '2', query: 'Hello', response: 'Hi' } ],
    title: 'Second conversation',
    createdDate: 1500,
    updatedDate: 1500
  };

  const createComponent = (conversations: Conversation[] = [ sampleConversation, secondConversation ]) => {
    const chatService = {
      newChatAdded$: new Subject<void>(),
      toggleAIService$: new Subject<string>(),
      findConversations: vi.fn().mockReturnValue(of(conversations)),
      sendNewChatSelectedSignal: vi.fn(),
      setChatAIProvider: vi.fn(),
      getChatAIProvider: vi.fn(),
      setSelectedConversationId: vi.fn()
    };
    const couchService = {
      datePlaceholder: 123456,
      updateDocument: vi.fn().mockReturnValue(of({ ok: true, id: 'conv-1', rev: '2-def' }))
    };
    const deviceInfoService = {
      deviceType: () => DeviceType.DESKTOP,
      isMobile: () => false
    };
    const searchService = {
      recordSearch: vi.fn()
    };
    const userService = {
      get: vi.fn().mockReturnValue({ name: 'planet' })
    };

    const component = new ChatSidebarComponent(
      chatService as any,
      couchService as any,
      deviceInfoService as any,
      { open: vi.fn() } as any,
      new FormBuilder().nonNullable,
      searchService as any,
      userService as any
    );
    component.ngOnInit();
    return { component, chatService, couchService };
  };

  it('preserves conversation.shared and emits updated title and rev when updating a selected conversation title', () => {
    const { component, chatService, couchService } = createComponent();

    component.selectConversation(sampleConversation, 0);
    expect(chatService.setSelectedConversationId).toHaveBeenCalledWith({
      _id: 'conv-1',
      _rev: '1-abc',
      title: 'Original title'
    });

    component.titleForm['conv-1'].controls.title.setValue('Renamed title');
    component.isEditing = true;
    component.submitTitle(sampleConversation);

    expect(couchService.updateDocument).toHaveBeenCalledWith('chat_history', expect.objectContaining({
      _id: 'conv-1',
      title: 'Renamed title',
      shared: true
    }));
    expect(chatService.setSelectedConversationId).toHaveBeenLastCalledWith({
      _id: 'conv-1',
      _rev: '2-def',
      title: 'Renamed title'
    });
    expect(component.selectedConversation?._rev).toBe('2-def');
    expect(component.isEditing).toBe(false);
  });

  it('resets edit mode when selecting a different conversation at the same filtered index', () => {
    const { component } = createComponent();

    component.selectConversation(sampleConversation, 0);
    component.isEditing = true;

    component.selectConversation(secondConversation, 0);
    expect(component.isEditing).toBe(false);
    expect(component.selectedConversation?._id).toBe('conv-2');
  });

  it('resets the title form control and exits edit mode when cancelling title edit', () => {
    const { component, couchService } = createComponent();

    component.isEditing = true;
    component.titleForm['conv-1'].controls.title.setValue('Unsaved draft');
    component.cancelEditTitle(sampleConversation);

    expect(component.isEditing).toBe(false);
    expect(component.titleForm['conv-1'].controls.title.value).toBe('Original title');
    expect(couchService.updateDocument).not.toHaveBeenCalled();
  });

  it('restores filteredConversations in memory without refetching when clearing search', () => {
    const { component, chatService } = createComponent([ sampleConversation ]);
    chatService.findConversations.mockClear();

    component.onSearchChange('nonexistent');
    expect(component.filteredConversations).toEqual([]);

    component.resetFilter();
    expect(component.filteredConversations).toEqual([ sampleConversation ]);
    expect(chatService.findConversations).not.toHaveBeenCalled();
  });
});
