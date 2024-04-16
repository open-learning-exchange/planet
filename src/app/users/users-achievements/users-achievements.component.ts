import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { UsersAchievementsService } from './users-achievements.service';
import { catchError, auditTime } from 'rxjs/operators';
import { throwError, combineLatest } from 'rxjs';
import { StateService } from '../../shared/state.service';
import { CoursesService } from '../../courses/courses.service';
import { CertificationsService } from '../../manager-dashboard/certifications/certifications.service';
import { HttpClient } from '@angular/common/http';

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
    private couchService: CouchService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private planetMessageService: PlanetMessageService,
    private usersAchievementsService: UsersAchievementsService,
    private stateService: StateService,
    private coursesService: CoursesService,
    private http: HttpClient,
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
    return (achievement.resources.length > 0
            || achievement.description.length > 0);
  }

  setCertifications(courses = [], progress = [], certifications = []) {
    this.certifications = certifications.filter(certification => {
      const certificateCourses = courses
        .filter(course => certification.courseIds.indexOf(course._id) > -1)
        .map(course => ({ ...course, progress: progress.filter(p => p.courseId === course._id) }));
      return certificateCourses.every(course => this.certificationsService.isCourseCompleted(course, this.user));
    });
  }

  toBase64(file, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => callback(reader.result);
    reader.onerror = (error) => console.error('Error: ', error);
  }

  downloadCertificate(certification) {
    this.http.get('assets/ole-cert-template.jpg', { responseType: 'blob' }).subscribe(blob => {
        this.toBase64(blob, (result) => {
            const imgSig = result;

            const documentDefinition = {
                content: [
                    {
                        text: `${this.user.firstName} ${this.user.middleName ? this.user.middleName : ''} ${this.user.lastName}`,
                        style: 'name'
                    },
                    {
                        text: `${certification.name}`,
                        style: 'courseName'
                    }
                ],
                styles: {
                    name: {
                        fontSize: 20,
                        alignment: 'center',
                        margin: [ 0, 180, 0, 20 ]
                    },
                    courseName: {
                        fontSize: 18,
                        italics: true,
                        alignment: 'center',
                        margin: [ 0, 50, 0, 30 ]
                    }
                },
                pageSize: {
                  width: 800,
                  height: 500
                },
                background: function(currentPage, pageSize) {
                    return {
                        image: imgSig,
                        width: pageSize.width,
                        height: pageSize.height,
                        alignment: 'center'
                    };
                }
            };

            pdfMake.createPdf(documentDefinition).download(`${certification.name} certificate.pdf`);
        });
    }, error => console.error('Error fetching image:', error));
}

}
