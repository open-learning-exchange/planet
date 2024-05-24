import { format } from 'date-fns';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { UsersAchievementsService } from './users-achievements.service';
import { catchError, auditTime } from 'rxjs/operators';
import { throwError, combineLatest } from 'rxjs';
import { StateService } from '../../shared/state.service';
import { CoursesService } from '../../courses/courses.service';
import { CertificationsService } from '../../manager-dashboard/certifications/certifications.service';
import { ChatService } from '../../shared/chat.service';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';

const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');
pdfMake.vfs = pdfFonts.pdfMake.vfs;

const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');
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
  openAchievementIndex = -1;
  certifications: any[] = [];

  constructor(
    private chatService: ChatService,
    private couchService: CouchService,
    private dialogsFormService: DialogsFormService,
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private planetMessageService: PlanetMessageService,
    private usersAchievementsService: UsersAchievementsService,
    private stateService: StateService,
    private coursesService: CoursesService,
    private certificationsService: CertificationsService
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

  isClickable(achievement) {
    return achievement.description.length > 0;
  }

  setCertifications(courses = [], progress = [], certifications = []) {
    this.certifications = certifications.filter(certification => {
      const certificateCourses = courses
        .filter(course => certification.courseIds.indexOf(course._id) > -1)
        .map(course => ({ ...course, progress: progress.filter(p => p.courseId === course._id) }));
      return certificateCourses.every(course => this.certificationsService.isCourseCompleted(course, this.user));
    });
  }

  openGenerateResumeDialog() {
    this.dialogsFormService.openDialogsForm(
      $localize`Generate Resume`,
      [
        { 'type': 'markdown', 'name': 'education', 'placeholder': $localize`Education`, 'required': false },
        { 'type': 'markdown', 'name': 'experience', 'placeholder': $localize`Experience`, 'required': false },
        { 'type': 'markdown', 'name': 'skills', 'placeholder': $localize`Skills`, 'required': false },
        { 'type': 'markdown', 'name': 'additional', 'placeholder': $localize`Additional Info`, 'required': false }
      ],
      this.fb.group({
        education: [ '' ],
        experience: [ '' ],
        skills: [ '' ],
        additional: [ '' ]
      }),
      { onSubmit: this.generateResume.bind(this), closeOnSubmit: true }
    );
  }

  generateResume(formData) {
    const { email, firstName, middleName, lastName, language, phoneNumber } = this.user;
    const { achievements, achievementsHeader, goals, purpose, references } = this.achievements;

    const formatReferences = (refs) => {
      return refs.map(ref => {
        return `Name: ${ref.name}, Relationship: ${ref.relationship}, Email: ${ref.email}, Phone: ${ref.phone}`;
      }).join('\n');
    };

    const data = {
      content: `
      This is the learner info that I have

      name: ${firstName} ${middleName} ${lastName}
      email: ${email}
      phone: ${phoneNumber}
      language: ${language}

      achievements: ${achievementsHeader} - ${achievements}
      goals: ${goals}
      purpose: ${purpose}
      ${formData ? `User-filled form data ${formData}` : ''}

      references: ${formatReferences(references)}

      Generate a resume following the format below as close as possible
      1. Personal Information
      2. Objective/Summary
      3. Education
      4. Experience
      5. Skills
      6. Certifications
      7. Awards and Honors(optional)
      8. References(optional)

      The resume is in PDF format, so vary the text style(Using paragraphs, bullet points) to make it look like a resume
      Only output the resume, no additional context
    `,
      aiProvider: { name: 'openai' },
    };

    this.chatService.getPrompt(data, false).subscribe((response) => {
      pdfMake
      .createPdf({
        content: response['chat']
      })
      .download(`${this.user.name} resumé.pdf`);
    });

  }

  generatePDF() {
    const formattedBirthDate = format(new Date(this.user.birthDate), 'MMM d, y, h:mm:ss a');
    let contentArray = [
      {
        text: `${`${this.user.firstName}'s achievements`}`,
        style: 'header',
        alignment: 'center',
      },
      {
        text: `
          ${this.user.firstName} ${this.user.middleName ? this.user.middleName : ''} ${this.user.lastName}
          ${this.user.birthDate ? `Birthdate: ${this.user.birthDate}` : ''}
          ${formattedBirthDate ? `Birthplace: ${formattedBirthDate}` : ''}
          `,
        alignment: 'center',
      },
    ];

    const optionals = [];
    if (this.achievements.purpose) {
      optionals.push(
        { text: 'My Purpose', style: 'subHeader', alignment: 'center' },
        { text: this.achievements.purpose, alignment: 'left', margin: [ 20, 5 ] }
      );
    }

    if (this.achievements.goals) {
      optionals.push(
        { text: 'My Goals', style: 'subHeader', alignment: 'center' },
        { text: this.achievements.goals, alignment: 'left', margin: [ 20, 5 ] }
      );
    }

    if (this.achievements.achievements && this.achievements.achievements.length > 0) {
      optionals.push(
        { text: 'My Achievements', style: 'subHeader', alignment: 'center' },
        ...this.achievements.achievements.map((achievement) => {
          return [
            { text: achievement.title, bold: true, margin: [ 20, 5 ] },
            { text: achievement.description, marginLeft: 40 },
          ];
        })
      );
    }

    if (this.certifications && this.certifications.length > 0) {
      optionals.push(
        { text: 'My Certifications', style: 'subHeader', alignment: 'center' },
        ...this.certifications.map((certification) => {
          return [
            { text: certification.title, bold: true, margin: [ 20, 5 ] },
            { text: certification.description, marginLeft: 40 },
          ];
        })
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
      .download(`${this.user.name} achievements.pdf`);
  }

}
