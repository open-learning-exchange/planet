import { Injectable } from '@angular/core';
import { CouchService } from '../couchdb.service';
import { forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { StateService } from '../state.service';
import { findDocuments } from '../mangoQueries';
import { MatTableDataSource } from '@angular/material';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { SelectionModel } from '@angular/cdk/collections';
import { debug } from '../../debug-operator';
import { MatDialog } from '@angular/material';
import { DialogsPromptComponent } from '../../shared/dialogs/dialogs-prompt.component';

@Injectable()
export class TagsService {

  selection = new SelectionModel(true, []);
  tags = new MatTableDataSource();
  deleteDialog: any;
  message = '';

  constructor(
    private couchService: CouchService,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService,
    private dialog: MatDialog
  ) {}

  getTags(db: string, parent: boolean) {
    return this.stateService.getCouchState('tags', parent ? 'parent' : 'local', { 'name': 'asc' }).pipe(
      map((tags: any[]) => {
        const tagCounts = tags.reduce(
          (counts: any, tag: any) => tag.linkId === undefined ? counts : { ...counts, [tag.tagId]: (counts[tag.tagId] || 0) + 1 },
          {}
        );
        return tags
          .map((tag: any) => ({ ...tag, count: tagCounts[tag._id] || 0 }))
          .filter((tag: any) => tag.db === db && tag.docType === 'definition')
          .map(this.fillSubTags);
      })
    );
  }

  filterTags(tags: any[], filterString: string): string[] {
    // Includes any tag with a sub tag that matches in addition to tags that match
    return tags.filter((tag: any) => tag.name.toLowerCase().indexOf(filterString.toLowerCase()) > -1);
  }

  updateTag(tag) {
    const { count, subTags, ...tagData } = tag;
    tagData.attachedTo = tagData.attachedTo || [];
    const newId = `${tagData.attachedTo.length === 0 ? tagData.db : tagData.attachedTo}_${tagData.name.toLowerCase()}`;
    if (newId === tag._id) {
      return this.couchService.updateDocument('tags', tagData).pipe(
        switchMap(res => of([ res ]))
      );
    }
    return (tag._id ? this.couchService.findAll('tags', findDocuments({ 'tagId': tag._id })) : of([])).pipe(
      switchMap((oldLinks: any[]) => {
        const newLinks = oldLinks.map(t => ({ ...t, tagId: newId }));
        return this.couchService.bulkDocs('tags', [
          { ...tagData, _rev: undefined, _id: newId },
          { ...tagData, _deleted: true },
          ...newLinks
        ]);
      })
    );
  } 

  openDeleteDialog(okClick, amount, displayName = '') {
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick,
        amount,
        changeType: 'delete',
        type: 'tag',
        displayName
      }
    });
    // Reset the message when the dialog closes
    this.deleteDialog.afterClosed().pipe(debug('Closing dialog')).subscribe(() => {
      this.message = '';
    });
  }

  deleteTag(tag) {
    return {
      request: this.couchService.delete('tags/' + tag._id + '?rev=' + tag._rev),
      onNext: (data) => {
        this.selection.deselect(tag._id);
        //this.tags.data = this.tags.data.filter((t: any) => data.id !== t._id);
        //this.tags = this.couchService.findAll('tags').subscribe((t: any) => t._id !== data._id);
        this.deleteDialog.close();
        this.planetMessageService.showMessage('Tag deleted: ' + tag.name);
      },
      onError: (error) => this.planetMessageService.showAlert('There was a problem deleting this tag.')
    };
  }

  findTag(tagKey: any, fullTags: any[]) {
    const fullTag = fullTags.find((dbTag: any) => dbTag._id === tagKey);
    return { ...(fullTag ? fullTag : { _id: tagKey, name: tagKey, attachedTo: [] }) };
  }

  fillSubTags(tag: any, index: number, tags: any[]) {
    return { ...tag, subTags: tags.filter(({ attachedTo }) => (attachedTo || []).indexOf(tag._id) > -1) };
  }

  attachTagsToDocs(db: string, docs: any[], tags: any[]) {
    const tagsObj = tags.reduce((obj, tagLink: any) => {
      if (tagLink.docType !== 'link' || tagLink.db !== db) {
        return obj;
      }
      const tag = { ...this.findTag(tagLink.tagId, tags), tagLink };
      return ({ ...obj, [tagLink.linkId]: obj[tagLink.linkId] ? [ ...obj[tagLink.linkId], tag ] : [ tag ] });
    }, {});
    return docs.map((doc: any) => {
      const docTags = tagsObj[doc._id] || [];
      return {
        ...doc,
        tags: docTags.map(tag => ({
          ...tag,
          subTags: tag.subTags ? tag.subTags.filter(subTag => docTags.some(docTag => docTag._id === subTag._id)) : [],
          isMainTag: this.filterOutSubTags(tag)
        }))
      };
    });
  }

  tagBulkDocs(linkId: string, db: string, newTagIds: string[], currentTags: any[] = []) {
    // name property is needed for tags database queries
    const tagLinkDoc = (tagId) => ({ linkId, tagId, name: '', docType: 'link', db });
    return [
      ...newTagIds.filter(tagId => currentTags.findIndex((tag: any) => tag.tagId === tagId) === -1)
        .map(tagId => tagLinkDoc(tagId)),
      ...currentTags.filter((tag: any) => newTagIds.indexOf(tag.tagId) === -1)
        .map((tag: any) => ({ ...tag.tagLink, '_deleted': true }))
    ];
  }

  updateManyTags(data, dbName, { selectedIds, tagIds, indeterminateIds }) {
    const fullSelectedTags = tagIds.filter(tagId => indeterminateIds.indexOf(tagId) === -1);
    const items = selectedIds.map(id => data.find((item: any) => item._id === id));
    const newTags = items.map((item: any) =>
      this.tagBulkDocs(
        item._id, dbName, fullSelectedTags, item.tags.filter((tag: any) => indeterminateIds.indexOf(tag._id) === -1)
      )
    ).flat();
    return this.couchService.bulkDocs('tags', newTags);
  }

  filterOutSubTags(tag: any) {
    return tag.attachedTo === undefined || tag.attachedTo.length === 0;
  }

}
