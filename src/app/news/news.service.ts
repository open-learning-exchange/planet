import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import { StateService } from '../shared/state.service';
import { UserService } from '../shared/user.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { findDocuments } from '../shared/mangoQueries';
import { environment } from '../../environments/environment';
import { calculateMdAdjustedLimit, converter, dedupeObjectArray, truncateText } from '../shared/utils';
import { planetAndParentId } from '../manager-dashboard/reports/reports.utils';

interface NewsItemViewModel {
  _id: string;
  doc: any;
  sharedDate?: string;
  avatar: string;
  renderedHtml: SafeHtml;
  renderedPreviewHtml: SafeHtml;
  previewTruncated: boolean;
  renderedSource?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NewsService {

  dbName = 'news';
  imgUrlPrefix = environment.couchAddress;
  newsUpdated$ = new Subject<any[]>();
  currentOptions: { selectors: any, viewId: string } = { selectors: {}, viewId: '' };
  private viewModelById = new Map<string, NewsItemViewModel>();
  private readonly previewLimit = 500;
  private readonly imageMarkdownRegex = /!\[[^\]]*\]\((.*?\.(?:png|jpe?g|gif)(?:\?.*?)?)\)/g;

  constructor(
    private couchService: CouchService,
    private stateService: StateService,
    private userService: UserService,
    private planetMessageService: PlanetMessageService,
    private sanitizer: DomSanitizer
  ) {}

  requestNews({ selectors, viewId } = this.currentOptions) {
    this.currentOptions = { selectors, viewId };
    this.viewModelById.clear();
    this.couchService.findAll(this.dbName, findDocuments(selectors, 0, [ { 'time': 'desc' } ])).pipe(
      switchMap((newsItems: any[]) =>
        this.couchService.findAttachmentsByIds(this.collectAttachmentIds(newsItems)).pipe(
          map((attachments: any[]) => ({
            newsItems,
            avatarMap: new Map<string, any>(attachments.map((attachment: any) => [ attachment._id, attachment ]))
          }))
        )
      )
    ).subscribe(({ newsItems, avatarMap }) => {
      this.emitNews(this.buildViewModels(newsItems, avatarMap, viewId));
    });
  }

  findAvatar(user: any, attachments: Map<string, any>) {
    const attachmentId = `${user._id}@${user.planetCode}`;
    const attachment = attachments.get(attachmentId);
    const extractFilename = (object) => Object.keys(object._attachments)[0];
    return attachment ?
      `${this.imgUrlPrefix}/attachments/${attachmentId}/${extractFilename(attachment)}` :
      user._attachments ?
      `${this.imgUrlPrefix}/_users/${user._id}/${extractFilename(user)}` :
      'assets/image.png';
  }

  findShareDate(item, viewId) {
    return ((item.viewIn || []).find(view => view._id === viewId) || {}).sharedDate;
  }

  private collectAttachmentIds(newsItems: any[]): string[] {
    const ids = new Set<string>();
    newsItems.forEach((item: any) => {
      const user = item?.user;
      if (user && user._id && user.planetCode) {
        ids.add(`${user._id}@${user.planetCode}`);
      }
    });
    return Array.from(ids);
  }

  postNews(post, successMessage = $localize`Thank you for submitting your message`, isMessageEdit = true) {
    const { configuration } = this.stateService;
    const message = typeof post.message === 'string' ? post.message : post.message.text;
    const images = this.createImagesArray(post, message);
    const newPost = {
      docType: 'message',
      time: this.couchService.datePlaceholder,
      createdOn: configuration.code,
      parentCode: configuration.parentCode,
      user: this.userService.get(),
      ...post,
      message,
      images,
      updatedDate: isMessageEdit ? this.couchService.datePlaceholder : post.updatedDate,
      viewIn: post.viewIn || []
    };
    return this.couchService.updateDocument(this.dbName, newPost).pipe(map(() => {
      this.planetMessageService.showMessage(successMessage);
      this.requestNews();
    }));
  }

  deleteNews(post, viewId, deleteFromAllViews = false) {
    if (deleteFromAllViews) {
      return this.postNews({ ...post, _deleted: true }, $localize`Message deleted`);
    } else {
      const updatedViewIn = post.viewIn.filter(view => view._id !== viewId);
      if (updatedViewIn.length === 0) {
        return this.postNews({ ...post, _deleted: true }, $localize`Message deleted`);
      } else {
        return this.postNews({ ...post, viewIn: updatedViewIn }, $localize`Message deleted`);
      }
    }
  }

  createImagesArray(post, message) {
    return dedupeObjectArray([
      ...(post.images || []),
      ...(post.message.images || [])
    ].filter(image => message.indexOf(image.resourceId) > -1), [ 'resourceId' ]);
  }

  rearrangeRepliesForDelete(replies: any[] = [], newReplyToId: string) {
    return this.couchService.bulkDocs(this.dbName, replies.map(reply => ({ ...reply.doc, replyTo: newReplyToId })));
  }

  shareNews(news, planets?: any[], successMessage = $localize`Message has been successfully shared`) {
    const viewInObject = (planet) => (
      { '_id': `${planet.code}@${planet.parentCode}`, section: 'community', sharedDate: this.couchService.datePlaceholder }
    );
    const existingPlanetIds = (news.viewIn || []).map(view => view._id);
    const newPlanets = planets ? planets
      .filter(planet => !existingPlanetIds.includes(`${planet.code}@${planet.parentCode}`))
      .map(planet => viewInObject(planet)) : [ viewInObject(this.stateService.configuration) ];
    if (newPlanets.length === 0) {
      return of(undefined);
    }
    return this.postNews(
      {
        ...news,
        messageType: 'sync',
        viewIn: [
          ...(news.viewIn || []),
          ...newPlanets
        ]
      },
      successMessage,
      false
    );
  }

  postSharedWithCommunity(post) {
    return post && post.doc && (post.doc.viewIn || []).some(({ _id }) => _id === planetAndParentId(this.stateService.configuration));
  }

  private buildViewModels(newsItems: any[], avatarMap: Map<string, any>, viewId: string): NewsItemViewModel[] {
    const nextModels: NewsItemViewModel[] = [];
    const seenIds = new Set<string>();

    newsItems.forEach(item => {
      const id = item?._id;
      if (!id) { return; }

      let model = this.viewModelById.get(id);
      const rawMessage = typeof item?.message === 'string' ? item.message : '';

      if (!model) {
        const rendered = this.renderMarkdown(rawMessage);
        model = {
          _id: id,
          doc: item,
          sharedDate: this.findShareDate(item, viewId),
          avatar: this.findAvatar(item.user, avatarMap),
          renderedHtml: rendered.full,
          renderedPreviewHtml: rendered.preview,
          previewTruncated: rendered.truncated,
          renderedSource: rawMessage
        };
        this.viewModelById.set(id, model);
      } else {
        model.doc = item;
        model.sharedDate = this.findShareDate(item, viewId);
        model.avatar = this.findAvatar(item.user, avatarMap);
        if (model.renderedSource !== rawMessage) {
          const rendered = this.renderMarkdown(rawMessage);
          model.renderedHtml = rendered.full;
          model.renderedPreviewHtml = rendered.preview;
          model.previewTruncated = rendered.truncated;
          model.renderedSource = rawMessage;
        }
      }

      nextModels.push(model);
      seenIds.add(id);
    });

    Array.from(this.viewModelById.keys()).forEach(id => {
      if (!seenIds.has(id)) {
        this.viewModelById.delete(id);
      }
    });

    return [ ...nextModels ];
  }

  private emitNews(models: NewsItemViewModel[]) {
    this.newsUpdated$.next(models);
  }

  private renderMarkdown(source: string): { full: SafeHtml; preview: SafeHtml; truncated: boolean } {
    const trimmed = source.trimEnd();
    const textWithoutImages = trimmed.replace(this.imageMarkdownRegex, '');
    const scaledContent = textWithoutImages.replace(/^(#{1,6})\s+(.+)$/gm, '**$2**');
    const adjustedLimit = calculateMdAdjustedLimit(scaledContent, this.previewLimit);
    const truncated = scaledContent.length > adjustedLimit;
    const previewText = truncated ? truncateText(scaledContent, adjustedLimit) : scaledContent;

    return {
      full: this.sanitizer.bypassSecurityTrustHtml(converter.makeHtml(trimmed)),
      preview: this.sanitizer.bypassSecurityTrustHtml(converter.makeHtml(previewText)),
      truncated
    };
  }

}
