import { TestBed } from '@angular/core/testing';
import { By }              from '@angular/platform-browser';
import { DebugElement }    from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';

import { DashboardComponent } from './dashboard.component';
import { UserService } from '../shared/user.service';


describe('Dashboard', () => {
    
    const setup = () => {
        TestBed.configureTestingModule({
            imports: [RouterTestingModule],
            declarations: [DashboardComponent],
            providers:[UserService]
        });
        let fixture = TestBed.createComponent(DashboardComponent);
        let comp = fixture.componentInstance;
        let de = fixture.debugElement.query(By.css('#greeting'));
        let greetElement = de.nativeElement;
        return { fixture, comp, de, greetElement };
    }
    
    it('Should be a DashboardComponent', () => {
        let { comp } = setup();
        expect(comp instanceof DashboardComponent).toBe(true,'Should create AppComponent');
    });
    
    it('Should display the correct title', () => {
        let { fixture, comp, greetElement } = setup();
        comp.name = 'paul';
        fixture.detectChanges();
        expect(greetElement.textContent).toBe('Hi, paul','Greeting displays correctly');
    });
    
});