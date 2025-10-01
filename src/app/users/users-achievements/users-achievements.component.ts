import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { Clipboard } from '@angular/cdk/clipboard';
import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { UsersAchievementsService } from './users-achievements.service';
import { catchError, auditTime } from 'rxjs/operators';
import { throwError, combineLatest } from 'rxjs';
import { StateService } from '../../shared/state.service';
import { CoursesService } from '../../courses/courses.service';
import { environment } from '../../../environments/environment';
import { CertificationsService } from '../../manager-dashboard/certifications/certifications.service';
import { formatStringDate, pdfMake, pdfFonts } from '../../shared/utils';

pdfMake.vfs = pdfFonts.pdfMake.vfs;

@Component({
  templateUrl: './users-achievements.component.html',
  styleUrls: [ './users-achievements.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class UsersAchievementsComponent implements OnInit {
  user: any = {};
  achievements: any;
  achievementNotFound = false;
  ownAchievements = false;
  urlPrefix = environment.couchAddress + '/_users/org.couchdb.user:' + this.userService.get().name + '/';
  openAchievementIndex = -1;
  certifications: any[] = [];
  publicView = this.route.snapshot.data.requiresAuth === false && !this.userService.get()._id;
  isLoading = true;

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
    private clipboard: Clipboard
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe((params: ParamMap) => {
      let name = params.get('name'),
          id;
      const currentUser = this.userService.get();
      if (name === null || name === undefined) {
        this.user = currentUser;
        id = (this.user._id + '@' + this.stateService.configuration.code);
      } else {
        name = name.split('@')[0];
        this.initUser(name, params.get('planet'));
        id = 'org.couchdb.user:' + name + '@' + params.get('planet');
      }
      if (id === (currentUser._id + '@' + currentUser.planetCode)) {
        this.ownAchievements = true;
      }
      this.initAchievements(id);
    });
    combineLatest([
      this.coursesService.coursesListener$(), this.coursesService.progressListener$(), this.certificationsService.getCertifications()
    ]).pipe(auditTime(500)).subscribe(([ courses, progress, certifications ]) => {
      this.setCertifications(courses, progress, certifications);
      this.isLoading = false;
    });
    this.coursesService.requestCourses();
  }

  initAchievements(id) {
    this.usersAchievementsService.getAchievements(id).pipe(
      catchError((err) => this.ownAchievements ? this.usersAchievementsService.getAchievements(this.user._id) : throwError(err))
    ).subscribe((achievements) => {
      if (this.usersAchievementsService.isEmpty(achievements)) {
        this.achievementNotFound = true;
      } else {
        this.achievements = achievements;
      }
    }, (error) => {
      if (error.status === 404) {
        this.achievementNotFound = true;
      } else {
        this.planetMessageService.showAlert($localize`There was an error getting achievements`);
      }
    });
  }

  initUser(name, planetCode) {
    const isLocal = this.stateService.configuration.code === planetCode;
    const db = isLocal ? '_users' : 'child_users';
    const id = isLocal ? 'org.couchdb.user:' + name : name + '@' + planetCode;
    this.couchService.get(db + '/' + id).subscribe((user) => this.user = user);
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
    const formattedBirthDate = this.user.birthDate ? formatStringDate(this.user.birthDate) : '';
    const sectionMargin = [ 0, 24, 0, 0 ];
    const bodyMargin = [ 0, 0, 0, 12 ];
    const detailMargin = [ 0, 2, 0, 6 ];
    const titleMargin = [ 0, 0, 0, 8 ];
    const tableLayout = {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 4,
      paddingBottom: () => 4,
    };

    const createSection = (title, sectionContent = []) => ({
      margin: sectionMargin,
      stack: [
        { text: title, style: 'sectionHeader' },
        ...sectionContent
      ],
    });

    const createTable = (rows, widths) => ({
      margin: bodyMargin,
      table: {
        widths,
        body: rows,
      },
      layout: tableLayout,
    });

    const createDetailStack = (values: any[]) => {
      const stack = values
        .filter((value) => !!value)
        .map((value) => ({
          ...value,
          margin: value && value.margin ? value.margin : detailMargin,
        }));

      if (!stack.length) {
        stack.push({ text: '', margin: detailMargin });
      }

      return { stack };
    };

    let contentArray = [
      {
        text: $localize`${`${this.user.firstName}'s achievements`}`,
        style: 'header',
      },
      {
        text: `
          ${this.user.firstName} ${this.user.middleName ? this.user.middleName : ''} ${this.user.lastName}
          ${formattedBirthDate ? $localize`Birthdate: ${formattedBirthDate}` : ''}
          ${this.user.birthplace ? $localize`Birthplace: ${this.user.birthplace}` : ''}
          `,
        style: 'sectionBody',
        alignment: 'center',
      },
    ];

    const optionals = [];

    if (this.achievements.purpose) {
      optionals.push(
        createSection($localize`My Purpose`, [
          { text: this.achievements.purpose, style: 'sectionBody' },
        ]),
      );
    }

    if (this.achievements.goals) {
      optionals.push(
        createSection($localize`My Goals`, [
          { text: this.achievements.goals, style: 'sectionBody' },
        ]),
      );
    }

    if (this.certifications && this.certifications.length > 0) {
      optionals.push(
        createSection($localize`My Certifications`, [
          createTable(
            this.certifications.map((certification) => [
              { text: certification.name, bold: true, margin: titleMargin },
            ]),
            [ '*' ]
          ),
        ]),
      );
    }

    if (this.achievements.achievements && this.achievements.achievements.length > 0) {
      optionals.push(
        createSection($localize`My Achievements`, [
          createTable(
            this.achievements.achievements.map((achievement) => {
              const formattedDate = achievement.date ? formatStringDate(achievement.date) : '';
              const detailStack = createDetailStack([
                achievement.date ? { text: formattedDate, style: 'sectionDetail' } : null,
                achievement.link ? { text: achievement.link, style: 'sectionDetail' } : null,
                achievement.description ? { text: achievement.description, style: 'sectionDetail' } : null,
              ]);

              return [
                { text: achievement.title, bold: true, margin: titleMargin },
                detailStack,
              ];
            }),
            [ 'auto', '*' ]
          ),
        ]),
      );
    }

    if (this.achievements.links && this.achievements.links.length > 0) {
      optionals.push(
        createSection($localize`My Links`, [
          createTable(
            this.achievements.links.map((achievement) => [
              { text: achievement.title, bold: true, margin: titleMargin },
              createDetailStack([
                achievement.url ? { text: achievement.url, style: 'sectionDetail' } : null,
              ]),
            ]),
            [ 'auto', '*' ]
          ),
        ]),
      );
    }

    if (this.achievements.references && this.achievements.references.length > 0) {
      optionals.push(
        createSection($localize`My References`, [
          createTable(
            this.achievements.references.map((achievement) => [
              { text: achievement.name, bold: true, margin: titleMargin },
              createDetailStack([
                achievement.relationship ? { text: achievement.relationship, style: 'sectionDetail' } : null,
                achievement.phone ? { text: achievement.phone, style: 'sectionDetail' } : null,
                achievement.email ? { text: achievement.email, style: 'sectionDetail' } : null,
              ]),
            ]),
            [ 'auto', '*' ]
          ),
        ]),
      );
    }

    contentArray = contentArray.concat(optionals);

    const documentDefinition = {
      pageMargins: [ 40, 48, 40, 48 ],
      content: contentArray,
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          alignment: 'center',
          margin: [ 0, 0, 0, 16 ],
        },
        sectionHeader: {
          fontSize: 16,
          bold: true,
          alignment: 'center',
          margin: [ 0, 0, 0, 12 ],
        },
        sectionBody: {
          fontSize: 11,
          margin: bodyMargin,
        },
        sectionDetail: {
          fontSize: 10,
        },
      },
      defaultStyle: {
        lineHeight: 1.3,
      },
    };

    pdfMake
      .createPdf(documentDefinition)
      .download($localize`${this.user.name} achievements.pdf`);
  }
}
