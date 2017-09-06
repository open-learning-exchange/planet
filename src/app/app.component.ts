import { Component,OnInit} from '@angular/core';
import { LoaderService } from './shared/loader.service';

@Component({
  selector: 'planet',
  template: '<router-outlet><span *ngIf="showLoader" class="loading"></span></router-outlet>',
  styleUrls: ['app.component.css']
})
export class AppComponent { 
	showLoader: boolean;

    constructor(
        private loaderService: LoaderService) {
    }

    ngOnInit() {
        this.loaderService.status.subscribe((val: boolean) => {
            this.showLoader = val;
        });
    }
}
