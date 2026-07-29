import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { PlanetStepListComponent } from './planet-step-list.component';

describe('PlanetStepListComponent', () => {
  let component: PlanetStepListComponent;
  let fixture: ComponentFixture<PlanetStepListComponent>;
  let dialogMock: any;
  let dialogRefMock: any;

  beforeEach(() => {
    dialogRefMock = {
      close: vi.fn()
    };

    dialogMock = {
      open: vi.fn().mockImplementation(() => dialogRefMock)
    };

    TestBed.configureTestingModule({
      imports: [PlanetStepListComponent],
      providers: [
        { provide: MatDialog, useValue: dialogMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PlanetStepListComponent);
    component = fixture.componentInstance;
    component.steps = [
      { stepTitle: 'Step 1' },
      { stepTitle: 'Step 2' }
    ];
    component.nameProp = 'stepTitle';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open delete prompt dialog when moveStep with direction 0 is called', () => {
    component.moveStep({ index: 0, direction: 0, listId: component.listId });
    expect(dialogMock.open).toHaveBeenCalled();

    const dialogConfig = dialogMock.open.mock.calls[0][1];
    expect(dialogConfig.data.changeType).toBe('delete');
    expect(dialogConfig.data.type).toBe('step');
    expect(dialogConfig.data.displayName).toBe('Step 1');
  });

  it('should remove step when prompt dialog okClick onNext is called', () => {
    component.moveStep({ index: 0, direction: 0, listId: component.listId });
    const dialogConfig = dialogMock.open.mock.calls[0][1];

    dialogConfig.data.okClick.onNext();

    expect(dialogRefMock.close).toHaveBeenCalled();
    expect(component.steps).toEqual([{ stepTitle: 'Step 2' }]);
  });
});
