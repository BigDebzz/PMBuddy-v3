// Reads the HTML that PM Buddy generates (headings, paragraphs, lists, tables, bold and italic)
// into simple blocks. The Word and PDF builders both use these blocks, so the two files match.
//
// Block shapes:
//   { type: 'heading', level: 1 | 2 | 3, runs }
//   { type: 'paragraph', runs }
//   { type: 'list', ordered: boolean, items: [runs] }
//   { type: 'table', rows: [[{ runs, header }]] }
//   { type: 'callout', blocks: [...] }   the highlighted key points box
// A run is { text, bold, italic }.

function collectRuns(node, style, out) {
  node.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      const text = child.textContent.replace(/\s+/g, ' ');
      if (text) out.push({ text, bold: !!style.bold, italic: !!style.italic });
    } else if (child.nodeType === 1) {
      const tag = child.tagName.toLowerCase();
      if (tag === 'br') out.push({ text: '\n', bold: false, italic: false });
      else if (tag === 'ul' || tag === 'ol' || tag === 'table') return;
      else {
        collectRuns(child, {
          bold: style.bold || tag === 'strong' || tag === 'b',
          italic: style.italic || tag === 'em' || tag === 'i',
        }, out);
      }
    }
  });
  return out;
}

function tidy(runs) {
  const out = runs.map(r => ({ ...r }));
  while (out.length && out[0].text.trim() === '' && out[0].text !== '\n') out.shift();
  if (out.length) out[0].text = out[0].text.replace(/^\s+/, '');
  while (out.length && out[out.length - 1].text.trim() === '' && out[out.length - 1].text !== '\n') out.pop();
  if (out.length) out[out.length - 1].text = out[out.length - 1].text.replace(/\s+$/, '');
  return out.filter(r => r.text !== '');
}

function runsOf(node, style = {}) {
  return tidy(collectRuns(node, style, []));
}

function listItems(listNode, items) {
  Array.from(listNode.children).forEach((li) => {
    if (li.tagName.toLowerCase() !== 'li') return;
    const runs = runsOf(li);
    if (runs.length) items.push(runs);
    Array.from(li.children).forEach((nested) => {
      const t = nested.tagName.toLowerCase();
      if (t === 'ul' || t === 'ol') listItems(nested, items);
    });
  });
  return items;
}

function tableRows(tableNode) {
  const rows = [];
  tableNode.querySelectorAll('tr').forEach((tr) => {
    const cells = Array.from(tr.children)
      .filter(c => ['td', 'th'].includes(c.tagName.toLowerCase()))
      .map(c => ({ runs: runsOf(c, c.tagName.toLowerCase() === 'th' ? { bold: true } : {}), header: c.tagName.toLowerCase() === 'th' }));
    if (cells.length) rows.push(cells);
  });
  return rows;
}

function walk(container, blocks) {
  let loose = [];
  const flush = () => {
    const runs = tidy(loose);
    if (runs.length) blocks.push({ type: 'paragraph', runs });
    loose = [];
  };

  container.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      const text = node.textContent.replace(/\s+/g, ' ');
      if (text.trim()) loose.push({ text, bold: false, italic: false });
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();

    if (/^h[1-6]$/.test(tag)) {
      flush();
      const runs = runsOf(node);
      if (runs.length) blocks.push({ type: 'heading', level: Math.min(3, Number(tag[1])), runs });
    } else if (tag === 'p') {
      flush();
      const runs = runsOf(node);
      if (runs.length) blocks.push({ type: 'paragraph', runs });
    } else if (tag === 'ul' || tag === 'ol') {
      flush();
      const items = listItems(node, []);
      if (items.length) blocks.push({ type: 'list', ordered: tag === 'ol', items });
    } else if (tag === 'table') {
      flush();
      const rows = tableRows(node);
      if (rows.length) blocks.push({ type: 'table', rows });
    } else if (tag === 'div' && node.classList.contains('keypoints')) {
      flush();
      const inner = walk(node, []);
      if (inner.length) blocks.push({ type: 'callout', blocks: inner });
    } else if (['div', 'section', 'article', 'blockquote', 'main', 'body'].includes(tag)) {
      flush();
      walk(node, blocks);
    } else if (tag === 'br') {
      loose.push({ text: '\n', bold: false, italic: false });
    } else {
      collectRuns(node, { bold: tag === 'strong' || tag === 'b', italic: tag === 'em' || tag === 'i' }, loose);
    }
  });
  flush();
  return blocks;
}

export function htmlToBlocks(html) {
  const doc = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html');
  return walk(doc.body, []);
}

export function plainText(runs) {
  return runs.map(r => r.text).join('');
}
