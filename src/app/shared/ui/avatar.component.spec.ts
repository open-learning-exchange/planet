import { SimpleChange, SimpleChanges } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { vi } from 'vitest';

import { StateService } from '@shared/state.service';
import { couchAttachmentUrl } from '@shared/utils';

import { environment } from '../../../environments/environment';
import { AvatarComponent } from './avatar.component';

describe('AvatarComponent', () => {
  let component: AvatarComponent;
  let configuration: { code?: string };
  let configurationUpdates: Subject<{ planetField: string }>;

  const url = (db: string, docName: string, filename: string) =>
    couchAttachmentUrl(environment.couchAddress, db, docName, filename);
  const changesFor = (...inputs: ('username' | 'planetCode' | 'attachment')[]): SimpleChanges =>
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

  it('uses the placeholder when the stable attachment is missing', () => {
    const imageError = vi.spyOn(component.imageError, 'emit');
    component.username = 'local-user';
    component.ngOnChanges(changesFor('username'));

    component.imgLoadError();

    expect(component.imgSrc).toBe('assets/image.png');
    expect(imageError).toHaveBeenCalledTimes(1);
  });

  it('does not fall back to a same-named local avatar for a remote user', () => {
    component.username = 'shared-name';
    component.planetCode = 'child-planet';
    component.ngOnChanges(changesFor('username', 'planetCode'));

    component.imgLoadError();

    expect(component.imgSrc).toBe('assets/image.png');
  });

  it('restarts resolution when identity inputs change on a reused instance', () => {
    component.username = 'local-user';
    component.ngOnChanges(changesFor('username'));
    component.imgLoadError();

    component.username = 'child-user';
    component.planetCode = 'child-planet';
    component.ngOnChanges(changesFor('username', 'planetCode'));

    expect(component.imgSrc).toBe(url('attachments', 'org.couchdb.user:child-user@child-planet', 'img'));
  });

  it('stays blank after the username is cleared and a stale image error arrives', () => {
    component.username = 'local-user';
    component.ngOnChanges(changesFor('username'));

    component.username = '';
    component.ngOnChanges(changesFor('username'));
    component.imgLoadError();

    expect(component.imgSrc).toBe('');
  });

  it('encodes identity values used in attachment URLs', () => {
    component.username = 'user name';
    component.planetCode = 'child planet';

    component.ngOnChanges(changesFor('username', 'planetCode'));

    expect(component.imgSrc).toBe(
      `${environment.couchAddress}/attachments/org.couchdb.user%3Auser%20name%40child%20planet/img`
    );
  });

  it('shows the placeholder until an explicit local planet can be resolved', () => {
    configuration = {};
    component.username = 'local-user';
    component.planetCode = 'local-planet';

    component.ngOnChanges(changesFor('username', 'planetCode'));

    expect(component.imgSrc).toBe('assets/image.png');

    configuration = { code: 'local-planet' };
    configurationUpdates.next({ planetField: 'local' });

    expect(component.imgSrc).toBe(url('_users', 'org.couchdb.user:local-user', 'img'));
  });

  it('versions the avatar URL with the attachment digest', () => {
    component.username = 'local-user';
    component.attachment = { digest: 'md5-a/b+=' };

    component.ngOnChanges(changesFor('username', 'attachment'));

    expect(component.imgSrc).toBe(`${url('_users', 'org.couchdb.user:local-user', 'img')}?v=md5-a%2Fb%2B%3D`);
  });

  it('re-resolves the URL when the digest changes', () => {
    component.username = 'local-user';
    component.attachment = { digest: 'md5-old' };
    component.ngOnChanges(changesFor('username', 'attachment'));

    component.attachment = { digest: 'md5-new' };
    component.ngOnChanges(changesFor('attachment'));

    expect(component.imgSrc).toBe(`${url('_users', 'org.couchdb.user:local-user', 'img')}?v=md5-new`);
  });

  [
    { description: 'decorative', alt: '' },
    { description: 'meaningful', alt: 'Alex Morgan' }
  ].forEach(({ description, alt }) => {
    it(`renders ${description} alternative text`, () => {
      TestBed.configureTestingModule({
        imports: [ AvatarComponent ],
        providers: [ {
          provide: StateService,
          useValue: { configuration: { code: 'local-planet' }, couchStateListener: () => new Subject() }
        } ]
      });
      const fixture = TestBed.createComponent(AvatarComponent);
      fixture.componentRef.setInput('username', 'local-user');
      fixture.componentRef.setInput('alt', alt);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('img').getAttribute('alt')).toBe(alt);
    });
  });
});
