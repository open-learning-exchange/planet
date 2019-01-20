import { Component, OnInit } from '@angular/core';
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

@Component({
  templateUrl: './users-achievements-update.component.html',
  styles: [ `
    .view-container {
      display: flex;
      flex-wrap: wrap;
    }
    .view-container form {
      margin: 0 10px 10px 0;
      width: 100%;
    }
  ` ]
})
export class UsersAchievementsUpdateComponent implements OnInit {

  user: any = {};
  docInfo = { '_rev': undefined };
  readonly dbName = 'achievements';
  editForm: FormGroup;
  infoTypes = this.usersAchievementsService.infoTypes;

  constructor(
    private fb: FormBuilder,
    private couchService: CouchService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private planetMessageService: PlanetMessageService,
    private usersAchievementsService: UsersAchievementsService,
    private dialogsFormService: DialogsFormService
  ) {
    this.createForm();
  }

  ngOnInit() {
    this.user = this.userService.get();
    this.couchService.get(this.dbName + '/' + this.user._id).subscribe((achievements) => {
      this.editForm.patchValue(achievements);
      this.editForm.controls.achievements = this.fb.array(achievements.achievements);
      this.editForm.controls.otherInfo = this.fb.array(achievements.otherInfo);
      this.docInfo._rev = achievements._rev;
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

  addAchievement(index = -1, achievement?) {
    this.dialogsFormService.confirm('Add Achievement', [
      {
        'type': 'textarea',
        'name': 'description',
        'placeholder': 'Description'
      },
    ], this.fb.group({ description: achievement })).subscribe((newAchievement) => {
      if (newAchievement === undefined) {
        return;
      }
      this.updateFormArray(this.editForm.controls.achievements, this.fb.control(newAchievement.description), index);
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
    ], this.fb.group({ type: '', description: '', ...info })).subscribe((newInfo) => {
      if (newInfo === undefined) {
        return;
      }
      this.updateFormArray(this.editForm.controls.otherInfo, this.fb.group(newInfo), index);
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
    this.couchService.post(this.dbName, { ...docInfo, ...achievements, '_id': this.user._id })
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
