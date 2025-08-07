import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';

import { CouchService } from '../../shared/couchdb.service';
import { CustomValidators } from '../../validators/custom-validators';
import { showFormErrors } from '../../shared/table-helpers';
import { UserService } from '../../shared/user.service';

@Component({
  templateUrl: './users-archive.component.html',
  styles: [ `
    :host {
      text-align: center;
    }
  ` ]
})
export class UsersArchiveComponent implements OnInit {
  readonly dbName = '_users';
  spinnerOn = true;
  user: any = {};
  confirmChoice = false;
  archiveForm: UntypedFormGroup;

  constructor(
    private couchService: CouchService,
    private formBuilder: UntypedFormBuilder,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.createForm();
    this.couchService.get(this.dbName + '/org.couchdb.user:' + this.userService.get().name)
      .subscribe((data) => {
        this.user = data;
      });
  }

  createForm() {
    this.archiveForm = this.formBuilder.group({
      description: [ '', CustomValidators.requiredMarkdown ],
    });
  }

  onSubmit() {
    if (this.archiveForm.valid) {
      this.archiveUser();
    } else {
      showFormErrors(this.archiveForm.controls);
    }
  }

  archiveUser() {
    const description = this.archiveForm.get('description').value;
    this.user = { ...this.user, isArchived: true, archiveReason: description };
    this.userService.updateUser(this.user).subscribe(
      () => {
        this.userService.setUserLogout();
        this.spinnerOn = false;
      },
      (err) => {
        console.log(err);
      }
    );
  }
}
