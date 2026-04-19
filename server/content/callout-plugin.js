// markdown-it plugin: GitHub-style blockquote callouts.
//
//   > [!INFO] Title
//   > body line 1
//   > body line 2
//
// Types: INFO, WARN, TIP, DANGER (case-insensitive).

const TYPE_RE = /^\[!(INFO|WARN|TIP|DANGER)\]\s*(.*)$/i;

export default function calloutPlugin(md) {
  md.core.ruler.after('inline', 'callout', (state) => {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== 'blockquote_open') continue;

      // Find matching close.
      let depth = 1;
      let j = i + 1;
      for (; j < tokens.length; j++) {
        if (tokens[j].type === 'blockquote_open') depth++;
        else if (tokens[j].type === 'blockquote_close') {
          depth--;
          if (depth === 0) break;
        }
      }
      if (j >= tokens.length) continue;

      // First inline token inside.
      const first = tokens.slice(i + 1, j).find((t) => t.type === 'inline');
      if (!first || !first.children?.length) continue;

      const firstChild = first.children[0];
      if (firstChild.type !== 'text') continue;

      const m = TYPE_RE.exec(firstChild.content);
      if (!m) continue;

      const type = m[1].toLowerCase();
      const title = m[2].trim() || m[1].toUpperCase();

      // Strip marker + leading newline from inline.
      firstChild.content = '';
      if (first.children[1]?.type === 'softbreak' || first.children[1]?.type === 'hardbreak') {
        first.children.splice(0, 2);
      } else {
        first.children.shift();
      }
      first.content = first.children.map((t) => t.content || '').join('');

      // Rewrite tokens: blockquote_open -> callout div; inject title header.
      const openToken = tokens[i];
      openToken.type = 'callout_open';
      openToken.tag = 'div';
      openToken.attrSet('class', `callout callout-${type}`);
      openToken.block = true;
      openToken.markup = '';

      const closeToken = tokens[j];
      closeToken.type = 'callout_close';
      closeToken.tag = 'div';
      closeToken.markup = '';

      // Inject title element right after open.
      const titleOpen = new state.Token('html_block', '', 0);
      titleOpen.content = `<div class="callout-title">${escapeHtml(title)}</div>\n`;
      tokens.splice(i + 1, 0, titleOpen);
    }
  });

  md.renderer.rules.callout_open = (tokens, idx) => {
    const cls = tokens[idx].attrGet('class') || 'callout';
    return `<div class="${cls}">\n`;
  };
  md.renderer.rules.callout_close = () => `</div>\n`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
