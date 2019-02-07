import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray
} from '@angular/forms';
import { CouchService } from '../../shared/couchdb.service';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../shared/user.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { UsersAchievementsService } from './users-achievements.service';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { StateService } from '../../shared/state.service';
import { catchError } from 'rxjs/operators';

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
    this.getAchievements(this.docInfo._id).pipe(catchError(() => this.getAchievements(this.user._id))).subscribe((achievements) => {
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

  getAchievements(id) {
    return this.couchService.get(this.dbName + '/' + id);
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

  addAchievement(index = -1, achievement?) {
    this.dialogsFormService.confirm('Add Achievement', [
      {
        'type': 'textarea',
        'name': 'description',
        'placeholder': 'Description'
      },
    ], this.fb.group({ description: achievement })).subscribe((newAchievement: any) => {
      if (newAchievement === undefined) {
        return;
      }
      this.updateFormArray(this.achievements, this.fb.control(newAchievement.description), index);
    });
  }

  addOtherInfo(index = -1, info?: any) {
    this.dialogsFormService.confirm('Add Other Information', [
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
    ], this.fb.group({ type: '', description: '', ...info })).subscribe((newInfo: any) => {
      if (newInfo === undefined) {
        return;
      }
      this.updateFormArray(this.otherInfo, this.fb.group(newInfo), index);
    });
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

}
