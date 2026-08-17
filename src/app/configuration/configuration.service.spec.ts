import { of } from 'rxjs';
import { vi } from 'vitest';

import { ConfigurationService } from './configuration.service';

describe('ConfigurationService', () => {
  it('does not synchronize AI provider keys to the parent registration document', () => {
    const couchService = {
      updateDocument: vi.fn().mockReturnValue(of({}))
    };
    const service = new ConfigurationService(couchService as any, {} as any, {} as any, {} as any);

    service.addPlanetToParent({
      '_id': 'community-1',
      'parentDomain': 'nation.example',
      'keys': { 'openai': 'secret-api-key' },
      'models': { 'openai': 'gpt-5' }
    }, false, {}).subscribe();

    expect(couchService.updateDocument).toHaveBeenCalledWith(
      'communityregistrationrequests',
      {
        '_id': 'community-1',
        'parentDomain': 'nation.example',
        'models': { 'openai': 'gpt-5' }
      },
      { 'domain': 'nation.example' }
    );
  });
});
