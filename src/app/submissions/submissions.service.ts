import { Injectable } from '@angular/core';
import { Subject, of, forkJoin, throwError, from } from 'rxjs';
import { catchError, finalize, map, switchMap, tap } from 'rxjs/operators';
import { Chart } from 'chart.js';
import htmlToPdfmake from 'html-to-pdfmake';
import { findDocuments } from '../shared/mangoQueries';
import { CouchService } from '../shared/couchdb.service';
import { StateService } from '../shared/state.service';
import { CoursesService } from '../courses/courses.service';
import { UserService } from '../shared/user.service';
import { dedupeShelfReduce, toProperCase, ageFromBirthDate, markdownToPlainText } from '../shared/utils';
import { CsvService } from '../shared/csv.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { ManagerService } from '../manager-dashboard/manager.service';
import { attachNamesToPlanets, codeToPlanetName } from '../manager-dashboard/reports/reports.utils';
import { TeamsService } from '../teams/teams.service';

const showdown = require('showdown');
const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');
pdfMake.vfs = pdfFonts.pdfMake.vfs;
const converter = new showdown.Converter();

@Injectable({
  providedIn: 'root'
})
export class SubmissionsService {

  // Currently there are separate observables for the single submission for a specific exam
  // and an array of submissions for the list of submissions
  private submissionsUpdated = new Subject<any[]>();
  submissionsUpdated$ = this.submissionsUpdated.asObservable();
  submissions = [];
  submission: any;
  private submissionUpdated = new Subject<any>();
  submissionUpdated$ = this.submissionUpdated.asObservable();
  submissionAttempts = 0;

  constructor(
    private couchService: CouchService,
    private stateService: StateService,
    private courseService: CoursesService,
    private userService: UserService,
    private csvService: CsvService,
    private planetMessageService: PlanetMessageService,
    private dialogsLoadingService: DialogsLoadingService,
    private managerService: ManagerService,
    private teamsService: TeamsService
  ) { }

  updateSubmissions({ query, opts = {}, onlyBest }: { onlyBest?: boolean, opts?: any, query?: any } = {}) {
    forkJoin([
      this.getSubmissions(query, opts),
      this.courseService.findCourses([], opts)
    ]).subscribe(([ submissions, courses ]: [any, any]) => {
      this.submissions = (onlyBest ? this.filterBestSubmissions(submissions) : submissions).filter(sub => {
        if (sub.status !== 'pending' || sub.type !== 'exam') {
          return true;
        }
        return courses.find((c: any) => sub.parentId.split('@')[1] === c._id) !== undefined;
      });
      this.submissionsUpdated.next(this.submissions);
    }, (err) => console.log(err));
  }

  getSubmissions(query: any = findDocuments({}), opts: any = {}) {
    return this.couchService.findAll('submissions', query, opts);
  }

  setSubmission(id: string) {
    this.submission = this.submissions.find((submission) => {
      return submission._id === id;
    });
  }

  private newSubmission({ parentId, parent, user, type }) {
    this.submission = this.createNewSubmission({ parentId, parent, user, type });
  }

  private createNewSubmission({ parentId, parent, user, type, sender, team }: { parentId, parent, user, type, sender?, team? }) {
    const date = this.couchService.datePlaceholder;
    const times = { startTime: date, lastUpdateTime: date };
    const configuration = this.stateService.configuration;
    return { parentId, parent, user, type, answers: [], grade: 0, status: 'pending', sender, team,
      ...this.submissionSource(configuration, user), ...times };
  }

  private submissionSource(configuration, user) {
    if (user.planetCode !== undefined && configuration.code !== user.planetCode) {
      return { source: user.planetCode, parentCode: configuration.code };
    }
    return { source: configuration.code, parentCode: configuration.parentCode };
  }

  openSubmission({ parentId = '', parent = '', user = { name: '' }, type = '', submissionId = '', status = 'pending' }: any) {
    const selector = submissionId ? { '_id': submissionId } : { parentId, 'user.name': user.name, 'parent._rev': parent._rev };
    const obs = user.name || submissionId ? this.couchService.post('submissions/_find', { selector }) : of({ docs: [] });
    obs.subscribe((res) => {
      let attempts = res.docs.length - 1;
      const bestAttempt = res.docs.reduce((best: any, submission: any) =>
        submission.grade > best.grade ? submission : best, res.docs[0]);
      this.submission = res.docs.find(submission => submission.status === status || type === 'survey');
      if (this.submission === undefined) {
        attempts += 1;
        this.newSubmission({ parentId, parent, user, type });
      }
      this.submissionAttempts = attempts;
      this.submissionUpdated.next({ submission: this.submission, attempts, bestAttempt });
    });
  }

  private formatShortDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });
  }

  submitAnswer(answer, correct: boolean, index: number, isFinish = false) {
    const submission = { ...this.submission, answers: [ ...this.submission.answers ], lastUpdateTime: this.couchService.datePlaceholder };
    const oldAnswer = submission.answers[index];
    submission.answers[index] = this.newAnswer(answer, oldAnswer, correct);
    const nextQuestion = this.nextQuestion(submission, index, 'passed', isFinish);
    if (correct !== undefined) {
      this.updateGrade(submission, correct ? 1 : 0, index);
    }
    return this.updateSubmission(submission, this.submission.type === 'exam', nextQuestion);
  }

  newAnswer(answer, oldAnswer, correct) {
    return ({
      value: correct === false ? '' : answer,
      mistakes: (oldAnswer ? oldAnswer.mistakes : 0) + (correct === false ? 1 : 0),
      passed: correct !== false && this.validAnswer(answer)
    });
  }

  submitGrade(grade, index: number, comment) {
    const submission = { ...this.submission, answers: [ ...this.submission.answers ], gradeTime: this.couchService.datePlaceholder };
    this.updateGrade(submission, grade, index, comment);
    const nextQuestion = this.nextQuestion(submission, index, 'grade');
    return this.updateSubmission(submission, false, nextQuestion);
  }

  nextQuestion(submission, index, field, isFinish = true) {
    const close = this.shouldCloseSubmission(submission, field);
    return !close ?
      this.findNextQuestion(submission, index + 1, field) :
      isFinish ?
      -1 :
      index;
  }

  updateGrade(submission, grade, index, comment?) {
    submission.answers[index].grade = grade;
    submission.answers[index].gradeComment = comment;
    submission.grade = this.calcTotalGrade(submission);
  }

  updateStatus(submission: any) {
    if (submission.type === 'exam' && submission.answers.findIndex(ans => ans.grade === undefined) > -1) {
      return 'requires grading';
    }
    const [ examId, getCourseId ] = this.submission.parentId.split('@');
    this.couchService.get('courses/' + getCourseId).subscribe((res: any) => {
      this.courseService.updateProgress({
        courseId: res._id,
        stepNum: res.steps.findIndex((step: any) => step.exam && (step.exam._id === examId)) + 1,
        passed: this.submission.answers.every(eachAnswer => eachAnswer.grade === 1)
      }, submission.user._id);
    }, error => console.log(error));
    return 'complete';
  }

  calcTotalGrade(submission: any) {
    return submission.answers.reduce((total: number, answer: any, index: number) =>
      total + (submission.parent.questions[index].marks * (answer && answer.grade || 0)), 0);
  }

  updateSubmission(submission: any, takingExam: boolean, nextQuestion: number) {
    submission.status = nextQuestion === -1 ? this.updateStatus(submission) : submission.status;
    return this.couchService.updateDocument('submissions', submission).pipe(map((res) => {
      let attempts = this.submissionAttempts;
      if (submission.status === 'complete' && takingExam) {
        attempts += 1;
        this.newSubmission(submission);
      } else {
        this.submission = { ...submission, _id: res.id, _rev: res.rev };
      }
      this.submissionUpdated.next({ submission: this.submission, attempts });
      return { submission, nextQuestion };
    }));
  }

  filterBestSubmissions(submissions) {
    return submissions.filter(s => s.type !== 'photo').reduce((subs, submission) => {
      const userSubmissionIndex = subs.findIndex((s) => s.user._id === submission.user._id && s.parentId === submission.parentId);
      if (userSubmissionIndex !== -1) {
        const oldSubmission = subs[userSubmissionIndex];
        subs[userSubmissionIndex] = this.calcTotalGrade(submission) > this.calcTotalGrade(oldSubmission) ?
          submission : oldSubmission;
      } else {
        subs.push(submission);
      }
      return subs;
    }, []);
  }

  sendSubmissionRequests(users: any[], { parentId, parent }) {
    return this.couchService.post('submissions/_find', findDocuments({
      parentId,
      'parent': { '_rev': parent._rev },
      '$or': users.map((user: any) => ({ 'user._id': user._id, 'source': user.planetCode }))
    })).pipe(
      switchMap((submissions: any) => {
        const newSubmissionUsers = users.filter((user: any) =>
          submissions.docs.findIndex((s: any) => (s.user._id === user._id && s.parent._rev === parent._rev)) === -1
        );
        const sender = this.userService.get().name;
        return this.couchService.updateDocument('submissions/_bulk_docs', {
          'docs': newSubmissionUsers.map((user) => this.createNewSubmission({ user, parentId, parent, type: 'survey', sender }))
        });
      })
    );
  }

  createSubmission(parent: any, type: string, user: any = '', team?: string) {
    return this.couchService.updateDocument('submissions', this.createNewSubmission({ parentId: parent._id, parent, user, type, team }));
  }

  submissionName(user) {
    return user.name || ((user.firstName || '') + ' ' + (user.lastName || '')).trim();
  }

  shouldCloseSubmission(submission, field) {
    return submission.answers.filter(answer => answer && this.validAnswer(answer[field])).length >= submission.parent.questions.length;
  }

  findNextQuestion(submission, index, field) {
    if (index >= submission.parent.questions.length) {
      return this.findNextQuestion(submission, 0, field);
    }
    return submission.answers[index] && this.validAnswer(submission.answers[index][field]) ?
      this.findNextQuestion(submission, index + 1, field) : index;
  }

  validAnswer(field) {
    return field !== undefined && field !== false && field !== '' && field !== null;
  }

  sendSubmissionNotification(isRecorded: boolean, isUpdated: boolean = false) {
    const data = {
      'message': $localize`<b>${this.userService.get().name}</b> has
        ${isUpdated ? 'updated' : isRecorded ? 'recorded' : 'completed'} the survey <b>${this.submission.parent.name}</b>`,
      'link': '/myDashboard/submissions/exam',
      'linkParams': { submissionId: this.submission._id, questionNum: 1, status: 'complete', mode: 'view' },
      'type': 'survey',
      'priority': 1,
      'status': 'unread',
      'time': this.couchService.datePlaceholder
    };
    const docs = [ this.submission.parent.createdBy, this.submission.sender ].reduce(dedupeShelfReduce, [])
      .filter(name => name !== undefined && name !== this.userService.get().name)
      .map(name => ({ ...data, user: 'org.couchdb.user:' + name }));
    if (docs.length > 0) {
      this.couchService.bulkDocs('notifications', docs).subscribe((res) => console.log(res));
    }
  }

  getSubmissionsExport(exam, type: 'exam' | 'survey') {
    const query = findDocuments({ 'parent._id': exam._id, type, status: 'complete' });
    return forkJoin([ this.getSubmissions(query), this.couchService.currentTime(), of(exam.questions.map(question => question.body)) ]);
  }

  exportSubmissionsCsv(exam, type: 'exam' | 'survey', team?: string) {
    return this.getSubmissionsExport(exam, type).pipe(switchMap(([ submissions, time, questionTexts ]: [any[], number, string[]]) => {
        const filteredSubmissions = team
          ? submissions.filter(s => s.team === team)
          : submissions;
        return forkJoin(
          filteredSubmissions.map(submission => {
            if (submission.team) {
              return this.teamsService.getTeamName(submission.team).pipe(
                map(teamName => ({ ...submission, teamName }))
              );
            }
            return of(submission);
          })
        ).pipe(
          map((updatedSubmissions: any[]): [any[], number, string[]] => [ updatedSubmissions, time, questionTexts ])
        );
      }),
      tap(([ updatedSubmissions, time, questionTexts ]) => {
        const data = updatedSubmissions.map(submission => {
          const answerIndexes = this.answerIndexes(questionTexts, submission);
          return {
            'Gender': submission.user.gender || 'N/A',
            'Age (years)': submission.user.birthDate ? ageFromBirthDate(time, submission.user.birthDate) : submission.user.age || 'N/A',
            'Planet': submission.source,
            'Date': submission.lastUpdateTime,
            'Team/Enterprise': submission.teamName || 'N/A',
            ...questionTexts.reduce((answerObj, text, index) => ({
              ...answerObj,
              [`"Q${index + 1}: ${markdownToPlainText(text).replace(/"/g, '""')}"`]:
                this.getAnswerText(submission.answers, index, answerIndexes)
            }), {})
          };
        });
        this.csvService.exportCSV({
          data,
          title: `${toProperCase(type)} -  ${exam.name}${exam.description ? '\n' + exam.description : ''}`,
        });
      })
    );
  }

  answerIndexes(questionTexts: string[], submission: any) {
    if (!submission || !submission.parent || !Array.isArray(submission.parent.questions) || !questionTexts) {
      return questionTexts.map(() => -1);
    }
    return questionTexts.map(text => submission.parent.questions.findIndex(question => question.body === text));
  }

  getAnswerText(answers: any[], index, answerIndexes: number[]) {
    const answer = answerIndexes[index] > -1 ? answers[index].value : undefined;
    return answer && (
      Array.isArray(answer) ? answer.reduce((ans, v) => ans + v.text + ',', '').slice(0, -1) : answer.text || answer
    );
  }

  getPDFAnswerText(submission: any, index, answerIndexes: number[]) {
    const answerText = this.getAnswerText(submission.answers, index, answerIndexes);
    if (!submission.parent || !Array.isArray(submission.parent.questions) || !submission.parent.questions[index]) {
      return answerText;
    }
    return submission.parent.questions[index] && submission.parent.questions[index].type !== 'textarea' ?
      '<pre>'.concat(answerText, '</pre>') :
      answerText;
  }

  async exportSubmissionsPdf(
    exam,
    type: 'exam' | 'survey',
    exportOptions: { includeQuestions, includeAnswers, includeCharts },
    team?: string
  ) {
    forkJoin([
      this.getSubmissionsExport(exam, type),
      this.managerService.getChildPlanets(true)
    ])
      .pipe(
        finalize(() => this.dialogsLoadingService.stop()),
        catchError((error) => {
          this.planetMessageService.showAlert($localize`Error exporting PDF: ${error.message}`);
          return throwError(error);
        }),
        switchMap(([ submissionsTuple, planets ]: [ [ any[], number, string[] ], any[] ]) => {
          const [ submissions, time, questionTexts ] = submissionsTuple;
          const filteredSubmissions = team
            ? submissions.filter(s => s.team === team)
            : submissions;
          if (!filteredSubmissions.length) {
            this.dialogsLoadingService.stop();
            this.planetMessageService.showMessage($localize`There is no survey response`);
            return of(null);
          }
          const planetsWithName = attachNamesToPlanets(planets);
          const submissionsWithPlanetName = filteredSubmissions.map(submission => ({
            ...submission,
            planetName: codeToPlanetName(submission.source, this.stateService.configuration, planetsWithName)
          }));
          return forkJoin(
            submissionsWithPlanetName.map(submission => {
              if (submission.team) {
                return this.teamsService.getTeamName(submission.team).pipe(
                  map(teamName => ({ ...submission, teamName }))
                );
              }
              return of(submission);
            })
          ).pipe(map((updatedSubmissions: any[]): [ any[], number, string[] ] => [ updatedSubmissions, time, questionTexts ])
          );
        })
      )
      .subscribe(async tuple => {
        if (!tuple) {
          return;
        }
        const [ updatedSubmissions, time, questionTexts ] = tuple as [any[], number, string[]];
        const markdown = this.preparePDF(exam, updatedSubmissions, questionTexts, exportOptions);
        const docContent = [ htmlToPdfmake(converter.makeHtml(markdown)) ];
        if (exportOptions.includeCharts) {
          docContent.push({
            canvas: [ { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 } ],
            margin: [ 0, 20, 0, 10 ]
          });
          docContent.push({
            text: $localize`Charts`,
            style: 'header',
            margin: [ 0, 20, 0, 10 ]
          });
          for (let i = 0; i < exam.questions.length; i++) {
            if (exam.questions[i].type !== 'select' && exam.questions[i].type !== 'selectMultiple') {
              continue;
            }
            const question = exam.questions[i];
            question.index = i;
            const aggregated = this.aggregateQuestionResponses(question, updatedSubmissions);
            const chartImage = await this.generateChartImage(aggregated);
            docContent.push({ text: question.body });
            docContent.push({
              image: chartImage,
              width: 200,
              alignment: 'center',
              margin: [ 0, 10, 0, 10 ]
            });
          }
        }
        pdfMake.createPdf({
          header: function(currentPage) {
            if (currentPage === 1) {
              return [
                htmlToPdfmake(converter.makeHtml(`<h1 style="text-align: center">${exam.name}${exam.description ? ': ' + exam.description : ''}</h1>`)),
              ];
            }
            return null;
          },
          content: [ docContent ],
          styles: {
            header: {
              fontSize: 20,
              bold: true
            }
          },
          pageBreakBefore: (currentNode) =>
            currentNode.style && currentNode.style.indexOf('pdf-break') > -1
        }).download(`${toProperCase(type)} - ${exam.name}.pdf`);
        this.dialogsLoadingService.stop();
      });
  }

  preparePDF(exam, submissions, questionTexts, { includeQuestions, includeAnswers }) {
    return (includeAnswers ? submissions : [ { parent: exam } ]).map((submission, index) => {
      const answerIndexes = this.answerIndexes(questionTexts, submission);
      return this.surveyHeader(includeAnswers, exam, index, submission) +
        questionTexts.map(this.questionOutput(submission, answerIndexes, includeQuestions, includeAnswers)).join('  \n');
    }).join('  \n');
  }

  surveyHeader(responseHeader: boolean, exam, index: number, submission): string {
    if (responseHeader) {
      const shortDate = this.formatShortDate(submission.lastUpdateTime);
      const mainHeader = `<h3${index === 0 ? '' : ' class="pdf-break"'}>Response from ${submission.planetName} on ${shortDate}</h3>`;
      if (submission.teamName) {
        const teamHeader = `<h5>${submission.teamName}</h5>`;
        return `${mainHeader}\n${teamHeader}\n`;
      } else {
        return `${mainHeader}\n`;
      }
    } else {
      return `### ${exam.name} Questions\n`;
    }
  }

  questionOutput(submission, answerIndexes, includeQuestions, includeAnswers) {
    const exportText = (text, index, label: 'Question' | 'Response') => `**${label} ${index + 1}:**  \n\n${text}  \n\n`;
    return (question, questionIndex) =>
      (includeQuestions ? exportText(question, questionIndex, 'Question') : '') +
      (includeAnswers ? exportText(this.getPDFAnswerText(submission, questionIndex, answerIndexes), questionIndex, 'Response') : '');
  }

  async generateChartImage(data: any): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    const chartRendered = new Promise<string>((resolve) => {
      const chartConfig = {
        type: 'pie',
        data: {
          labels: data.labels,
          datasets: [ {
            data: data.data,
            backgroundColor: [
              '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#8DD4F2', '#A8E6CF', '#DCE775'
            ]
          } ]
        },
        options: {
          animation: {
            onComplete: function() {
              this.ctx.font = '12px sans-serif';
              this.ctx.fillStyle = '#fff';
              this.ctx.textAlign = 'center';
              this.ctx.textBaseline = 'middle';
              this.getDatasetMeta(0).data.forEach((element, index) => {
                const count = data.data[index];
                const total = data.data.reduce((sum, val) => sum + val, 0);
                const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
                if (count > 0) {
                  const pos = element.tooltipPosition();
                  ctx.fillText(`${count.toString()}(${percentage}%)`, pos.x, pos.y);
                }
              });
              resolve(this.toBase64Image());
            }
          },
          responsive: false,
          maintainAspectRatio: false
        }
      };
      const chart = new Chart(ctx, chartConfig);
    });

    return chartRendered;
  }

  aggregateQuestionResponses(question: any, submissions: any[]): { labels: string[], data: number[] } {
    const counts: { [choiceText: string]: number } = {};
    question.choices.forEach((choice: any) => {
      counts[choice.text] = 0;
    });

    submissions.forEach(submission => {
      const answer = submission.answers[question.index];
      if (!answer) { return; }

      if (question.type === 'select') {
        const choiceText = answer.value.text;
        if (counts[choiceText] !== undefined) {
          counts[choiceText]++;
        }
      } else if (question.type === 'selectMultiple') {
        if (Array.isArray(answer.value)) {
          answer.value.forEach((selected: any) => {
            const choiceText = selected.text;
            if (counts[choiceText] !== undefined) {
              counts[choiceText]++;
            }
          });
        }
      }
    });

    const labels = Object.keys(counts);
    const data = labels.map(label => counts[label]);
    return { labels, data };
  }

}
