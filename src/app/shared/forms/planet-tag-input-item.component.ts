import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { UserService } from '../user.service';
import { isInMap } from '../utils';

export interface TagChangeEvent {
  tags: string[];
  tagOne?;
  deselectSubs?;
}

@Component({
  'selector': 'planet-tag-input-item',
  'templateUrl': './planet-tag-input-item.component.html',
  'styles': [ `
    :host p[matLine] * {
      margin-right: 0.25rem;
    }
    :host p[matLine] *:last-child {
      margin-right: 0;
    }
  ` ]
})
export class PlanetTagInputItemComponent implements OnInit {

  @Input() tag: any = {};
  @Input() selected: Map<string, boolean>;
  @Input() indeterminate: Map<string, boolean>;
  @Input() subcollectionIsOpen = new Map();
  @Output() onTagChange = new EventEmitter<TagChangeEvent>();
  @Output() onToggleSubcollection = new EventEmitter<{ event: any, tagId: string }>();
  @Output() onEditTag = new EventEmitter<{ event: any, tag: any }>();
  @Output() onDeleteTag = new EventEmitter<{ event: any, tag: any }>();
  isUserAdmin = this.userService.get().isUserAdmin;
  isInMap = isInMap;
  isSubcollection = false;

  constructor(
    private userService: UserService
  ) {}

  ngOnInit() {
    this.isSubcollection = this.tag._id.split('_').length > 2;
  }

  tagChange(changeEvent: TagChangeEvent) {
    if (changeEvent.tags[0] !== this.tag._id) {
      changeEvent.tags.push(this.tag._id);
    }
    this.onTagChange.emit(changeEvent);
  }

  toggleSubcollection(event) {
    this.onToggleSubcollection.emit({ ...event, keepOpen: [ ...event.keepOpen, this.tag._id ] });
  }

  editTagClick(event) {
    this.onEditTag.emit(event);
  }

  deleteTag(event) {
    this.onDeleteTag.emit(event);
  }

  checkboxChange(event, tag) {
    event.source.checked = isInMap(tag, this.selected);
  }

  subTagIds(subTags: any[] = []) {
    return subTags.map(subTag => subTag._id || subTag.name);
  }

}
