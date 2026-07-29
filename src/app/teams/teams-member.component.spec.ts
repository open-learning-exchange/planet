import { vi } from 'vitest';
import { SimpleChange, SimpleChanges } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { UserService } from '../shared/user.service';
import { StateService } from '../shared/state.service';
import { TasksService } from '../tasks/tasks.service';
import { TeamsMemberComponent } from './teams-member.component';

describe('TeamsMemberComponent', () => {
  let component: TeamsMemberComponent;
  let dialog: { open: ReturnType<typeof vi.fn> };

  const currentUser = { _id: 'org.couchdb.user:ann', isUserAdmin: false };
  const planetCode = 'kal';

  const memberChange = (member): SimpleChanges => ({ member: new SimpleChange(undefined, member, true) });

  beforeEach(() => {
    dialog = { open: vi.fn() };
    component = new TeamsMemberComponent(
      { get: () => currentUser } as any as UserService,
      { configuration: { code: planetCode } } as any as StateService,
      {} as any as TasksService,
      dialog as any as MatDialog
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('display name', () => {
    it('prefers the user doc full name over every other source', () => {
      component.member = { userDoc: { fullName: 'Ann Njeri', firstName: 'Ann' }, name: 'ann' };
      component.ngOnChanges(memberChange(component.member));

      expect(component.displayName).toBe('Ann Njeri');
    });

    it('falls back through the nested doc before the membership name', () => {
      component.member = { userDoc: { doc: { firstName: 'Ann' } }, name: 'ann' };
      component.ngOnChanges(memberChange(component.member));

      expect(component.displayName).toBe('Ann');
    });

    it('falls back to the membership name when there is no user doc', () => {
      component.member = { name: 'ann' };
      component.ngOnChanges(memberChange(component.member));

      expect(component.displayName).toBe('ann');
    });

    it('is an empty string when nothing identifies the member', () => {
      component.member = {};
      component.ngOnChanges(memberChange(component.member));

      expect(component.displayName).toBe('');
    });
  });

  describe('initials', () => {
    it('uses the first and last word of a multi-word name', () => {
      component.setInitials('Ann Wanjiru Njeri');

      expect(component.initials).toBe('AN');
    });

    it('uses a single letter for a one-word name', () => {
      component.setInitials('ann');

      expect(component.initials).toBe('A');
    });

    it('ignores surrounding and repeated whitespace', () => {
      component.setInitials('  Ann   Njeri  ');

      expect(component.initials).toBe('AN');
    });

    it('falls back to a placeholder for an empty name', () => {
      component.setInitials('');

      expect(component.initials).toBe('?');
    });

    it('derives a stable palette index from the name', () => {
      component.setInitials('Ann Njeri');
      const first = component.initialsColorIndex;
      component.setInitials('Ann Njeri');

      expect(component.initialsColorIndex).toBe(first);
    });

    it('gives different names different palette entries', () => {
      component.setInitials('Ann Njeri');
      const ann = component.initialsColorIndex;
      component.setInitials('Bob Otieno');

      expect(component.initialsColorIndex).not.toBe(ann);
    });

    // $initials-palette in _variables.scss defines exactly these, as .initials-0 .. .initials-11
    it('always lands inside the palette', () => {
      for (const name of [ '', 'a', 'Ann Njeri', 'Zzz', '\u4e2d\u6587\u540d\u5b57', 'Bob Otieno', 'x'.repeat(200) ]) {
        component.setInitials(name);

        expect(component.initialsColorIndex).toBeGreaterThanOrEqual(0);
        expect(component.initialsColorIndex).toBeLessThan(12);
        expect(Number.isInteger(component.initialsColorIndex)).toBe(true);
      }
    });
  });

  describe('avatar fallback', () => {
    it('shows the image when the member has a real avatar', () => {
      component.member = { name: 'ann', avatar: 'http://couch/attachments/ann/img.png' };
      component.ngOnChanges(memberChange(component.member));

      expect(component.hasImage).toBe(true);
    });

    it('shows initials when the avatar is the shared placeholder', () => {
      component.member = { name: 'ann', avatar: 'assets/image.png' };
      component.ngOnChanges(memberChange(component.member));

      expect(component.hasImage).toBe(false);
    });

    it('shows initials when there is no avatar at all', () => {
      component.member = { name: 'ann' };
      component.ngOnChanges(memberChange(component.member));

      expect(component.hasImage).toBe(false);
    });

    // Both call sites rebuild actionMenu as a new array literal on every change detection
    // pass. If ngOnChanges reset hasImage on those runs, a broken avatar would be
    // re-requested forever after its error handler cleared the flag.
    it('keeps a failed image hidden when only other inputs change', () => {
      component.member = { name: 'ann', avatar: 'http://couch/attachments/ann/gone.png' };
      component.ngOnChanges(memberChange(component.member));
      component.hasImage = false;

      component.ngOnChanges({ actionMenu: new SimpleChange([], [ 'title' ], false) });

      expect(component.hasImage).toBe(false);
    });
  });

  describe('member identity', () => {
    it('marks the member as the team leader when id and planet both match', () => {
      component.member = { userId: 'org.couchdb.user:bob', userPlanetCode: 'kal' };
      component.teamLeader = { userId: 'org.couchdb.user:bob', userPlanetCode: 'kal' };

      expect(component.isTeamLeader).toBe(true);
    });

    it('does not mark a same-named member from another planet as the leader', () => {
      component.member = { userId: 'org.couchdb.user:bob', userPlanetCode: 'other' };
      component.teamLeader = { userId: 'org.couchdb.user:bob', userPlanetCode: 'kal' };

      expect(component.isTeamLeader).toBe(false);
    });

    it('is not a team leader when the team has no leader', () => {
      component.member = { userId: 'org.couchdb.user:bob', userPlanetCode: 'kal' };
      component.teamLeader = undefined;

      expect(component.isTeamLeader).toBe(false);
    });

    it('marks the signed in user on the local planet as self', () => {
      component.member = { userId: currentUser._id, userPlanetCode: planetCode };

      expect(component.isSelf).toBe(true);
    });

    it('does not mark the same user from another planet as self', () => {
      component.member = { userId: currentUser._id, userPlanetCode: 'other' };

      expect(component.isSelf).toBe(false);
    });
  });

  describe('member type', () => {
    it('treats a member without a team as a community member', () => {
      component.member = { name: 'ann' };
      component.ngOnInit();

      expect(component.memberType).toBe('community');
    });

    it('treats a member with a team as a team member', () => {
      component.member = { name: 'ann', teamId: 'team-1' };
      component.ngOnInit();

      expect(component.memberType).toBe('other');
    });
  });

  describe('outputs', () => {
    it('emits the requested action for a join request', () => {
      const emitted: string[] = [];
      component.requestAction.subscribe(action => emitted.push(action));

      component.requestAction.emit('added');
      component.requestAction.emit('rejected');

      expect(emitted).toEqual([ 'added', 'rejected' ]);
    });

    it('emits the action params when a menu item opens a dialog', () => {
      const member = { name: 'ann' };
      component.member = member;
      let emitted;
      component.actionClick.subscribe(params => emitted = params);

      component.openDialog({ member, change: 'remove' });

      expect(emitted).toEqual({ member, change: 'remove' });
    });

    it('opens the profile dialog for the member', () => {
      const member = { name: 'ann' };

      component.openMemberDialog(member);

      expect(dialog.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: { member }, autoFocus: false })
      );
    });
  });
});
