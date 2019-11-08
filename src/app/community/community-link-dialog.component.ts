import { Component, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatStepper } from '@angular/material';
import { CustomValidators } from '../validators/custom-validators';

@Component({
  templateUrl: './community-link-dialog.component.html',
})
export class CommunityLinkDialogComponent {

  @ViewChild('linkStepper', { static: false }) linkStepper: MatStepper;
  selectedLink: { db, title, selector? };
  links: { db, title, selector? }[] = [
    { db: 'teams', title: 'Teams', selector: { type: 'team' } },
    { db: 'teams', title: 'Enterprises', selector: { type: 'enterprise' } }
  ];
  linkForm: FormGroup;

  constructor(
    private fb: FormBuilder
  ) {
    this.linkForm = this.fb.group({
      title: [ '', CustomValidators.required ],
      route: [ '', CustomValidators.required ]
    });
  }

  teamSelect({ mode, teamId }) {
    this.linkForm.controls.route.setValue(`/${mode}s/view/${teamId}`);
    this.linkStepper.next();
  }

  linkStepperChange({ selectedIndex }) {
    if (selectedIndex === 0 && this.linkForm.pristine !== true) {
      this.linkForm.reset();
    }
  }

}
