import { Directive, ElementRef, Renderer2, Input, SimpleChanges, OnChanges } from '@angular/core';

@Directive({
  selector: '[planetChatOutput]'
})
export class ChatOutputDirective implements OnChanges {
  @Input('planetChatOutput') text: string;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes.text) {
      const formattedText = this.formatOutput(changes.text.currentValue || '');
      this.renderer.setProperty(this.el.nativeElement, 'innerHTML', formattedText);
      this.addCopyButtons();
    }
  }

  private formatOutput(text: string): string {
    let escapedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Basic Markdown formatting
    escapedText = escapedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    escapedText = escapedText.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Markdown links
    escapedText = escapedText.replace(/\[([^\]]+)\]\((https?:\/\/[^\s]+)\)/g, (match, p1, p2) => {
      return `<a class="chat-link" href="${p2}" target="_blank">${p1}</a>`;
    });

    // Plain URLs
    escapedText = escapedText.replace(/(?<!=")(https?:\/\/[^\s\[\]]+)/g, (match) => {
      return `<a class="chat-link" href="${match}" target="_blank">${match}</a>`;
    });

    escapedText = escapedText.replace(/^###### (.*)$/gm, '<h6>$1</h6>')
      .replace(/^##### (.*)$/gm, '<h5>$1</h5>')
      .replace(/^#### (.*)$/gm, '<h4>$1</h4>')
      .replace(/^### (.*)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*)$/gm, '<h1>$1</h1>');

    escapedText = escapedText.replace(/```([\s\S]*?)```/g, (match, p1) => {
      const codeBlockId = 'code-' + Math.random().toString(36).substr(2, 9);
      return `<pre class="code-block" id="${codeBlockId}"><code>${p1}</code>
        <button class="copy-btn" onclick="copyToClipboard('${codeBlockId}', this)">Copy</button></pre>`;
    });

    // Replace double new lines with paragraphs
    escapedText = escapedText.replace(/\n\n/g, '</p><p>');

    // Replace single new lines with <br> tags
    escapedText = escapedText.replace(/\n/g, '<br>');

    // Wrap content in <p> tags
    escapedText = `<p>${escapedText}</p>`;

    return escapedText;
  }

  private addCopyButtons() {
    const script = document.createElement('script');
    script.innerHTML = `
      function copyToClipboard(id, button) {
        const codeElement = document.getElementById(id).querySelector('code');
        const text = codeElement.innerText;
        navigator.clipboard.writeText(text).then(function() {
          button.classList.add('copied');
          setTimeout(() => button.classList.remove('copied'), 300);
        }, function(err) {
          console.error('Could not copy text: ', err);
        });
      }
    `;
    document.body.appendChild(script);
  }
}
