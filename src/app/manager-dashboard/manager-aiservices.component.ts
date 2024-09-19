import { Component, OnInit } from "@angular/core";
import { CouchService } from "../shared/couchdb.service";
import { StateService } from "../shared/state.service";

@Component({
  templateUrl: "./manager-aiservices.component.html",
  styleUrls: ["./manager-aiservices.component.scss"],
})
export class ManagerAIServicesComponent implements OnInit {
  configuration: any = {};

  constructor(
    private couchService: CouchService,
    private stateService: StateService,
  ) {}

  ngOnInit() {
    const configurationId = this.stateService.configuration._id;
    this.couchService.get("configurations/" + configurationId).subscribe(
      (data: any) => {
        this.configuration = data;
      },
      (error) => {
        console.log(error);
      }
    );
  }

  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

}
