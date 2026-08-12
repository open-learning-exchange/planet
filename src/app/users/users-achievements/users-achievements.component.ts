import { Component, Inject, LOCALE_ID, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Router, ActivatedRoute, ParamMap, RouterLink } from '@angular/router';
import { Clipboard } from '@angular/cdk/clipboard';
import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { UsersAchievementsService } from './users-achievements.service';
import { catchError, auditTime, map, switchMap, takeUntil } from 'rxjs/operators';
import { throwError, combineLatest, merge, of, Observable, Subject } from 'rxjs';
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
import { TdMarkdownComponent } from '@covalent/markdown';
import { PlanetBetaDirective } from '../../shared/beta.directive';
import { TruncateTextPipe } from '../../shared/truncate-text.pipe';

interface AchievementsRoute {
  achievementsId: string;
  ownAchievements: boolean;
  fallbackId: string;
  userRequest: { name: string, planetCode: string } | null;
}

type AchievementsUpdate =
  { type: 'user', user: any } |
  { type: 'userError' } |
  { type: 'achievements', achievements: any } |
  { type: 'achievementsError', error: any };

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
    TdMarkdownComponent,
    PlanetBetaDirective,
    MatList,
    MatListItem,
    MatListItemTitle,
    MatListItemMeta,
    NgClass,
    MatListItemLine,
    DatePipe,
    TruncateTextPipe
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
  urlPrefix = environment.couchAddress + '/_users/org.couchdb.user:' + this.userService.get().name + '/';
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
    this.route.paramMap.pipe(
      map((params: ParamMap) => this.initRoute(params)),
      switchMap((achievementsRoute: AchievementsRoute) => this.routeUpdates(achievementsRoute)),
      takeUntil(this.onDestroy$)
    ).subscribe((update: AchievementsUpdate) => this.applyUpdate(update));
    if (this.publicView) {
      return;
    }
    combineLatest([
      this.coursesService.coursesListener$(), this.coursesService.progressListener$(), this.certificationsService.getCertifications()
    ]).pipe(auditTime(500), takeUntil(this.onDestroy$)).subscribe(([ courses, progress, certifications ]) => {
      this.setCertifications(courses, progress, certifications);
      this.isLoading = false;
    });
    this.coursesService.requestCourses();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  // Clears state from the previously viewed user and describes the requests the new route needs
  private initRoute(params: ParamMap): AchievementsRoute {
    const currentUser = this.userService.get();
    const nameParam = params.get('name');
    let achievementsId: string;
    let userRequest: { name: string, planetCode: string } | null = null;
    this.resetRouteState();
    if (nameParam === null || nameParam === undefined) {
      achievementsId = currentUser._id + '@' + this.stateService.configuration.code;
      this.user = currentUser;
      this.userName = currentUser.name;
      this.userPlanetCode = currentUser.planetCode;
    } else {
      const name = nameParam.split('@')[0];
      const planetCode = params.get('planet');
      achievementsId = 'org.couchdb.user:' + name + '@' + planetCode;
      // Set synchronously so the name and avatar of the newly routed user show while its document is still loading
      this.userName = name;
      this.userPlanetCode = planetCode;
      this.user = { name, planetCode };
      userRequest = { name, planetCode };
    }
    this.ownAchievements = achievementsId === (currentUser._id + '@' + currentUser.planetCode);
    return { achievementsId, ownAchievements: this.ownAchievements, fallbackId: currentUser._id, userRequest };
  }

  private resetRouteState() {
    this.user = {};
    this.userName = undefined;
    this.userPlanetCode = undefined;
    this.achievements = undefined;
    this.achievementNotFound = false;
    this.ownAchievements = false;
    this.openAchievementIndex = -1;
  }

  private routeUpdates({ achievementsId, ownAchievements, fallbackId, userRequest }: AchievementsRoute): Observable<AchievementsUpdate> {
    const achievements$ = this.achievementsUpdates(achievementsId, ownAchievements, fallbackId);
    return userRequest ? merge(this.userUpdates(userRequest.name, userRequest.planetCode), achievements$) : achievements$;
  }

  private achievementsUpdates(id: string, ownAchievements: boolean, fallbackId: string): Observable<AchievementsUpdate> {
    return this.usersAchievementsService.getAchievements(id).pipe(
      catchError((err) => ownAchievements ? this.usersAchievementsService.getAchievements(fallbackId) : throwError(err)),
      map((achievements): AchievementsUpdate => ({ type: 'achievements', achievements })),
      catchError((error) => of<AchievementsUpdate>({ type: 'achievementsError', error }))
    );
  }

  private userUpdates(name: string, planetCode: string): Observable<AchievementsUpdate> {
    const isLocal = this.stateService.configuration.code === planetCode;
    const db = isLocal ? '_users' : 'child_users';
    const id = isLocal ? 'org.couchdb.user:' + name : name + '@' + planetCode;
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
    }
  }

  private stopPublicViewLoading() {
    if (this.publicView) {
      this.isLoading = false;
    }
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

  get profileImg() {
    const attachments = this.userService.get()._attachments;
    if (attachments) {
      return this.urlPrefix + Object.keys(attachments)[0];
    }
    return 'assets/image.png';
  }

  setCertifications(courses = [], progress = [], certifications = []) {
    this.certifications = certifications.filter(certification => {
      const certificateCourses = courses
        .filter(course => certification.courseIds.indexOf(course._id) > -1)
        .map(course => ({ ...course, progress: progress.filter(p => p.courseId === course._id) }));
      return certificateCourses.every(course => this.certificationsService.isCourseCompleted(course, this.user));
    });
  }

  copyLink() {
    const link = `${window.location.origin}/profile/${this.user.name}/achievements;planet=${this.stateService.configuration.code}`;
    this.clipboard.copy(link);
  }

  generatePDF() {
    const formattedBirthDate = this.user.birthDate ? formatDate(this.user.birthDate, 'mediumDate', this.localeId) : '';
    let contentArray = [
      {
        text: $localize`${this.user.firstName}'s achievements`,
        style: 'header',
        alignment: 'center',
      },
      {
        text: `
          ${this.user.firstName} ${this.user.middleName ? this.user.middleName : ''} ${this.user.lastName}
          ${formattedBirthDate ? $localize`Birthdate: ${formattedBirthDate}` : ''}
          ${this.user.birthplace ? $localize`Birthplace: ${this.user.birthplace}` : ''}
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
        ...this.certifications.map((certification) => {
          return [
            { text: certification.name, bold: true, margin: [ 20, 5 ] },
          ];
        }),
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
        ...this.achievements.links.map((achievement) => {
          return [
            { text: achievement.title, bold: true, margin: [ 20, 5 ] },
            { text: achievement.url, marginLeft: 40 },
          ];
        }),
        sectionSpacer
      );
    }

    if (this.achievements.references && this.achievements.references.length > 0) {
      optionals.push(
        { text: $localize`My References`, style: 'subHeader', alignment: 'center' },
        ...this.achievements.references.map((achievement) => {
          return [
            { text: achievement.name, bold: true, margin: [ 20, 5 ] },
            { text: achievement.relationship, marginLeft: 40 },
            { text: achievement.phone, marginLeft: 40 },
            { text: achievement.email, marginLeft: 40 },
          ];
        }),
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
