export function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/** Very small markdown-ish renderer for safety (safe-ish, not a full parser) */
export function renderMarkdownToHtml(text: string) {
  // escape HTML
  const esc = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  let t = esc(text);

  // code blocks
  t = t.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="rounded-md p-3 overflow-x-auto"><code>${esc(code)}</code></pre>`;
  });

  // inline code
  t = t.replace(/`([^`]+)`/g, (_, c) => `<code class="px-1 py-0.5 rounded text-sm">${esc(c)}</code>`);

  // bold & italic
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // line breaks
  t = t.replace(/\n/g, '<br/>');

  return t;
}
