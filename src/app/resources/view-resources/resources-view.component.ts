import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserService } from '../../shared/user.service';
import { ResourcesService } from '../resources.service';
import { debug } from '../../debug-operator';
import { StateService } from '../../shared/state.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { DialogsLoadingService } from '../../shared/dialogs/dialogs-loading.service';
import { DeviceInfoService, DeviceType } from '../../shared/device-info.service';
import { languages } from '../../shared/languages';
import * as constants from '../resources-constants';

@Component({
  templateUrl: './resources-view.component.html',
  styleUrls: [ './resources-view.scss' ]
})

export class ResourcesViewComponent implements OnInit, OnDestroy {

  private dbName = 'resources';
  private onDestroy$ = new Subject<void>();
  resource: any = {};
  canManage: boolean;
  currentUser = this.userService.get();
  mediaType = '';
  resourceSrc = '';
  pdfSrc: any;
  contentType = '';
  isUserEnrolled = false;
  isLoading: boolean;
  // If parent route, url will use parent domain.  If not uses this domain.
  parent = this.route.snapshot.data.parent;
  planetConfiguration = this.stateService.configuration;
  get urlPrefix() {
    let domain = environment.couchAddress + '/';
    if (this.parent) {
      domain = 'http://' + this.planetConfiguration.parentDomain + '/';
    }
    return domain + this.dbName + '/';
  }
  // Use string rather than boolean for i18n select
  fullView = 'on';
  resourceId: string;
  constantsOptions = constants;
  languageOptions = languages;
  deviceType: DeviceType;
  deviceTypes: typeof DeviceType = DeviceType;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private stateService: StateService,
    private resourcesService: ResourcesService,
    private planetMessageService: PlanetMessageService,
    private dialogsLoadingService: DialogsLoadingService,
    private deviceInfoService: DeviceInfoService
  ) {
    this.deviceType = this.deviceInfoService.getDeviceType();
  }

  @HostListener('window:resize') OnResize() {
    this.deviceType = this.deviceInfoService.getDeviceType();
  }

  ngOnInit() {
    this.isLoading = true;
    this.route.paramMap
      .pipe(debug('Getting resource id from parameters'), takeUntil(this.onDestroy$))
      .subscribe((params: ParamMap) => {
        this.resourceId = params.get('id');
        this.resourcesService.requestResourcesUpdate(this.parent);
      }, error => console.log(error), () => console.log('complete getting resource id'));
    this.dialogsLoadingService.start();
    this.resourcesService.resourcesListener(this.parent).pipe(takeUntil(this.onDestroy$))
      .subscribe((resources) => {
        this.resource = resources.find((r: any) => r._id === this.resourceId);
        if (this.resource === undefined) {
          if (this.resourcesService.isActiveResourceFetch) {
            return;
          }
          this.planetMessageService.showAlert($localize`Resource does not exist in Library`);
          this.router.navigate([ '/resources' ]);
        }
        this.dialogsLoadingService.stop();
        this.isLoading = false;
        this.isUserEnrolled = this.userService.shelf.resourceIds.includes(this.resource._id);
        this.canManage = (this.currentUser.isUserAdmin && !this.parent) ||
          (this.currentUser.name === this.resource.doc.addedBy && this.resource.doc.sourcePlanet === this.planetConfiguration.code);
      });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  setResourceUrl(resourceUrl: string) {
    this.resourceSrc = resourceUrl;
  }

  toggleFullView() {
    this.fullView = this.fullView === 'on' ? 'off' : 'on';
  }

  updateRating() {
    this.resourcesService.requestResourcesUpdate(this.parent);
  }

  libraryToggle(resourceId, type) {
    this.resourcesService.libraryAddRemove([ resourceId ], type).subscribe((res) => {
      this.isUserEnrolled = !this.isUserEnrolled;
    }, (error) => ((error)));
  }

  updateResource() {
    this.router.navigate([ '/resources/update/' + this.resourceId ]);
  }

  /**
   * If returnState is set in history, it will navigate to that page.(teams/enterprises)
   * Returns routing to previous parent page
   */
  goBack() {
    const returnState = history.state?.returnState;
    if (returnState) {
      this.router.navigate([ `${returnState.route}` ]);
      return;
    }
    this.router.navigate([ '../../' ], { relativeTo: this.route });
  }
}
