import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup } from '@angular/forms';
import { CustomValidators } from '../../validators/custom-validators';
import { showFormErrors } from '../../shared/table-helpers';

@Component({
  templateUrl: './users-archive.component.html',
  styles: [ `
    :host {
      text-align: center;
    }
  ` ]
})
export class UsersArchiveComponent implements OnInit {
  confirmChoice = false;
  spinnerOn = true;
  archiveForm: FormGroup;

  constructor(private formBuilder: FormBuilder) {}

  ngOnInit() {
    this.createForm();
  }

  createForm() {
    this.archiveForm = this.formBuilder.group({
      description: [ '',  CustomValidators.requiredMarkdown ],
    });
  }

  onSubmit() {
    if (this.archiveForm.valid) {
      const description = this.archiveForm.get('description').value;
      console.log(description);
      this.spinnerOn = false;

    } else {
      showFormErrors(this.archiveForm.controls);
    }
  }

}
