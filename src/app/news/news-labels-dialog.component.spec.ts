import { NEVER, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { UnsavedChangesPromptComponent } from '@shared/unsaved-changes/unsaved-changes-prompt.component';

import { NewsLabelsDialogComponent } from './news-labels-dialog.component';
import { DEFAULT_LABEL_COLOR } from './news-labels';

describe('NewsLabelsDialogComponent', () => {
  let dialogRef: any;
  let couchService: any;
  let planetMessageService: any;
  let dialogsLoadingService: any;
  let dialog: any;
  let communityTeam: any;

  const createComponent = (data: any) => new NewsLabelsDialogComponent(
    dialogRef,
    data,
    couchService,
    planetMessageService,
    dialogsLoadingService,
    dialog
  );

  beforeEach(() => {
    dialogRef = {
      close: vi.fn(),
      disableClose: false,
      backdropClick: vi.fn().mockReturnValue(NEVER),
      keydownEvents: vi.fn().mockReturnValue(NEVER)
    };
    communityTeam = { _id: 'local@parent', teamType: 'sync', teamPlanetCode: 'local', type: 'services' };
    couchService = {
      get: vi.fn().mockReturnValue(of({
        ...communityTeam, _rev: '2-current', description: 'About us', customVoiceLabels: [ 'Stale label' ]
      })),
      updateDocument: vi.fn().mockReturnValue(of({}))
    };
    planetMessageService = { showAlert: vi.fn(), showMessage: vi.fn() };
    dialogsLoadingService = { start: vi.fn(), stop: vi.fn() };
    dialog = {};
  });

  afterEach(() => vi.restoreAllMocks());

  it('does not start loading when group settings are unavailable', () => {
    const component = createComponent({ target: 'team' });
    component.ngOnInit();
    component.customLabels.push({ name: 'Event', color: DEFAULT_LABEL_COLOR });

    component.save();

    expect(dialogsLoadingService.start).not.toHaveBeenCalled();
    expect(planetMessageService.showAlert).toHaveBeenCalled();
  });

  it('sanitizes and deduplicates stored labels when opening', () => {
    const component = createComponent({
      target: 'community',
      customLabels: [ 'Event', null, { name: 42 }, 'event', { name: 'News', color: '#bbdefb' } ]
    });

    component.ngOnInit();

    expect(component.initialCustomLabels).toEqual([
      { name: 'Event', color: DEFAULT_LABEL_COLOR },
      { name: 'News', color: DEFAULT_LABEL_COLOR }
    ]);
    expect(component.customLabels).toEqual([
      { name: 'Event', color: DEFAULT_LABEL_COLOR },
      { name: 'News', color: DEFAULT_LABEL_COLOR }
    ]);
  });

  it('saves the labels supplied by the parent onto the latest community services doc with chosen color', () => {
    const component = createComponent({
      target: 'community',
      team: communityTeam,
      customLabels: [ { name: 'Current label', color: DEFAULT_LABEL_COLOR } ]
    });
    component.ngOnInit();
    component.selectedColor = component.labelColors[1].key;
    component.newLabelInput = 'New label';
    component.addLabel();

    component.save();

    expect(component.initialCustomLabels).toEqual([ { name: 'Current label', color: DEFAULT_LABEL_COLOR } ]);
    expect(couchService.get).toHaveBeenCalledWith('teams/local@parent');
    expect(couchService.updateDocument).toHaveBeenCalledWith('teams', {
      ...communityTeam,
      _rev: '2-current',
      description: 'About us',
      customVoiceLabels: [
        { name: 'Current label', color: DEFAULT_LABEL_COLOR },
        { name: 'New label', color: 'green' }
      ]
    });
    expect(dialogsLoadingService.stop).toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith([
      { name: 'Current label', color: DEFAULT_LABEL_COLOR },
      { name: 'New label', color: 'green' }
    ]);
  });

  it('creates the community services doc when it does not exist yet', () => {
    couchService.get.mockReturnValue(throwError({ status: 404 }));
    const component = createComponent({ target: 'community', team: communityTeam, customLabels: [] });
    component.ngOnInit();
    component.customLabels.push({ name: 'Event', color: DEFAULT_LABEL_COLOR });

    component.save();

    expect(couchService.updateDocument).toHaveBeenCalledWith('teams', {
      ...communityTeam,
      customVoiceLabels: [ { name: 'Event', color: DEFAULT_LABEL_COLOR } ]
    });
    expect(dialogRef.close).toHaveBeenCalledWith([ { name: 'Event', color: DEFAULT_LABEL_COLOR } ]);
  });

  it('adds valid pending input with selected color before saving', () => {
    const component = createComponent({ target: 'community', team: communityTeam, customLabels: [] });
    component.ngOnInit();
    component.selectedColor = component.labelColors[2].key;
    component.newLabelInput = 'Event';

    component.save();

    expect(couchService.updateDocument).toHaveBeenCalledWith('teams', expect.objectContaining({
      customVoiceLabels: [ { name: 'Event', color: 'teal' } ]
    }));
    expect(dialogRef.close).toHaveBeenCalledWith([ { name: 'Event', color: 'teal' } ]);
  });

  it('persists a display-casing change', () => {
    const component = createComponent({
      target: 'community',
      team: communityTeam,
      customLabels: [ { name: 'Announcement', color: DEFAULT_LABEL_COLOR } ]
    });
    component.ngOnInit();
    component.customLabels = [ { name: 'announcement', color: DEFAULT_LABEL_COLOR } ];

    component.save();

    expect(couchService.updateDocument).toHaveBeenCalledWith('teams', expect.objectContaining({
      customVoiceLabels: [ { name: 'announcement', color: DEFAULT_LABEL_COLOR } ]
    }));
  });

  it('merges team labels into the latest team revision', () => {
    const team = { _id: 'team', _rev: '1-stale' };
    couchService.get.mockReturnValue(of({ _id: 'team', _rev: '2-current', name: 'Team' }));
    couchService.updateDocument.mockReturnValue(of({
      doc: { _id: 'team', _rev: '3-saved', name: 'Team', customVoiceLabels: [ { name: 'Event', color: DEFAULT_LABEL_COLOR } ] }
    }));
    const component = createComponent({
      target: 'team',
      team,
      customLabels: []
    });
    component.ngOnInit();
    component.customLabels.push({ name: 'Event', color: DEFAULT_LABEL_COLOR });

    component.save();

    expect(couchService.get).toHaveBeenCalledWith('teams/team');
    expect(couchService.updateDocument).toHaveBeenCalledWith('teams', {
      _id: 'team',
      _rev: '2-current',
      name: 'Team',
      customVoiceLabels: [ { name: 'Event', color: DEFAULT_LABEL_COLOR } ]
    });
    expect(team).toEqual({
      _id: 'team',
      _rev: '3-saved',
      name: 'Team',
      customVoiceLabels: [ { name: 'Event', color: DEFAULT_LABEL_COLOR } ]
    });
  });

  it('asks for confirmation before discarding edited labels', () => {
    vi.spyOn(UnsavedChangesPromptComponent, 'open').mockReturnValue(of(true));
    const component = createComponent({ target: 'community', customLabels: [] });
    component.ngOnInit();
    component.customLabels.push({ name: 'Event', color: DEFAULT_LABEL_COLOR });

    component.requestClose();

    expect(UnsavedChangesPromptComponent.open).toHaveBeenCalledWith(dialog);
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('reserves the synthetic shared chat label', () => {
    const component = createComponent({ target: 'community', customLabels: [] });
    component.ngOnInit();
    component.newLabelInput = 'Shared Chat';

    component.addLabel();

    expect(component.customLabels).toEqual([]);
    expect(component.errorMessage).toContain('reserved');
  });

  it('uses a services-specific section heading', () => {
    const component = createComponent({ target: 'services', team: { _id: 'services' } });
    component.ngOnInit();

    expect(component.sectionHeader).toBe('Services labels');
  });
});
