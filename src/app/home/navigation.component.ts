import { Component } from '@angular/core';

import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';

@Component({
    selector:'main-navigation',
    template: `
        <ul>
            <li *ngFor="let comp of components"><a routerLinkActive="active-link" [routerLink]="'/' + comp.link">{{comp.name.toUpperCase()}}</a></li>
            <li><a href="#" class="km-logout" (click)="logoutClick()">LOGOUT</a></li>
        </ul>
    `,
    styleUrls:['./navigation.scss']
})
export class NavigationComponent {
    constructor(
        private couchService:CouchService,
        private router:Router
    ){}

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