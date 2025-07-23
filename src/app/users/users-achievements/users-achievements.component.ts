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
import { formatDate, pdfMake, pdfFonts } from '../../shared/utils';

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
    const formattedBirthDate = this.user.birthDate ? formatDate(this.user.birthDate) : '';
    let contentArray = [
      {
        text: $localize`${`${this.user.firstName}'s achievements`}`,
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
          const formattedDate = achievement.date ? formatDate(achievement.date) : '';
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

    pdfMake
      .createPdf(documentDefinition)
      .download($localize`${this.user.name} achievements.pdf`);
  }
}
