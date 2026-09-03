import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { finalize, map, switchMap } from 'rxjs/operators';
import { CustomValidators } from '../validators/custom-validators';
import { ValidatorService } from '../validators/validator.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { StateService } from '../shared/state.service';
import { of, Subject } from 'rxjs';
import { addDateAndTime, getClockTime } from '../shared/utils';
import { findDocuments } from '../shared/mangoQueries';
import { assigneeMatches, effectiveAssignees, storedAssignee } from './tasks.utils';

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
    return this.tasksUpdated.pipe(map((res: any) => res.planetField === planetField ?
      res.newData.filter(task =>
        task.link &&
        Object.entries(task.link).every(([ key, value ]) => value === link[key]) &&
        task.status !== 'archived'
      ) :
      []
    ));
  }

  addDialogSubmit(additionalFields, task: any, newTask: any, onSuccess) {
    const deadline = new Date(addDateAndTime(new Date(newTask.deadline).getTime(), newTask.deadlineTime)).getTime();
    const assignees = effectiveAssignees(task).map(assignee => storedAssignee(
      assignee, this.stateService.configuration?.code
    ));
    this.addTask({
      ...task,
      ...newTask,
      deadline,
      ...additionalFields,
      assignee: assignees[0] || '',
      assignees,
      deadlineTime: undefined
    }).pipe(
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
    }).pipe(
      map(res => {
        this.getTasks();
        return res;
      })
    );
  }

  sortedTasks(tasks, tasksInOrder = []) {
    const compare = (a, b) => a > b ?
      1 :
      a < b ?
        -1 :
        false;
    return tasks.sort((a, b) =>
      compare(new Date(a.deadline), new Date(b.deadline)) ||
      compare(a.completed, b.completed) ||
      compare(tasksInOrder.findIndex(t => t._id === a._id), tasksInOrder.findIndex(t => t._id === b._id)) ||
      0
    );
  }

  removeAssigneeFromTasks(userId: string, userPlanetCode?: string | string[], link?: any) {
    const localPlanetCode = this.stateService.configuration?.code;
    const planetCodes = [ ...new Set(Array.isArray(userPlanetCode) ? userPlanetCode : [ userPlanetCode ]) ];
    const identities = planetCodes.map(code => ({ userId, userPlanetCode: code }));
    const legacySelectors: any[] = planetCodes.map(code =>
      code ? { 'assignee.userId': userId, 'assignee.userPlanetCode': code } : { 'assignee.userId': userId }
    );
    const arraySelectors: any[] = planetCodes.map(code => ({
      assignees: { $elemMatch: code ? { userId, userPlanetCode: code } : { userId } }
    }));
    if (planetCodes.includes(localPlanetCode)) {
      legacySelectors.push({ 'assignee.userId': userId, 'assignee.userPlanetCode': { $exists: false } });
      arraySelectors.push({ assignees: { $elemMatch: { userId, userPlanetCode: { $exists: false } } } });
    }
    const selector: any = {
      $or: [ ...legacySelectors, ...arraySelectors ]
    };
    if (link) {
      selector.link = link;
    }
    return this.couchService.findAll(this.dbName, findDocuments(selector)).pipe(
      switchMap((docs: any[]) => {
        const updatedDocs = docs.map(doc => {
          const currentAssignees = effectiveAssignees(doc);
          const matchesIdentity = assignee => identities.some(identity =>
            assigneeMatches(assignee, identity, localPlanetCode)
          );
          const assignees = currentAssignees.filter(assignee => !matchesIdentity(assignee));
          const legacyMatches = doc.assignee && matchesIdentity(doc.assignee);
          return assignees.length === currentAssignees.length && !legacyMatches ? undefined : {
            ...doc,
            assignee: assignees[0] || '',
            assignees
          };
        }).filter(Boolean);
        return updatedDocs.length > 0 ? this.couchService.bulkDocs(this.dbName, updatedDocs) : of([]);
      }),
      map(() => this.getTasks())
    );
  }

}
