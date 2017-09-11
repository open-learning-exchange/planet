import { Component } from '@angular/core';

import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';
import { TranslateService } from 'ng2-Translate';

@Component({
    selector:'main-navigation',
    template: `
        <ul>
            <li *ngFor="let comp of components"><a [routerLink]="'/' + comp.link">{{ comp.name.toUpperCase() | translate}}</a></li>
            <li><a href="#" class="km-logout" (click)="logoutClick()">{{'LOGOUT' | translate}}</a></li>
        </ul>
    `,
    styleUrls:['./navigation.scss']
})
export class NavigationComponent {
    constructor(
        private couchService:CouchService,
        private router:Router,
        private translate:TranslateService
    ){
        if(localStorage.getItem("currentLanguage") != undefined)
            this.translate.use(localStorage.getItem("currentLanguage"))
    }

    components = [
        { link:'', name:'Home' },
        { link:'', name:'Library' },
        { link:'', name:'Courses' },
        { link:'meetups', name:'Meetups' },
        { link:'users', name:'Members' },
        { link:'', name:'Reports' },
        { link:'', name:'Feedback' },
    ];
        
    logoutClick() {
        this.couchService.delete('_session',{ withCredentials:true }).then((data:any) => {
            if(data.ok === true) {
                this.router.navigate(['/login'], {});
            }
        });
    }
    
}