import { NEVER, of } from 'rxjs';
import { vi } from 'vitest';
import { UnsavedChangesPromptComponent } from '../unsaved-changes.component';
import { DialogsVoiceLabelsComponent } from './dialogs-voice-labels.component';
import { DEFAULT_LABEL_COLOR, LABEL_TINT_COLORS } from '../voice-labels';

describe('DialogsVoiceLabelsComponent', () => {
  let dialogRef: any;
  let stateService: any;
  let configurationService: any;
  let couchService: any;
  let planetMessageService: any;
  let dialogsLoadingService: any;
  let dialog: any;

  const createComponent = (data: any) => new DialogsVoiceLabelsComponent(
    dialogRef,
    data,
    stateService,
    configurationService,
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
    stateService = {
      configuration: { _id: 'configuration', code: 'local', customVoiceLabels: [ 'Stale label' ] },
      requestData: vi.fn()
    };
    configurationService = {
      patchLocalConfiguration: vi.fn().mockReturnValue(of({}))
    };
    couchService = {
      get: vi.fn().mockReturnValue(of({
        _id: 'configuration',
        _rev: '2-current',
        code: 'local',
        customVoiceLabels: [ 'Stale label' ],
        keys: { service: 'secret' }
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
    const component = createComponent({ target: 'community', customLabels: [ 'Event', null, 'event', 'News' ] });

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

  it('uses the labels supplied by the parent and updates only the local configuration with chosen color', () => {
    const component = createComponent({
      target: 'community',
      customLabels: [ { name: 'Current label', color: DEFAULT_LABEL_COLOR } ]
    });
    component.ngOnInit();
    component.selectedColor = LABEL_TINT_COLORS[1]; // green tint
    component.newLabelInput = 'New label';
    component.addLabel();

    component.save();

    expect(component.initialCustomLabels).toEqual([ { name: 'Current label', color: DEFAULT_LABEL_COLOR } ]);
    expect(configurationService.patchLocalConfiguration).toHaveBeenCalledWith({
      customVoiceLabels: [
        { name: 'Current label', color: DEFAULT_LABEL_COLOR },
        { name: 'New label', color: LABEL_TINT_COLORS[1] }
      ]
    });
    expect(couchService.get).not.toHaveBeenCalled();
    expect(couchService.updateDocument).not.toHaveBeenCalled();
    expect(stateService.requestData).toHaveBeenCalledWith('configurations', 'local');
    expect(dialogsLoadingService.stop).toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith([
      { name: 'Current label', color: DEFAULT_LABEL_COLOR },
      { name: 'New label', color: LABEL_TINT_COLORS[1] }
    ]);
  });

  it('adds valid pending input with selected color before saving', () => {
    const component = createComponent({ target: 'community', customLabels: [] });
    component.ngOnInit();
    component.selectedColor = LABEL_TINT_COLORS[2]; // amber tint
    component.newLabelInput = 'Event';

    component.save();

    expect(configurationService.patchLocalConfiguration).toHaveBeenCalledWith({
      customVoiceLabels: [ { name: 'Event', color: LABEL_TINT_COLORS[2] } ]
    });
    expect(dialogRef.close).toHaveBeenCalledWith([ { name: 'Event', color: LABEL_TINT_COLORS[2] } ]);
  });

  it('persists a display-casing change', () => {
    const component = createComponent({ target: 'community', customLabels: [ { name: 'Announcement', color: DEFAULT_LABEL_COLOR } ] });
    component.ngOnInit();
    component.customLabels = [ { name: 'announcement', color: DEFAULT_LABEL_COLOR } ];

    component.save();

    expect(configurationService.patchLocalConfiguration).toHaveBeenCalledWith({
      customVoiceLabels: [ { name: 'announcement', color: DEFAULT_LABEL_COLOR } ]
    });
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
    expect(configurationService.patchLocalConfiguration).not.toHaveBeenCalled();
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
