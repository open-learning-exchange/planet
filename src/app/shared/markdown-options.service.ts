import { Injectable } from '@angular/core';
import * as SimpleMDE from 'simplemde';

@Injectable()
export class MarkDownOptionsService {

    options: any = {
    lineWrapping: true,
    autofocus: true,
    forceSync: true,

    toolbar: [ {
      name: 'bold',
      action: SimpleMDE.toggleBold,
      className: 'fa fa-bold',
      title: 'Bold',
    },
    {
      name: 'italic',
      className: 'fa fa-italic',
      action: SimpleMDE.toggleItalic,
      title: 'Italic',
    },
    {
      name: 'link',
      className: 'fa fa-link',
      title: 'Link',
      action: SimpleMDE.drawLink
    },
    '|',
    {
      name: 'preview',
      className: 'fa fa-eye no-disable',
      action: SimpleMDE.togglePreview,
      title: 'Preview'
    },
    {
      name: 'image',
      className: 'fa fa-picture-o',
      action: SimpleMDE.drawImage,
      title: 'Image',
    },
    {
      name: 'quote',
      className: 'fa fa-quote-left',
      action: SimpleMDE.toggleBlockquote,
      title: 'Quote'
    },
    {
      name: 'heading-1',
      className: 'fa fa-header fa-header-x fa-header-1',
      action: SimpleMDE.toggleHeading1,
      title: 'Heading1'
    },
    {
      name: 'heading-2',
      className: 'fa fa-header fa-header-x fa-header-2',
      action: SimpleMDE.toggleHeading2,
      title: 'Heading2'
    },
    {
      name: 'heading-3',
      className: 'fa fa-header fa-header-x fa-header-3',
      action: SimpleMDE.toggleHeading3,
      title: 'Heading3'
    },
    {
      name: 'ordered-list',
      className: 'fa fa-list-ol',
      action: SimpleMDE.toggleOrderedList,
      title: 'Ordered List'
    },
    {
      name: 'unordered-list',
      className: 'fa fa-list-ul',
      action: SimpleMDE.toggleUnorderedList,
      title: 'Un Ordered List'
    },
    {
      name: 'clean-block',
      className: 'fa fa-eraser fa-clean-block',
      action: SimpleMDE.cleanBlock,
      title: 'Clean Block'
    },
    {
      name: 'horizontal-rule',
      className: 'fa fa-minus',
      action: SimpleMDE.drawHorizontalRule,
      title: 'Horizontal-rule'
    }
  ],
  spellChecker: true,
   insertTexts: {
    horizontalRule: [ '', '\n\n-----\n\n' ],
    image: [ '![](http://', ')' ],
    link: [ '[', '](http://)' ],
    table: [ '', '\n\n| Column 1 | Column 2 | Column 3 |\n| -------- | -------- | -------- |\n| Text     | Text      | Text     |\n\n' ]
  },
  placeholder: 'Description'
  };
}
