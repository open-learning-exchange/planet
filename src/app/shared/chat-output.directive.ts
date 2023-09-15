import { Directive, ElementRef, Renderer2, Input } from '@angular/core';

@Directive({
  selector: '[planetChatOutput]'
})
export class ChatOutputDirective {
  constructor(private el: ElementRef, private renderer: Renderer2) {}

  @Input('planetChatOutput') set planetChatOutput(text: string) {
    const formattedText = this.formatOutput(text);
    this.renderer.setProperty(this.el.nativeElement, 'innerHTML', formattedText);
  }

  private formatOutput(text: string): string {
    // Escape HTML tags to prevent rendering as HTML
    const escapedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Replace newline characters with <br> tags
    const textWithLineBreaks = escapedText.replace(/\n/g, '<br>');

    // Replace code block markers with <code> tags
    const codeBlockStart = /```/g;
    const codeBlockEnd = /```/g;
    const textWithCodeBlocks = textWithLineBreaks
      .replace(codeBlockStart, '<code>')
      .replace(codeBlockEnd, '</code>');

    return textWithCodeBlocks;
  }

}
