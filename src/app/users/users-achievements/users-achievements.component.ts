import { Component, Inject, LOCALE_ID, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Router, ActivatedRoute, ParamMap, RouterLink } from '@angular/router';
import { Clipboard } from '@angular/cdk/clipboard';
import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { UsersAchievementsService } from './users-achievements.service';
import { catchError, auditTime, filter, map, shareReplay, switchMap, take, takeUntil } from 'rxjs/operators';
import { throwError, combineLatest, defer, EMPTY, merge, of, Observable, Subject } from 'rxjs';
import { StateService } from '../../shared/state.service';
import { CoursesService } from '../../courses/courses.service';
import { environment } from '../../../environments/environment';
import { CertificationsService } from '../../manager-dashboard/certifications/certifications.service';
import { PdfService } from '../../shared/pdf.service';
import { NgClass, DatePipe, formatDate } from '@angular/common';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton, MatAnchor } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { PlanetLoadingSpinnerComponent } from '../../shared/planet-loading-spinner.component';
import { MatDivider, MatList, MatListItem, MatListItemTitle, MatListItemMeta, MatListItemLine } from '@angular/material/list';
import { PlanetMarkdownComponent } from '../../shared/planet-markdown.component';
import { PlanetBetaDirective } from '../../shared/beta.directive';
import { TruncateTextPipe } from '../../shared/truncate-text.pipe';
import { AvatarComponent } from '../../shared/avatar.component';
import { fullName } from '../../shared/utils';
import { FullNamePipe } from '../../shared/full-name.pipe';

interface AchievementsRoute {
  achievementsId: string | null;
  ownAchievements: boolean;
  fallbackId: string;
  userRequest: { name: string, planetCode: string } | null;
}

type AchievementsUpdate =
  { type: 'user', user: any } |
  { type: 'userError' } |
  { type: 'achievements', achievements: any } |
  { type: 'achievementsError', error: any } |
  { type: 'certifications', courses: any[], progress: any[], certifications: any[], user: any };

@Component({
  templateUrl: './users-achievements.component.html',
  styleUrls: ['./users-achievements.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [
    MatToolbar,
    MatIconButton,
    MatIcon,
    MatAnchor,
    RouterLink,
    MatTooltip,
    PlanetLoadingSpinnerComponent,
    MatDivider,
    PlanetMarkdownComponent,
    PlanetBetaDirective,
    MatList,
    MatListItem,
    MatListItemTitle,
    MatListItemMeta,
    NgClass,
    MatListItemLine,
    DatePipe,
    TruncateTextPipe,
    AvatarComponent,
    FullNamePipe
  ]
})
export class UsersAchievementsComponent implements OnInit, OnDestroy {
  readonly dbName = 'achievements';
  readonly resumeAttachmentKey = 'resume.pdf';
  user: any = {};
  userName: string;
  userPlanetCode: string;
  achievements: any;
  achievementNotFound = false;
  ownAchievements = false;
  openAchievementIndex = -1;
  certifications: any[] = [];
  publicView = this.route.snapshot.data.requiresAuth === false && !this.userService.get()._id;
  isLoading = true;
  private onDestroy$ = new Subject<void>();

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private planetMessageService: PlanetMessageService,
    private usersAchievementsService: UsersAchievementsService,
    private stateService: StateService,
    private coursesService: CoursesService,
    private certificationsService: CertificationsService,
    private clipboard: Clipboard,
    private pdfService: PdfService,
    @Inject(LOCALE_ID) private localeId: string
  ) { }

  ngOnInit() {
    this.localPlanetCode().pipe(
      switchMap((localPlanetCode: string) => this.route.paramMap.pipe(
        map((params: ParamMap) => this.initRoute(params, localPlanetCode))
      )),
      switchMap((achievementsRoute: AchievementsRoute) => this.routeUpdates(achievementsRoute)),
      takeUntil(this.onDestroy$)
    ).subscribe((update: AchievementsUpdate) => this.applyUpdate(update));
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  // The configuration is fetched asynchronously and route activation does not wait for it, so no ID is built from a missing local code
  private localPlanetCode(): Observable<string> {
    return merge(
      this.stateService.couchStateListener('configurations').pipe(
        map(() => this.stateService.configuration.code)
      ),
      defer(() => {
        const code = this.stateService.configuration.code;
        if (!code) {
          this.stateService.requestData('configurations', 'local');
        }
        return of(code);
      })
    ).pipe(
      filter((code: any): code is string => typeof code === 'string' && code.length > 0),
      take(1)
    );
  }

  // Clears state from the previously viewed user and describes the requests the new route needs
  private initRoute(params: ParamMap, localPlanetCode: string): AchievementsRoute {
    const currentUser = this.userService.get();
    const nameParam = params.get('name');
    const currentUserPlanetCode = currentUser.planetCode || localPlanetCode;
    let achievementsId: string | null;
    let userRequest: { name: string, planetCode: string } | null = null;
    this.resetRouteState();
    if (nameParam === null) {
      achievementsId = currentUser._id ? currentUser._id + '@' + localPlanetCode : null;
      this.user = currentUser;
      this.userName = currentUser.name;
      this.userPlanetCode = currentUserPlanetCode;
    } else {
      const name = nameParam.split('@')[0];
      const planetCode = params.get('planet') || localPlanetCode;
      achievementsId = 'org.couchdb.user:' + name + '@' + planetCode;
      // Set synchronously so the name and avatar of the newly routed user show while its document is still loading
      this.userName = name;
      this.userPlanetCode = planetCode;
      this.user = { name, planetCode };
      userRequest = { name, planetCode };
    }
    this.ownAchievements = !!currentUser._id && achievementsId === (currentUser._id + '@' + currentUserPlanetCode);
    return { achievementsId, ownAchievements: this.ownAchievements, fallbackId: currentUser._id, userRequest };
  }

  private resetRouteState() {
    this.isLoading = true;
    this.user = {};
    this.userName = undefined;
    this.userPlanetCode = undefined;
    this.achievements = undefined;
    this.achievementNotFound = false;
    this.ownAchievements = false;
    this.openAchievementIndex = -1;
    this.certifications = [];
  }

  private routeUpdates({ achievementsId, ownAchievements, fallbackId, userRequest }: AchievementsRoute): Observable<AchievementsUpdate> {
    const routedUser = userRequest ? { name: userRequest.name, planetCode: userRequest.planetCode } : this.user;
    const user$ = (userRequest ?
      this.userUpdates(userRequest.name, userRequest.planetCode) :
      of<AchievementsUpdate>({ type: 'user', user: routedUser })
    ).pipe(shareReplay({ bufferSize: 1, refCount: true }));
    return merge(
      achievementsId ? this.achievementsUpdates(achievementsId, ownAchievements, fallbackId) : EMPTY,
      user$,
      this.certificationUpdates(user$.pipe(
        map((update: AchievementsUpdate) => update.type === 'user' ? update.user : routedUser)
      ))
    );
  }

  // Owned by the active route so switchMap cancels a previous user's pending work.
  // The listeners are shared and hot, so they are merged before the request to keep an immediate emission from being missed.
  // The user is a combineLatest source rather than a gate so these requests are not serialized behind the user document
  private certificationUpdates(user$: Observable<any>): Observable<AchievementsUpdate> {
    if (this.publicView) {
      return EMPTY;
    }
    return merge(
      combineLatest([
        this.coursesService.coursesListener$(),
        this.coursesService.progressListener$(),
        this.certificationsService.getCertifications(),
        user$
      ]).pipe(
        auditTime(500),
        map(([ courses, progress, certifications, user ]): AchievementsUpdate => ({
          type: 'certifications', courses, progress, certifications, user
        })),
        // A failed certifications request must not tear down the route subscription. CouchService already reports the failure
        catchError(() => of<AchievementsUpdate>({
          type: 'certifications', courses: [], progress: [], certifications: [], user: {}
        }))
      ),
      defer(() => {
        this.coursesService.requestCourses();
        return EMPTY;
      })
    );
  }

  private achievementsUpdates(id: string, ownAchievements: boolean, fallbackId: string): Observable<AchievementsUpdate> {
    return this.usersAchievementsService.getAchievements(id).pipe(
      catchError((err) => ownAchievements ? this.usersAchievementsService.getAchievements(fallbackId) : throwError(err)),
      map((achievements): AchievementsUpdate => ({ type: 'achievements', achievements })),
      catchError((error) => of<AchievementsUpdate>({ type: 'achievementsError', error }))
    );
  }

  private userUpdates(name: string, planetCode: string): Observable<AchievementsUpdate> {
    const relationship = this.userRelationship(planetCode);
    const db = relationship === 'local' ? '_users' : relationship + '_users';
    const id = relationship === 'child' ? name + '@' + planetCode : 'org.couchdb.user:' + name;
    return this.couchService.get(db + '/' + id).pipe(
      map((user): AchievementsUpdate => ({ type: 'user', user })),
      catchError(() => of<AchievementsUpdate>({ type: 'userError' }))
    );
  }

  private applyUpdate(update: AchievementsUpdate) {
    switch (update.type) {
      case 'user':
        this.user = update.user;
        break;
      case 'userError':
        // The user is left as the name and planet from the route so no information of a previously viewed user is shown
        this.planetMessageService.showAlert($localize`There was an error getting the user`);
        break;
      case 'achievements':
        if (this.usersAchievementsService.isEmpty(update.achievements)) {
          this.achievementNotFound = true;
        } else {
          this.achievements = update.achievements;
        }
        this.stopPublicViewLoading();
        break;
      case 'achievementsError':
        if (update.error?.status === 404) {
          this.achievementNotFound = true;
        } else {
          this.planetMessageService.showAlert($localize`There was an error getting achievements`);
        }
        this.stopPublicViewLoading();
        break;
      case 'certifications':
        this.setCertifications(update.courses, update.progress, update.certifications, update.user);
        this.isLoading = false;
        break;
    }
  }

  private stopPublicViewLoading() {
    if (this.publicView) {
      this.isLoading = false;
    }
  }

  userRelationship(planetCode?: string | null): 'local' | 'parent' | 'child' {
    const { code, parentCode } = this.stateService.configuration;
    if (!planetCode || planetCode === code) {
      return 'local';
    }
    return planetCode === parentCode ? 'parent' : 'child';
  }

  goBack() {
    this.router.navigate([ '..' ], { relativeTo: this.route });
  }

  toggleOpenAchievementIndex(index) {
    this.openAchievementIndex = this.openAchievementIndex === index ? -1 : index;
  }

  isClickable(achievement): boolean {
    return (!!achievement.description && achievement.description.length > 0) || (!!achievement.link && achievement.link.length > 0);
  }

  onAchievementClick(achievement: any, index: number): void {
    if (!this.isClickable(achievement)) {
      return;
    }
    this.openAchievementIndex = this.openAchievementIndex === index ? -1 : index;
  }


  get resumeUrl() {
    if (!this.achievements?._attachments?.[this.resumeAttachmentKey] || !this.achievements?._id) {
      return '';
    }
    return `${environment.couchAddress}/${this.dbName}/${this.achievements._id}/${this.resumeAttachmentKey}`;
  }

  private setCertifications(courses: any[], progress: any[], certifications: any[], user: any) {
    if (!user?._id) {
      this.certifications = [];
      return;
    }
    this.certifications = certifications.filter(certification => {
      const certificateCourses = courses
        .filter(course => certification.courseIds.indexOf(course._id) > -1)
        .map(course => ({ ...course, progress: progress.filter(p => p.courseId === course._id) }));
      return certificateCourses.every(course => this.certificationsService.isCourseCompleted(course, user));
    });
  }

  copyLink() {
    const link = `${window.location.origin}/profile/${this.user.name}/achievements;planet=${this.stateService.configuration.code}`;
    this.clipboard.copy(link);
  }

  generatePDF() {
    const formattedBirthDate = this.user.birthDate ? formatDate(this.user.birthDate, 'mediumDate', this.localeId) : '';
    const formattedMemberSince = this.user.joinDate ? formatDate(this.user.joinDate, 'mediumDate', this.localeId) : '';
    let contentArray = [
      {
        text: $localize`${this.user.firstName}'s achievements`,
        style: 'header',
        alignment: 'center',
      },
      {
        text: `
          ${fullName(this.user) || this.user.name}
          ${formattedBirthDate ? $localize`Birthdate: ${formattedBirthDate}` : ''}
          ${this.user.birthplace ? $localize`Birthplace: ${this.user.birthplace}` : ''}
          ${formattedMemberSince ? $localize`Member since: ${formattedMemberSince}` : ''}
          `,
        alignment: 'center',
      },
    ];

    const optionals = [];
    const sectionSpacer = { text: '', margin: [ 0, 10 ] };

    if (this.achievements.purpose) {
      optionals.push(
        { text: $localize`My Purpose`, style: 'subHeader', alignment: 'center' },
        { text: this.achievements.purpose, alignment: 'left', margin: [ 20, 5 ] },
        sectionSpacer
      );
    }

    if (this.achievements.goals) {
      optionals.push(
        { text: $localize`My Goals`, style: 'subHeader', alignment: 'center' },
        { text: this.achievements.goals, alignment: 'left', margin: [ 20, 5 ] },
        sectionSpacer
      );
    }

    if (this.certifications && this.certifications.length > 0) {
      optionals.push(
        { text: $localize`My Certifications`, style: 'subHeader', alignment: 'center' },
        ...this.certifications.map((certification) => [
          { text: certification.name, bold: true, margin: [ 20, 5 ] },
        ]),
        sectionSpacer
      );
    }

    if (this.achievements.achievements && this.achievements.achievements.length > 0) {
      optionals.push(
        { text: $localize`My Achievements`, style: 'subHeader', alignment: 'center' },
        ...this.achievements.achievements.map((achievement) => {
          const formattedDate = achievement.date ? formatDate(achievement.date, 'mediumDate', this.localeId) : '';
          return [
            { text: achievement.title, bold: true, margin: [ 20, 5 ] },
            { text: achievement.date ? formattedDate : '', marginLeft: 40 },
            { text: achievement.link, marginLeft: 40 },
            { text: achievement.description, marginLeft: 40 },
          ];
        }),
        sectionSpacer
      );
    }

    if (this.achievements.links && this.achievements.links.length > 0) {
      optionals.push(
        { text: $localize`My Links`, style: 'subHeader', alignment: 'center' },
        ...this.achievements.links.map((achievement) => [
          { text: achievement.title, bold: true, margin: [ 20, 5 ] },
          { text: achievement.url, marginLeft: 40 },
        ]),
        sectionSpacer
      );
    }

    if (this.achievements.references && this.achievements.references.length > 0) {
      optionals.push(
        { text: $localize`My References`, style: 'subHeader', alignment: 'center' },
        ...this.achievements.references.map((achievement) => [
          { text: achievement.name, bold: true, margin: [ 20, 5 ] },
          { text: achievement.relationship, marginLeft: 40 },
          { text: achievement.phone, marginLeft: 40 },
          { text: achievement.email, marginLeft: 40 },
        ]),
        sectionSpacer
      );
    }

    contentArray = contentArray.concat(optionals);

    const documentDefinition = {
      content: contentArray,
      styles: {
        header: {
          fontSize: 18,
          bold: true,
        },
        subHeader: {
          fontSize: 16,
          bold: true
        }
      },
    };

    this.pdfService.download(documentDefinition, $localize`${this.user.name} achievements.pdf`);
  }
}
