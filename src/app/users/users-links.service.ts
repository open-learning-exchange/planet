import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { catchError, filter, finalize, map, switchMap, tap } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { MemberLink, sanitizeMemberLinks } from '../shared/social-platforms.constants';
import { UsersLinksDialogComponent } from './users-links-dialog.component';

const isSameLinkList = (links: MemberLink[], otherLinks: MemberLink[]): boolean =>
  links.length === otherLinks.length &&
  links.every(({ platform, url, label }, index) =>
    platform === otherLinks[index].platform && url === otherLinks[index].url && label === otherLinks[index].label);

@Injectable({
  providedIn: 'root'
})
export class UsersLinksService {

  private dbName = '_users';

  constructor(
    private dialog: MatDialog,
    private couchService: CouchService,
    private userService: UserService,
    private planetMessageService: PlanetMessageService,
    private dialogsLoadingService: DialogsLoadingService
  ) {}

  // Opens the link editor for a member and emits the saved links once the write succeeds.
  // Nothing is emitted when the dialog is cancelled.
  openDialog(userName: string, links: MemberLink[]): Observable<MemberLink[]> {
    const currentLinks = sanitizeMemberLinks(links);
    const dialogRef = this.dialog.open(UsersLinksDialogComponent, {
      data: { links: currentLinks },
      width: '750px',
      maxWidth: '90vw',
      autoFocus: false
    });
    return dialogRef.afterClosed().pipe(
      // Skips both a cancelled dialog and an OK that changed nothing, so an untouched form
      // never writes to the user doc.
      filter((newLinks: MemberLink[]) => newLinks !== undefined && !isSameLinkList(currentLinks, newLinks)),
      switchMap((newLinks: MemberLink[]) => this.updateLinks(userName, newLinks))
    );
  }

  // The user doc is re-read instead of reusing the copy held by the caller: it may be stale
  // (wrong _rev) and views such as the profile page strip the credential fields, which
  // UserService.updateUser would then backfill from the logged in user.
  updateLinks(userName: string, socialLinks: MemberLink[]): Observable<MemberLink[]> {
    this.dialogsLoadingService.start();
    return this.couchService.get(`${this.dbName}/org.couchdb.user:${userName}`).pipe(
      switchMap((userDoc: any) => this.userService.updateUser({ ...userDoc, socialLinks })),
      map(() => socialLinks),
      tap(() => this.planetMessageService.showMessage(
        socialLinks.length === 0 ? $localize`Links removed` : $localize`Links updated`
      )),
      catchError(() => {
        this.planetMessageService.showAlert($localize`Error updating links`);
        return of<MemberLink[]>(undefined);
      }),
      filter(newLinks => newLinks !== undefined),
      finalize(() => this.dialogsLoadingService.stop())
    );
  }

}
