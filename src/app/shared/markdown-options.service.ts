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
    }
  ],
  spellChecker: true,
   insertTexts: {
    horizontalRule: [ '', '\n\n-----\n\n' ],
    image: [ '![](http://', ')' ],
    link: [ '[', '](http://)' ],
    table: [ '', '\n\n| Column 1 | Column 2 | Column 3 |\n| -------- | -------- | -------- |\n| Text     | Text      | Text     |\n\n' ]
  }
  };
}
