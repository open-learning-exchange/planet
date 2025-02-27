import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { finalize, map, switchMap } from 'rxjs/operators';
import { CustomValidators } from '../validators/custom-validators';
import { ValidatorService } from '../validators/validator.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { StateService } from '../shared/state.service';
import { Subject, of } from 'rxjs';
import { addDateAndTime, getClockTime } from '../shared/utils';
import { findDocuments } from '../shared/mangoQueries';
import { environment } from '../../environments/environment';

interface Attachment {
  _id: string;
  userId: string;
  planetCode: string;
  _attachments: {
    [key: string]: {
      content_type: string;
      digest: string;
      length: number;
      revpos: number;
      stub: boolean;
    }
  };
}

interface TaskAssignee {
  userId: string;
  name: string;
  attachmentDoc?: Attachment;
  avatar?: string;
  teamPlanetCode?: string;
}

interface Task {
  _id?: string;
  title: string;
  description?: string;
  deadline: number;
  completed: boolean;
  completedTime?: number;
  status?: string;
  assignee?: TaskAssignee;
  link?: any;
}

@Injectable({
  providedIn: 'root'
})
export class TasksService {

  private dbName = 'tasks';
  private tasksUpdated = new Subject<any>();

  constructor(
    private couchService: CouchService,
    private dialogsLoadingService: DialogsLoadingService,
    private validatorService: ValidatorService,
    private stateService: StateService
  ) {
    this.stateService.couchStateListener(this.dbName).subscribe(res => {
      if (res) {
        this.tasksUpdated.next(res);
      }
    });
  }

  archiveTask(task) {
    return () => this.addTask({ ...task, status: 'archived' });
  }

  getTasks(planetField = 'local') {
    this.stateService.requestData(this.dbName, planetField);
  }

  tasksListener(link = {}, planetField = 'local') {
    return this.tasksUpdated.pipe(
      switchMap((res: any) => {
        if (res.planetField !== planetField) {
          return of([] as Task[]);
        }
        const tasks = res.newData.filter((task: Task) =>
          task.link &&
          Object.entries(task.link).every(([ key, value ]) => value === link[key]) &&
          task.status !== 'archived'
        );
        // Get latest attachments for all task assignees
        const userIds = tasks
          .filter((task: Task) => task.assignee && task.assignee.userId)
          .map((task: Task) => task.assignee.userId);
        if (userIds.length === 0) {
          return of(tasks);
        }
        return this.couchService.findAll('attachments').pipe(
          map((attachments: Attachment[]) => {
            return tasks.map((task: Task) => {
              if (!task.assignee) {
                return task;
              }
              const userId = task.assignee.userId;
              const attachmentId = `${userId}@${this.stateService.configuration.code}`;
              const attachment = attachments.find(a => a._id === attachmentId);
              return {
                ...task,
                assignee: {
                  ...task.assignee,
                  attachmentDoc: attachment
                }
              };
            });
          })
        );
      })
    );
  }

  getTaskAvatar(assignee: any) {
    if (!assignee) {
      return 'assets/image.png';
    }
    if (assignee.attachmentDoc && assignee.attachmentDoc._attachments) {
      const filename = Object.keys(assignee.attachmentDoc._attachments)[0];
      return `${environment.couchAddress}/attachments/${assignee.attachmentDoc._id}/${filename}`;
    }
    if (assignee.userDoc && assignee.userDoc._attachments) {
      const filename = Object.keys(assignee.userDoc._attachments)[0];
      return `${environment.couchAddress}/_users/${assignee.userDoc._id}/${filename}`;
    }
    return 'assets/image.png';
  }

  addDialogSubmit(additionalFields, task: any, newTask: any, onSuccess) {
    const deadline = new Date(addDateAndTime(new Date(newTask.deadline).getTime(), newTask.deadlineTime)).getTime();
    this.addTask({ assignee: '', ...task, ...newTask, deadline, ...additionalFields, deadlineTime: undefined }).pipe(
      finalize(() => this.dialogsLoadingService.stop())
    ).subscribe((res) => {
      onSuccess(res.doc);
    });
  }

  addDialogForm(task: any = {}) {
    const { deadline, deadlineTime } = task.deadline ?
      { deadline: new Date(new Date(task.deadline).setHours(0, 0, 0)), deadlineTime: getClockTime(new Date(task.deadline)) } :
      { deadline: '', deadlineTime: '09:00' };
    return {
      fields: [
        { placeholder: $localize`Task`, type: 'textbox', name: 'title', required: true },
        { placeholder: $localize`Deadline`, type: 'date', name: 'deadline', required: true },
        { placeholder: $localize`Deadline Time`, type: 'time', name: 'deadlineTime', required: true },
        { placeholder: $localize`Description`, type: 'markdown', name: 'description', required: false }
      ],
      formGroup: {
        title: [ task.title || '', CustomValidators.required ],
        deadline: task.title ? [
          deadline,
          CustomValidators.dateValidRequired
        ] : [
          deadline,
          CustomValidators.dateValidRequired,
          (ac) => this.validatorService.notDateInPast$(ac)
        ],
        deadlineTime: [ deadlineTime, CustomValidators.dateValidRequired ],
        description: task.description || ''
      }
    };
  }

  addTask(task) {
    return this.couchService.updateDocument(this.dbName, {
      ...task,
      completed: task.completed || false,
      completedTime: task.completed ? (task.completedTime || this.couchService.datePlaceholder) : undefined
    });
  }

  sortedTasks(tasks, tasksInOrder = []) {
    const compare = (a, b) => a > b ?
      1 :
      a < b ?
      -1 :
      false;
    return tasks.sort((a, b) =>
      compare(tasksInOrder.findIndex(t => t._id === a._id), tasksInOrder.findIndex(t => t._id === b._id)) ||
      compare(a.completed, b.completed) ||
      compare(new Date(a.deadline), new Date(b.deadline)) ||
      0
    );
  }

  removeAssigneeFromTasks(userId: any, link?: any) {
    return this.couchService.findAll(this.dbName, findDocuments({ 'assignee.userId': userId, link })).pipe(
      switchMap((docs: any[]) => this.couchService.bulkDocs(this.dbName, docs.map(doc => ({ ...doc, assignee: '' })))),
      map(() => this.getTasks())
    );
  }

}
