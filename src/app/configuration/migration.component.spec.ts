import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MigrationComponent } from './migration.component';
import { Router } from '@angular/router';
import { UntypedFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { SyncService } from '../shared/sync.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { ConfigurationService } from './configuration.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError, Subscription } from 'rxjs';

class MatStepperStub {
  selected = { completed: false } as any;
  next = jasmine.createSpy('next');
}

describe('MigrationComponent', () => {
  let component: MigrationComponent;
  let fixture: ComponentFixture<MigrationComponent>;
  let couchService: jasmine.SpyObj<CouchService>;
  let syncService: jasmine.SpyObj<SyncService>;
  let planetMessageService: jasmine.SpyObj<PlanetMessageService>;
  let dialogsLoadingService: jasmine.SpyObj<DialogsLoadingService>;
  let configurationService: jasmine.SpyObj<ConfigurationService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ ReactiveFormsModule ],
      declarations: [ MigrationComponent ],
      providers: [
        UntypedFormBuilder,
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: CouchService, useValue: jasmine.createSpyObj('CouchService', ['post', 'get', 'put', 'findAll']) },
        { provide: SyncService, useValue: jasmine.createSpyObj('SyncService', ['sync']) },
        { provide: PlanetMessageService, useValue: jasmine.createSpyObj('PlanetMessageService', ['showMessage', 'showAlert']) },
        { provide: DialogsLoadingService, useValue: jasmine.createSpyObj('DialogsLoadingService', ['start', 'stop']) },
        { provide: ConfigurationService, useValue: jasmine.createSpyObj('ConfigurationService', ['setCouchPerUser']) }
      ],
      schemas: [ NO_ERRORS_SCHEMA ]
    });

    couchService = TestBed.inject(CouchService) as jasmine.SpyObj<CouchService>;
    syncService = TestBed.inject(SyncService) as jasmine.SpyObj<SyncService>;
    planetMessageService = TestBed.inject(PlanetMessageService) as jasmine.SpyObj<PlanetMessageService>;
    dialogsLoadingService = TestBed.inject(DialogsLoadingService) as jasmine.SpyObj<DialogsLoadingService>;
    configurationService = TestBed.inject(ConfigurationService) as jasmine.SpyObj<ConfigurationService>;

    couchService.post.and.returnValue(of({}));
    couchService.get.and.returnValue(of([]));
    couchService.put.and.returnValue(of({}));
    couchService.findAll.and.returnValue(of([]));
    syncService.sync.and.returnValue(of({}));
    configurationService.setCouchPerUser.and.returnValue(of({}));

    fixture = TestBed.createComponent(MigrationComponent);
    component = fixture.componentInstance;
    component.stepper = new MatStepperStub() as any;
    fixture.detectChanges();
  });

  it('guards against malformed URLs before verifying admin credentials', () => {
    component.cloneForm.controls.url.setValue('http:/bad');
    component.cloneForm.controls.name.setValue('admin');
    component.cloneForm.controls.password.setValue('pw');

    component.verifyAdmin();

    expect(planetMessageService.showAlert).toHaveBeenCalledWith($localize`Please enter a valid URL including protocol (for example, "https://example.com").`);
    expect(couchService.post).not.toHaveBeenCalled();
  });

  it('completes admin verification for valid URLs and moves to next step', () => {
    couchService.post.and.returnValue(of({ ok: true }));
    component.cloneForm.controls.url.setValue('https://example.com');
    component.cloneForm.controls.name.setValue('admin');
    component.cloneForm.controls.password.setValue('pw');

    component.verifyAdmin();

    expect(component.cloneDomain).toBe('example.com');
    expect(component.cloneProtocol).toBe('https');
    expect((component.stepper as any).selected.completed).toBeTrue();
    expect((component.stepper as any).next).toHaveBeenCalled();
  });

  it('surfaces replication failures during monitoring', fakeAsync(() => {
    dialogsLoadingService.start();
    couchService.findAll.and.returnValue(throwError('replication-failed'));

    component.replicationCompletionCheck(() => { /* noop */ });
    tick(1000);

    expect(planetMessageService.showAlert).toHaveBeenCalledWith($localize`Replication did not finish. Please verify CouchDB replication tasks and try again.`);
    expect(dialogsLoadingService.stop).toHaveBeenCalled();
  }));

  it('stops cloning when sync pipeline fails and reports error', () => {
    component.credential = { name: 'admin', password: 'pw' };
    component.cloneDomain = 'example.com';
    component.cloneProtocol = 'https';
    couchService.get.and.callFake((db: string) => {
      if (db === '_node/nonode@nohost/_config') {
        return of({ admins: { admin: 'hashed' }, couch_httpd_auth: { timeout: 10 } });
      }
      return of(['_replicator', 'test']);
    });
    couchService.findAll.and.returnValue(of([]));
    syncService.sync.and.returnValue(throwError('sync-failed'));

    component.clonePlanet();

    expect(planetMessageService.showAlert).toHaveBeenCalledWith($localize`Cloning failed. Please verify that the remote server is reachable and the credentials are valid.`);
    expect(dialogsLoadingService.stop).toHaveBeenCalled();
  });

  it('executes clone flow and completes migration when replication succeeds', () => {
    component.credential = { name: 'admin', password: 'pw' };
    component.cloneDomain = 'example.com';
    component.cloneProtocol = 'https';
    couchService.get.and.callFake((db: string) => {
      if (db === '_node/nonode@nohost/_config') {
        return of({ admins: { admin: 'hashed' }, couch_httpd_auth: { timeout: 10 } });
      }
      if (db === '_all_dbs') {
        return of(['_replicator', 'configurations', 'userdb-123']);
      }
      return of([]);
    });
    couchService.findAll.and.returnValue(of([ { _replication_state: 'completed' } ] as any));
    syncService.sync.and.returnValue(of({}));
    spyOn(component, 'replicationCompletionCheck').and.callFake((cb: () => void) => {
      cb();
      return new Subscription();
    });
    spyOn(component, 'completeMigration');

    component.clonePlanet();

    expect(planetMessageService.showMessage).toHaveBeenCalledWith($localize`Planet is being synced with domain "${component.cloneDomain}". Please hold on.`);
    expect(component.completeMigration).toHaveBeenCalled();
  });
});
