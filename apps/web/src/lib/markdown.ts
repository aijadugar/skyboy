import { Marked } from "marked";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import python from "highlight.js/lib/languages/python";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import json from "highlight.js/lib/languages/json";
import yaml from "highlight.js/lib/languages/yaml";
import xml from "highlight.js/lib/languages/xml";
import markdown from "highlight.js/lib/languages/markdown";

// Register only the languages these skills actually ship, so the bundle stays
// small. Alias the common fence labels (tsx, ts, bash, sh, yml) onto the
// registered grammars so a code block never falls through to auto-highlight.
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("python", python);
hljs.registerLanguage("css", css);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("markdown", markdown);
hljs.registerAliases(["tsx", "ts"], { languageName: "typescript" });
hljs.registerAliases(["sh", "shell"], { languageName: "bash" });
hljs.registerAliases(["js", "node"], { languageName: "javascript" });
hljs.registerAliases(["yml"], { languageName: "yaml" });

const marked = new Marked({ gfm: true, breaks: false });
marked.use({
  renderer: {
    code({ text, lang }) {
      const alias = (lang ?? "").toLowerCase();
      const language = hljs.getLanguage(alias) ? alias : undefined;
      const value = language
        ? hljs.highlight(text, { language }).value
        : hljs.highlightAuto(text).value;
      return `<pre class="md-code"><code class="hljs language-${language ?? "plaintext"}">${value}</code></pre>`;
    },
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const attrs = title ? ` title="${escapeHtml(title)}"` : "";
      return `<a href="${encodeURI(href ?? "")}"${attrs} rel="noopener noreferrer">${text}</a>`;
    },
  },
});

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c] as string);
}

// Render SKILL.md to HTML on the server. Safe to call from a Server Component.
export function renderMarkdown(markdown: string): string {
  return marked.parse(markdown, { async: false });
}
