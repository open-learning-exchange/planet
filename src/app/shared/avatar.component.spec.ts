import { SimpleChange, SimpleChanges } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';

import { AvatarComponent } from './avatar.component';
import { couchAttachmentUrl } from './utils';

describe('AvatarComponent', () => {
  let component: AvatarComponent;
  let configuration: { code?: string };
  let configurationUpdates: Subject<{ planetField: string }>;

  const url = (db: string, docName: string, filename: string) =>
    couchAttachmentUrl(environment.couchAddress, db, docName, filename);
  const changesFor = (...inputs: ('username' | 'planetCode' | 'imgClass')[]): SimpleChanges =>
    Object.fromEntries(inputs.map(input => [ input, new SimpleChange(undefined, component[input], true) ]));

  beforeEach(() => {
    configuration = { code: 'local-planet' };
    configurationUpdates = new Subject();
    component = new AvatarComponent({
      get configuration() {
        return configuration;
      },
      couchStateListener: () => configurationUpdates
    } as any);
  });

  afterEach(() => component.ngOnDestroy());

  it('resolves a local avatar from the users database', () => {
    component.username = 'local-user';
    component.planetCode = 'local-planet';

    component.ngOnChanges(changesFor('username', 'planetCode'));

    expect(component.imgSrc).toBe(url('_users', 'org.couchdb.user:local-user', 'img'));
  });

  it('treats a missing planet code as local', () => {
    component.username = 'local-user';

    component.ngOnChanges(changesFor('username'));

    expect(component.imgSrc).toBe(url('_users', 'org.couchdb.user:local-user', 'img'));
  });

  it('resolves a remote avatar from the attachments database', () => {
    component.username = 'child-user';
    component.planetCode = 'child-planet';

    component.ngOnChanges(changesFor('username', 'planetCode'));

    expect(component.imgSrc).toBe(url('attachments', 'org.couchdb.user:child-user@child-planet', 'img'));
  });

  it('falls back to the underscore variant before using the placeholder', () => {
    component.username = 'local-user';
    component.ngOnChanges(changesFor('username'));

    component.imgLoadError();

    expect(component.imgSrc).toBe(url('_users', 'org.couchdb.user:local-user', 'img_'));
  });

  it('does not fall back to a same-named local avatar for a remote user', () => {
    component.username = 'shared-name';
    component.planetCode = 'child-planet';
    component.ngOnChanges(changesFor('username', 'planetCode'));

    component.imgLoadError();
    component.imgLoadError();

    expect(component.imgSrc).toBe('assets/image.png');
    expect(component.imgSources.every(({ db }) => db === 'attachments')).toBe(true);
  });

  it('restarts resolution when identity inputs change on a reused instance', () => {
    component.username = 'local-user';
    component.ngOnChanges(changesFor('username'));
    component.imgLoadError();

    component.username = 'child-user';
    component.planetCode = 'child-planet';
    component.ngOnChanges(changesFor('username', 'planetCode'));

    expect(component.srcIndex).toBe(0);
    expect(component.imgSrc).toBe(url('attachments', 'org.couchdb.user:child-user@child-planet', 'img'));
  });

  it('stays blank after the username is cleared and a stale image error arrives', () => {
    component.username = 'local-user';
    component.ngOnChanges(changesFor('username'));

    component.username = '';
    component.ngOnChanges(changesFor('username'));
    component.imgLoadError();

    expect(component.imgSrc).toBe('');
    expect(component.imgSources).toEqual([]);
    expect(component.srcIndex).toBe(0);
  });

  it('encodes identity values used in attachment URLs', () => {
    component.username = 'user name';
    component.planetCode = 'child planet';

    component.ngOnChanges(changesFor('username', 'planetCode'));

    expect(component.imgSrc).toBe(
      `${environment.couchAddress}/attachments/org.couchdb.user%3Auser%20name%40child%20planet/img`
    );
  });

  it('does not restart resolution when only the image class changes', () => {
    component.username = 'local-user';
    component.ngOnChanges(changesFor('username'));
    component.imgLoadError();

    component.imgClass = 'large-avatar';
    component.ngOnChanges(changesFor('imgClass'));

    expect(component.srcIndex).toBe(1);
    expect(component.imgSrc).toBe(url('_users', 'org.couchdb.user:local-user', 'img_'));
  });

  it('shows the placeholder until an explicit local planet can be resolved', () => {
    configuration = {};
    component.username = 'local-user';
    component.planetCode = 'local-planet';

    component.ngOnChanges(changesFor('username', 'planetCode'));

    expect(component.imgSrc).toBe('assets/image.png');
    expect(component.imgSources).toEqual([]);

    configuration = { code: 'local-planet' };
    configurationUpdates.next({ planetField: 'local' });

    expect(component.imgSrc).toBe(url('_users', 'org.couchdb.user:local-user', 'img'));
  });
});
