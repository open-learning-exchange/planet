import { Component, Inject } from "@angular/core";
import { MatSnackBarRef, MAT_SNACK_BAR_DATA } from "@angular/material";

@Component({
  selector: 'planet-teams-comments',
  templateUrl: './teams-comments.component.html',
  styleUrls: ['./teams-reports.scss' ]
})

export class TeamsCommentsComponent {
    constructor(@Inject(MAT_SNACK_BAR_DATA) public data:any,
      public snackBarRef: MatSnackBarRef<TeamsCommentsComponent>
    ) {}
}