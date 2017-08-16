import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpModule } from '@angular/http';

import { NavigationComponent } from './navigation.component';
import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';

describe('Navigation', () => {
    
    let couchSpy:any;
    let routerSpy:any;
    
    class RouterStub {
        navigate(url:string) { return url; }
    }
    
    const setup = () => {
        TestBed.configureTestingModule({
            imports: [RouterTestingModule,CommonModule,HttpModule],
            declarations: [NavigationComponent],
            providers: [
                CouchService,
                { provide:Router, useClass:RouterStub }
            ]
        });
        let fixture = TestBed.createComponent(NavigationComponent);
        let logoutButton = fixture.debugElement.query(By.css('.km-logout')).nativeElement;
        let comp = fixture.componentInstance;
        let couchService = fixture.debugElement.injector.get(CouchService);
        let router = fixture.debugElement.injector.get(Router);
        return { fixture, comp, logoutButton, couchService, router };
    }
    
    it('Should be a NavigationComponent', () => {
        let { comp } = setup();
        expect(comp instanceof NavigationComponent).toBe(true,'Should create NavigationComponent');
    });
    
    describe('Logout button', () => {
        
        const setupLogin = (returnValue:{ok:boolean}) => {
            let { comp, fixture, logoutButton, couchService, router } = setup();
            couchSpy = spyOn(couchService, 'delete').and.returnValue(Promise.resolve(returnValue));
            routerSpy = spyOn(router,'navigate');
            logoutButton.click();
            return { comp, fixture, logoutButton, couchService, router };
        }
    
        it('Should call CouchService delete to logout', () => {
            let { logoutButton, fixture } = setupLogin({ok:true});
            expect(couchSpy).toHaveBeenCalled();
        });
        
        it('Should redirect when logout succeeds', () => {
            let { logoutButton, fixture } = setupLogin({ok:true});
            fixture.whenStable().then(() => {
                expect(routerSpy).toHaveBeenCalled();
            });
        });
    
        it('Should not redirect when logout fails', () => {
            let { logoutButton, fixture } = setupLogin({ok:false});
            fixture.whenStable().then(() => {
                expect(routerSpy).not.toHaveBeenCalled();
            });
        });
    });
    
});
