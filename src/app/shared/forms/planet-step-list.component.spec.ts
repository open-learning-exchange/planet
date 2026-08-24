import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatListItemTitle } from '@angular/material/list';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { PlanetStepListComponent, PlanetStepListItemComponent } from './planet-step-list.component';

@Component({
  template: `
    <planet-step-list [steps]="steps">
      @for (step of steps; track step) {
        <planet-step-list-item>
          <span matListItemTitle>{{ step.stepTitle }}</span>
        </planet-step-list-item>
      }
    </planet-step-list>
  `,
  imports: [ PlanetStepListComponent, PlanetStepListItemComponent, MatListItemTitle ]
})
class StepListHostComponent {
  steps = [ { stepTitle: 'Step 1' }, { stepTitle: 'Step 2' }, { stepTitle: 'Step 3' } ];
}

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
    component.confirmDelete = true;
    component.moveStep({ index: 0, direction: 0, listId: component.listId });
    expect(dialogMock.open).toHaveBeenCalled();
    expect(component.steps).toEqual([
      { stepTitle: 'Step 1' },
      { stepTitle: 'Step 2' }
    ]);

    const dialogConfig = dialogMock.open.mock.calls[0][1];
    expect(dialogConfig.data.showMainParagraph).toBe(false);
    expect(dialogConfig.data.extraMessage).toBe('Are you sure you want to delete the following step?');
    expect(dialogConfig.data.displayName).toBe('Step 1');
  });

  it('should remove step when prompt dialog okClick onNext is called', () => {
    component.confirmDelete = true;
    component.moveStep({ index: 0, direction: 0, listId: component.listId });
    const dialogConfig = dialogMock.open.mock.calls[0][1];

    dialogConfig.data.okClick.onNext();

    expect(dialogRefMock.close).toHaveBeenCalled();
    expect(component.steps).toEqual([{ stepTitle: 'Step 2' }]);
  });

  it('should delete without a prompt when confirmation is not enabled', () => {
    component.moveStep({ index: 0, direction: 0, listId: component.listId });

    expect(dialogMock.open).not.toHaveBeenCalled();
    expect(component.steps).toEqual([{ stepTitle: 'Step 2' }]);
  });

  it('should return to the list after deleting without confirmation', () => {
    component.listMode = false;
    component.openIndex = 0;
    const stepClickedSpy = vi.spyOn(component.stepClicked, 'emit');

    component.removeStep();

    expect(dialogMock.open).not.toHaveBeenCalled();
    expect(component.steps).toEqual([{ stepTitle: 'Step 2' }]);
    expect(component.listMode).toBe(true);
    expect(stepClickedSpy).toHaveBeenCalledWith(-1);
  });

  it('should move steps without a prompt when confirmation is enabled', () => {
    component.confirmDelete = true;

    component.moveStep({ index: 0, direction: 1, listId: component.listId });
    expect(component.steps).toEqual([
      { stepTitle: 'Step 2' },
      { stepTitle: 'Step 1' }
    ]);

    component.moveStep({ index: 1, direction: -1, listId: component.listId });

    expect(dialogMock.open).not.toHaveBeenCalled();
    expect(component.steps).toEqual([
      { stepTitle: 'Step 1' },
      { stepTitle: 'Step 2' }
    ]);
  });

  it('should remove a FormArray step after confirmation', () => {
    component.confirmDelete = true;
    const steps = new FormArray([
      new FormGroup({ stepTitle: new FormControl('Step 1') }),
      new FormGroup({ stepTitle: new FormControl('Step 2') })
    ]);
    component.steps = steps;

    component.moveStep({ index: 0, direction: 0, listId: component.listId });
    const dialogConfig = dialogMock.open.mock.calls[0][1];
    dialogConfig.data.okClick.onNext();

    expect(steps.value).toEqual([{ stepTitle: 'Step 2' }]);
  });

  it('should keep the open step selected when deleting an earlier step', () => {
    component.confirmDelete = true;
    component.listMode = false;
    component.openIndex = 1;

    component.moveStep({ index: 0, direction: 0, listId: component.listId });
    const dialogConfig = dialogMock.open.mock.calls[0][1];
    dialogConfig.data.okClick.onNext();

    expect(component.listMode).toBe(false);
    expect(component.openIndex).toBe(0);
  });

  it('should return to the list after confirming deletion of the open step', () => {
    component.confirmDelete = true;
    component.listMode = false;
    component.openIndex = 0;
    const stepClickedSpy = vi.spyOn(component.stepClicked, 'emit');

    component.removeStep();
    expect(component.listMode).toBe(false);

    const dialogConfig = dialogMock.open.mock.calls[0][1];
    dialogConfig.data.okClick.onNext();

    expect(component.listMode).toBe(true);
    expect(stepClickedSpy).toHaveBeenCalledWith(-1);
  });
});

describe('PlanetStepListComponent row actions', () => {
  let fixture: ComponentFixture<StepListHostComponent>;

  const rowButtons = () => Array.from(fixture.nativeElement.querySelectorAll('.mat-mdc-list-item'))
    .map((row: Element) => Array.from(row.querySelectorAll('button')));

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ StepListHostComponent ],
      providers: [ { provide: MatDialog, useValue: { open: vi.fn() } } ]
    }).compileComponents();

    fixture = TestBed.createComponent(StepListHostComponent);
    fixture.detectChanges();
    fixture.detectChanges();
  });

  it('should keep the move and delete controls in the same column on every row', () => {
    // The buttons are laid out in source order, so an equal count per row is what keeps the
    // trailing controls aligned when a row has no move up (first) or move down (last) action.
    expect(rowButtons().map(buttons => buttons.length)).toEqual([ 3, 3, 3 ]);
  });

  it('should hide rather than drop the move actions that do not apply to a row', () => {
    const [ first, middle, last ] = rowButtons();

    expect(first[0].classList).toContain('step-list-action-empty');
    expect(first[0].disabled).toBe(true);
    expect(first[1].classList).not.toContain('step-list-action-empty');
    expect(first[1].disabled).toBe(false);

    expect(middle.some((button: HTMLButtonElement) => button.classList.contains('step-list-action-empty'))).toBe(false);

    expect(last[1].classList).toContain('step-list-action-empty');
    expect(last[1].disabled).toBe(true);
    expect(last[0].disabled).toBe(false);
  });
});
