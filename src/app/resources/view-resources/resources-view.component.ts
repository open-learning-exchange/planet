import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { Subject, defer } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserService } from '@shared/auth/user.service';
import { ResourcesService } from '../resources.service';
import { StateService } from '@shared/state.service';
import { PlanetMessageService } from '@shared/ui/planet-message.service';
import { DeviceInfoService, DeviceType } from '@shared/platform/device-info.service';
import { languages } from '@shared/language/languages';
import * as constants from '../resources.constants';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconAnchor, MatIconButton, MatButton, MatAnchor } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { NgTemplateOutlet, NgClass } from '@angular/common';
import { MatMenuTrigger, MatMenu } from '@angular/material/menu';
import { PlanetRatingComponent } from '@shared/ratings/planet-rating.component';
import { PlanetMarkdownComponent } from '@shared/markdown/planet-markdown.component';
import { LanguageLabelComponent } from '@shared/language/language-label.component';
import { PlanetLoadingSpinnerComponent } from '@shared/ui/planet-loading-spinner.component';
import { ResourcesViewerComponent } from './resources-viewer.component';
import { MatDialog } from '@angular/material/dialog';
import { DialogsPromptComponent } from '@shared/dialogs/dialogs-prompt.component';
import { formatResourceAttachmentSize, formatResourceAttachmentsSize } from '../resources.utils';

@Component({
  templateUrl: './resources-view.component.html',
  styleUrls: ['./resources-view.scss'],
  imports: [
    MatToolbar,
    MatIconAnchor,
    MatIcon,
    NgTemplateOutlet,
    MatIconButton,
    MatMenuTrigger,
    MatMenu,
    MatButton,
    MatAnchor,
    NgClass,
    PlanetRatingComponent,
    PlanetMarkdownComponent,
    LanguageLabelComponent,
    PlanetLoadingSpinnerComponent,
    ResourcesViewerComponent
  ]
})

export class ResourcesViewComponent implements OnInit, OnDestroy {

  private dbName = 'resources';
  private onDestroy$ = new Subject<void>();
  resource: any = {};
  canManage: boolean;
  currentUser = this.userService.get();
  mediaType = '';
  resourceSrc = '';
  formattedFileSize = '';
  downloadFileSize = '';
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
    private deviceInfoService: DeviceInfoService,
    private dialog: MatDialog
  ) {
    this.deviceInfoService.watchDeviceType().pipe(takeUntil(this.onDestroy$)).subscribe((deviceType) => {
      this.deviceType = deviceType;
    });
  }

  ngOnInit() {
    this.isLoading = true;
    this.route.paramMap
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((params: ParamMap) => {
        this.resourceId = params.get('id');
        this.resourcesService.requestResourcesUpdate(this.parent);
      }, error => console.log(error), () => console.log('complete getting resource id'));
    this.resourcesService.resourcesListener(this.parent).pipe(takeUntil(this.onDestroy$))
      .subscribe((resources) => {
        this.resource = resources.find((r: any) => r._id === this.resourceId);
        if (this.resource === undefined) {
          if (this.resourcesService.isActiveResourceFetch) {
            return;
          }
          this.planetMessageService.showAlert($localize`Resource does not exist in Library`);
          this.router.navigate([ '/resources' ]);
          this.isLoading = false;
          return;
        }
        this.isLoading = false;
        const attachmentCount = Object.keys(this.resource.doc?._attachments || {}).length;
        this.formattedFileSize = attachmentCount > 1 ? formatResourceAttachmentsSize(this.resource.doc) : '';
        this.downloadFileSize = formatResourceAttachmentSize(this.resource.doc);
        this.isUserEnrolled = this.userService.shelf.resourceIds.includes(this.resource._id);
        this.canManage = (this.currentUser.isUserAdmin && !this.parent) ||
          (this.currentUser.name === this.resource.doc.addedBy && this.resource.doc.sourcePlanet === this.planetConfiguration.code);
      }, () => this.isLoading = false);
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
    if (type === 'remove') {
      const dialogRef = this.dialog.open(DialogsPromptComponent, {
        data: {
          changeType: 'remove',
          type: 'resource',
          displayName: this.resource?.doc?.title || '',
          okClick: {
            request: defer(() => this.resourcesService.libraryAddRemove([ resourceId ], type)),
            onNext: () => {
              this.isUserEnrolled = !this.isUserEnrolled;
              dialogRef.close();
            },
            onError: () => this.planetMessageService.showAlert($localize`There was a problem removing this resource from myLibrary.`)
          }
        }
      });
      return;
    }
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
