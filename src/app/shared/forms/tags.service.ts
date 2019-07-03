import { Injectable } from '@angular/core';
import { CouchService } from '../couchdb.service';
import { of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { StateService } from '../state.service';
import { findDocuments } from '../mangoQueries';
import { createDeleteArray } from '../table-helpers';

@Injectable()
export class TagsService {

  constructor(
    private couchService: CouchService,
    private stateService: StateService
  ) {}

  getTags(db: string, parent: boolean) {
    return this.stateService.getCouchState('tags', parent ? 'parent' : 'local', { 'name': 'asc' }).pipe(
      map((tags: any[]) => {
        const tagsInfo = this.tagsInfo(tags);
        return this.fillSubTags(
          tags.filter((tag: any) => tag.db === db && tag.docType === 'definition')
            .map((tag: any) => ({ ...tag, count: tagsInfo.counts[tag._id] || 0 })),
          tagsInfo.subTags
        );
      })
    );
  }

  tagsInfo(tags: any[]) {
    return tags.reduce(
      ({ counts, subTags }, tag: any) => ({
        counts: tag.linkId === undefined ? counts : { ...counts, [tag.tagId]: (counts[tag.tagId] || 0) + 1 },
        subTags: tag.attachedTo === undefined ? subTags : { ...subTags, [tag.attachedTo]: [ ...(subTags[tag.attachedTo] || []), tag ] }
      }),
      { counts: {}, subTags: {} }
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

  deleteTag(tag) {
    return this.couchService.findAll('tags', findDocuments({ 'tagId': tag._id })).pipe(
      switchMap((tags: any[]) => {
        const deleteTagsArray = createDeleteArray(tags);
        return this.couchService.bulkDocs('tags', [ ...deleteTagsArray, { ...tag, _deleted: true } ]);
      })
    );
  }

  findTag(tagKey: any, fullTags: any[]) {
    const fullTag = fullTags.find((dbTag: any) => dbTag._id === tagKey);
    return { ...(fullTag ? fullTag : { _id: tagKey, name: tagKey, attachedTo: [] }) };
  }

  fillSubTags(tags: any[], subTagsObj?) {
    subTagsObj = subTagsObj || this.tagsInfo(tags).subTags;
    return tags.map((tag) => ({ ...tag, subTags: subTagsObj[tag._id] || [] }));
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
