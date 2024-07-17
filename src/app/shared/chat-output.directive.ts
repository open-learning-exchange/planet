import { Directive, ElementRef, Renderer2, Input, AfterViewInit } from '@angular/core';

@Directive({
  selector: '[planetChatOutput]'
})
export class ChatOutputDirective implements AfterViewInit {
  @Input('planetChatOutput') text: string;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngAfterViewInit() {
    const formattedText = this.formatOutput(this.text);
    this.renderer.setProperty(this.el.nativeElement, 'innerHTML', formattedText);
    this.addCopyButtons();
    this.addStyles();
  }

  private formatOutput(text: string): string {
    // Escape HTML tags to prevent rendering as HTML
    let escapedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Basic Markdown formatting
    // Bold: **text**
    escapedText = escapedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text*
    escapedText = escapedText.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Plain URLs: https://www.example.com
    escapedText = escapedText.replace(/(https?:\/\/[^\s]+)/g, (match) => {
      // Avoid breaking already processed markdown links
      if (escapedText.includes(`href="${match}"`)) {
        return match;
      }
      console.log('Plain URL detected:', match); // Debugging
      return `<a href="${match}" target="_blank">${match}</a>`;
    });

    // Markdown Links: [text](url)
    escapedText = escapedText.replace(/\[([^\]]+)\]\((https?:\/\/[^\s]+)\)/g, (match, p1, p2) => {
      return `<a href="${p2}" target="_blank">${p1}</a>`;
    });

    // Headers: # Header1 through ###### Header6
    escapedText = escapedText.replace(/^###### (.*)$/gm, '<h6>$1</h6>')
      .replace(/^##### (.*)$/gm, '<h5>$1</h5>')
      .replace(/^#### (.*)$/gm, '<h4>$1</h4>')
      .replace(/^### (.*)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*)$/gm, '<h1>$1</h1>');

    // Code blocks: ```code```
    escapedText = escapedText.replace(/```([\s\S]*?)```/g, (match, p1) => {
      const codeBlockId = 'code-' + Math.random().toString(36).substr(2, 9);
      return `<pre class="code-block" id="${codeBlockId}"><code>${p1}</code><button class="copy-btn" onclick="copyToClipboard('${codeBlockId}', this)">Copy</button></pre>`;
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

  private addStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
      .code-block {
        position: relative;
        background-color: #2d2d2d;
        color: #f8f8f2;
        padding: 10px;
        border-radius: 5px;
        overflow-x: auto;
        font-family: 'Courier New', Courier, monospace;
      }

      .copy-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        background-color: transparent;
        border: none;
        padding: 5px;
        cursor: pointer;
        color: #f8f8f2;
        transition: color 0.3s;
      }

      .copy-btn.copied {
        color: #2196f3;
      }

      a {
        color: #1e88e5 !important;
        text-decoration: none;
      }

      a:hover {
        text-decoration: underline;
      }
    `;
    document.head.appendChild(style);
  }
}
