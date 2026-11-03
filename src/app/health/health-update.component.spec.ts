import { FormBuilder } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';

import { HealthUpdateComponent } from './health-update.component';

describe('HealthUpdateComponent', () => {
  it('saves the health profile only after the user save completes', () => {
    const userSave = new Subject<any>();
    const user = {
      _id: 'org.couchdb.user:member', firstName: 'A', lastName: 'B', email: 'a@b.org', language: 'English', phoneNumber: '1',
      birthDate: new Date(2000, 0, 1)
    };
    const userService = { get: () => user, updateUser: vi.fn().mockReturnValue(userSave) };
    const healthService = { postHealthProfileData: vi.fn().mockReturnValue(of({})) };
    const component = new HealthUpdateComponent(
      new FormBuilder().nonNullable,
      { notDateInFuture$: () => of(null) } as any,
      userService as any,
      healthService as any,
      { navigate: vi.fn() } as any,
      {} as any,
      { start: vi.fn(), stop: vi.fn() } as any,
      { showAlert: vi.fn() } as any
    );
    component.profileForm.patchValue(user);
    component.existingData = { _id: user._id, _rev: '1-a' };

    component.onSubmit();
    expect(healthService.postHealthProfileData).not.toHaveBeenCalled();

    userSave.next({ ok: true });
    userSave.complete();
    expect(healthService.postHealthProfileData).toHaveBeenCalledWith({ _id: user._id, _rev: '1-a', profile: expect.any(Object) });
  });
});
