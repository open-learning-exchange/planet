import { Directive, ElementRef, Renderer2, Input } from '@angular/core';

@Directive({
  selector: '[planetChatFormat]'
})
export class ChatFormatDirective {
  constructor(private el: ElementRef, private renderer: Renderer2) {}

  @Input('planetChatFormat') set planetChatFormat(text: string) {
    const formattedText = this.formatText(text);
    this.renderer.setProperty(this.el.nativeElement, 'innerHTML', formattedText);
  }

  private formatText(text: string): string {
    // For example, replace newline characters with <br> tags
    const textWithLineBreaks = text.replace(/\n/g, '<br>');

    // Replace code block markers with <code> tags
    const codeBlockStart = /```/g;
    const codeBlockEnd = /```/g;
    const textWithCodeBlocks = textWithLineBreaks
      .replace(codeBlockStart, '<code>')
      .replace(codeBlockEnd, '</code>');

    return textWithCodeBlocks;
  }
}
