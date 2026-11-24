import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { SearchFieldComponent } from './search-field.component';

describe('SearchFieldComponent', () => {
  let fixture: ComponentFixture<SearchFieldComponent>;
  let emitted: string[];
  const input = () => fixture.debugElement.query(By.css('input')).nativeElement as HTMLInputElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ SearchFieldComponent ] });
    fixture = TestBed.createComponent(SearchFieldComponent);
    fixture.componentRef.setInput('label', 'Search');
    emitted = [];
    fixture.componentInstance.value.subscribe(value => emitted.push(value));
    fixture.detectChanges();
  });

  it('emits what the member types', () => {
    input().value = 'math';
    input().dispatchEvent(new Event('input'));

    expect(emitted).toEqual([ 'math' ]);
  });

  it('empties the field and emits an empty search when cleared', () => {
    fixture.componentRef.setInput('value', 'math');
    fixture.detectChanges();

    fixture.debugElement.query(By.css('button')).nativeElement.click();
    fixture.detectChanges();

    expect(input().value).toBe('');
    expect(emitted).toEqual([ '' ]);
  });
});
