import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  FormControl
} from '@angular/forms';
import { CouchService } from '../../shared/couchdb.service';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../shared/user.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { UsersAchievementsService } from './users-achievements.service';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { StateService } from '../../shared/state.service';
import { catchError } from 'rxjs/operators';
import { CustomValidators } from '../../validators/custom-validators';

@Component({
  templateUrl: './users-achievements-update.component.html',
  styleUrls: [ 'users-achievements-update.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class UsersAchievementsUpdateComponent implements OnInit {

  user = this.userService.get();
  configuration = this.stateService.configuration;
  docInfo = { '_id': this.user._id + '@' + this.configuration.code, '_rev': undefined };
  readonly dbName = 'achievements';
  editForm: FormGroup;
  infoTypes = this.usersAchievementsService.infoTypes;
  get achievements(): FormArray {
    return <FormArray>this.editForm.controls.achievements;
  }
  get otherInfo(): FormArray {
    return <FormArray>this.editForm.controls.otherInfo;
  }

  constructor(
    private fb: FormBuilder,
    private couchService: CouchService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private planetMessageService: PlanetMessageService,
    private usersAchievementsService: UsersAchievementsService,
    private dialogsFormService: DialogsFormService,
    private stateService: StateService
  ) {
    this.createForm();
  }

  ngOnInit() {
    this.usersAchievementsService.getAchievements(this.docInfo._id)
    .pipe(catchError(() => this.usersAchievementsService.getAchievements(this.user._id)))
    .subscribe((achievements) => {
      this.editForm.patchValue(achievements);
      this.editForm.controls.achievements = this.fb.array(achievements.achievements || []);
      this.editForm.controls.otherInfo = this.fb.array(achievements.otherInfo || []);
      if (this.docInfo._id === achievements._id) {
        this.docInfo._rev = achievements._rev;
      }
    }, (error) => {
      console.log(error);
    });
  }

  createForm() {
    this.editForm = this.fb.group({
      purpose: '',
      goals: '',
      achievementsHeader: '',
      achievements: this.fb.array([]),
      otherInfo: this.fb.array([]),
      sendToNation: false
    });
  }

  addAchievement(index = -1, achievement = { title: '', description: '', resources: [] }) {
    if (typeof achievement === 'string') {
      achievement = { title: '', description: achievement, resources: [] };
    }
    this.dialogsFormService.openDialogsForm(
      'Add Achievement',
      [
        { 'type': 'textbox', 'name': 'title', 'placeholder': 'title' },
        { 'type': 'textarea', 'name': 'description', 'placeholder': 'Description', 'required': false },
        { 'type': 'dialog', 'name': 'resources', 'db': 'resources', 'text': 'Add Resources' }
      ],
      this.fb.group({
        ...achievement,
        resources: [ achievement.resources ],
        title: [ achievement.title, CustomValidators.required ],
        description: [ achievement.description ],
        date: Date.now()
      }),
      { onSubmit: this.onDialogSubmit(this.achievements, index), closeOnSubmit: true }
    );
  }

  addOtherInfo(index = -1, info = { type: '', description: '' }) {
    this.dialogsFormService.openDialogsForm('Add Personal Information',
      [
        {
          'type': 'selectbox',
          'options': this.usersAchievementsService.infoTypes.map(type => ({ 'name': type, 'value': type })),
          'name': 'type',
          'placeholder': 'Type'
        },
        {
          'type': 'textarea',
          'name': 'description',
          'placeholder': 'Description'
        },
      ],
      this.fb.group({ ...info, description: [ info.description, CustomValidators.required ] }),
      { onSubmit: this.onDialogSubmit(this.otherInfo, index), closeOnSubmit: true }
    );
  }

  onDialogSubmit(formArray, index) {
    return (formValue, formGroup) => {
      if (formValue === undefined) {
        return;
      }
      this.updateFormArray(formArray, formGroup, index);
    };
  }

  updateFormArray(formArray: FormArray, value, index = -1) {
    if (index === -1) {
      formArray.push(value);
    } else {
      formArray.setControl(index, value);
    }
    this.editForm.updateValueAndValidity();
  }

  onSubmit() {
    this.editForm.updateValueAndValidity();
    if (this.editForm.valid) {
      this.updateAchievements(this.docInfo, this.editForm.value);
    } else {
      Object.keys(this.editForm.controls).forEach(field => {
        const control = this.editForm.get(field);
        control.markAsTouched({ onlySelf: true });
      });
    }
  }

  updateAchievements(docInfo, achievements) {
    // ...is the rest syntax for object destructuring
    this.couchService.post(this.dbName, { ...docInfo, ...achievements,
      'createdOn': this.configuration.code, 'username': this.user.name, 'parentCode': this.configuration.parentCode })
    .subscribe(() => {
      this.planetMessageService.showAlert('Achievements successfully updated');
      this.goBack();
    },  (err) => {
      this.planetMessageService.showAlert('There was an error updating your achievements');
    });
  }

  goBack() {
    this.router.navigate([ '..' ], { relativeTo: this.route });
  }

  removeResource(achievement: FormControl, resource) {
    achievement.setValue({ ...achievement.value, resources: achievement.value.resources.filter(({ _id }) => _id !== resource._id) });
  }

}
