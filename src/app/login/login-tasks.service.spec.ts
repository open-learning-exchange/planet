import { MatDialog } from '@angular/material/dialog';
import { vi } from 'vitest';

import { HealthService } from '../health/health.service';
import { CouchService } from '../shared/couchdb.service';
import { PouchService } from '../shared/database/pouch.service';
import { ChatService } from '../shared/chat.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { StateService } from '../shared/state.service';
import { SyncService } from '../shared/sync.service';
import { UserService } from '../shared/user.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { LoginTasksService } from './login-tasks.service';

describe('LoginTasksService', () => {
  it('refreshes provider discovery after the local login establishes a session', () => {
    const chatService = { 'refreshAIProviders': vi.fn() };
    const service = new LoginTasksService(
      {} as CouchService,
      {} as UserService,
      { 'replicateFromRemoteDBs': () => [] } as unknown as PouchService,
      {} as SyncService,
      { 'configuration': { 'planetType': 'community' } } as unknown as StateService,
      {} as HealthService,
      {} as SubmissionsService,
      chatService as unknown as ChatService,
      {} as PlanetMessageService,
      {} as MatDialog
    );

    service.postLoginTasks$('amara', 'secret', false, 'org.couchdb.user:amara', { 'adminName': 'admin@planet' });

    expect(chatService.refreshAIProviders).toHaveBeenCalledOnce();
  });
});
