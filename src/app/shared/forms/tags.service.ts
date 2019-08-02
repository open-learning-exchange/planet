import { Injectable } from '@angular/core';
import { CouchService } from '../couchdb.service';
import { of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { StateService } from '../state.service';
import { findDocuments } from '../mangoQueries';
import { createDeleteArray } from '../table-helpers';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';

@Injectable()
export class TagsService {

  constructor(
    private couchService: CouchService,
    private stateService: StateService,
    private router: Router,
    private route: ActivatedRoute
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
    const tagTest = (tag) => tag.name.toLowerCase().indexOf(filterString.toLowerCase()) > -1;
    return tags.reduce((newTags, tag) => {
      const newTag = { ...tag, subTags: (tag.subTags || []).filter(tagTest) };
      if (tagTest(tag)) {
        newTags.push(tag);
      } else if (newTag.subTags.length > 0) {
        newTags.push(newTag);
      }
      return newTags;
    }, []);
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
    return (tag._id ?
      this.couchService.findAll('tags', findDocuments({ '$or': [ { 'tagId': tag._id }, { 'attachedTo': tag._id } ] })) :
      of([])
    ).pipe(
      switchMap((oldLinks: any[]) => {
        const replaceField = (oldValue, newValue) => oldValue === undefined ? undefined : newValue;
        const newLinks = oldLinks.map(t => ({ ...t, tagId: replaceField(t.tagId, newId), attachedTo: replaceField(t.attachedTo, newId) }));
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

  /**
   * Reroutes to new URL on filtering so that the back button of a particular result go to the previous filtered results
   */
  filterReroute(tag) {
    this.router.navigate([ '..', tag ? { tag: tag } : {} ], { relativeTo: this.route });
  }
}
