/* Generate complete page-specific styles and the exact shared theme source.
 * This is build-time filtering, not viewport coverage or deferred styling.
 * Keep dynamic controls, functional selectors, at-rules and media cascade.
 * Run after editing the source stylesheets, theme.js or either page's HTML.
 */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const root = path.resolve(__dirname, '..');
const checkOnly = process.argv.includes('--check');
const pages = [
  {
    html: 'index.html',
    id: 'home-page',
    sources: ['home-editorial.css'],
    stylesheet: '<link rel="stylesheet" href="home-editorial.css">',
    theme: '<script src="theme.js"></script>',
    prune: false
  },
  {
    html: 'courses/gen-ai-software-applications/index.html',
    id: 'course-page',
    sources: ['styles.css', 'studio-pages.css', 'courses/gen-ai-software-applications/performance.css'],
    stylesheet: '<link rel="stylesheet" href="../../assets/styles/course-preview.min.css">',
    theme: '<script src="/theme.js"></script>',
    prune: true
  }
];

function withoutComments(css) {
  let out = '', quote = '';
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) {
      out += c;
      if (c === '\\') out += css[++i] || '';
      else if (c === quote) quote = '';
    } else if (c === '"' || c === "'") { quote = c; out += c; }
    else if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      if (end < 0) throw new Error('Unclosed CSS comment');
      i = end + 1;
    } else out += c;
  }
  if (quote) throw new Error('Unclosed CSS string');
  return out;
}

function compact(css) {
  let out = '', quote = '', whitespace = false;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) {
      out += c;
      if (c === '\\') out += css[++i] || '';
      else if (c === quote) quote = '';
    } else if (/\s/.test(c)) whitespace = true;
    else {
      if (whitespace && out) out += ' ';
      whitespace = false;
      out += c;
      if (c === '"' || c === "'") quote = c;
    }
  }
  if (quote) throw new Error('Unclosed CSS string');
  return out.trim();
}

function splitSelectors(text) {
  let depth = 0, start = 0, quote = '';
  const result = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if ('(['.includes(c)) depth++;
    if (')]'.includes(c)) depth--;
    if (c === ',' && depth === 0) { result.push(text.slice(start, i)); start = i + 1; }
  }
  if (depth || quote) throw new Error('Unbalanced selector');
  return [...result, text.slice(start)];
}

function keepSelector(selector, classes) {
  // Conservatively retain unknown/functional and escaped selectors. Classes in
  // attribute strings are not class selectors (e.g. a[href$=".webp"]).
  if (/:{1,2}[a-zA-Z_-][\w-]*\(/.test(selector) || selector.includes('\\')) return true;
  const outsideAttributes = selector.replace(/\[(?:[^\]"']|"[^"]*"|'[^']*')*\]/g, '');
  return [...outsideAttributes.matchAll(/\.([a-zA-Z_][\w-]*)/g)]
    .every(match => classes.has(match[1]));
}

function prune(css, classes) {
  let output = '', start = 0, depth = 0, open = -1, quote = '', grouping = 0;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (depth === 0 && '(['.includes(c)) grouping++;
    if (depth === 0 && ')]'.includes(c)) grouping--;
    if (depth === 0 && grouping === 0 && c === ';') {
      const statement = css.slice(start, i + 1).trim();
      if (!statement.startsWith('@')) throw new Error('Unexpected top-level CSS statement');
      output += statement;
      start = i + 1;
    } else if (c === '{' && grouping === 0) {
      if (depth++ === 0) open = i;
    } else if (c === '}' && --depth === 0) {
      const selector = css.slice(start, open).trim();
      const body = css.slice(open + 1, i);
      if (/^@(media|supports|layer|container|scope|starting-style)\b/.test(selector)) {
        const nested = prune(body, classes);
        if (nested) output += `${selector}{${nested}}`;
      } else if (selector.startsWith('@')) {
        // Includes keyframes, font-face and future declaration-style at-rules.
        output += `${selector}{${body}}`;
      } else {
        const selected = splitSelectors(selector).filter(value => keepSelector(value, classes)).join(',');
        if (selected) output += `${selected}{${body}}`;
      }
      start = i + 1;
    }
  }
  if (depth || quote || grouping || css.slice(start).trim()) {
    throw new Error('Unsupported/unbalanced CSS: refusing to generate');
  }
  return output;
}

function replaceGenerated(html, tag, id, replacement, original, file) {
  const marker = `<${tag} id="${id}">`;
  if (html.includes(marker)) {
    const begin = html.indexOf(marker);
    const end = html.indexOf(`</${tag}>`, begin);
    if (end < 0 || html.indexOf(marker, begin + marker.length) >= 0) {
      throw new Error(`Invalid generated block ${id} in ${file}`);
    }
    return html.slice(0, begin) + replacement + html.slice(end + tag.length + 3);
  }
  const begin = html.indexOf(original);
  if (begin < 0 || html.indexOf(original, begin + original.length) >= 0) {
    throw new Error(`Expected one source tag for ${id} in ${file}`);
  }
  return html.slice(0, begin) + replacement + html.slice(begin + original.length);
}

const theme = fs.readFileSync(path.join(root, 'theme.js'), 'utf8').trim();
if (/<\/script\b/i.test(theme)) throw new Error('Theme source contains an HTML closing script tag');
const results = [];
for (const page of pages) {
  const file = path.join(root, page.html);
  const original = fs.readFileSync(file, 'utf8');
  const classes = new Set(['theme-toggle', 'skip-link', 'sr-only']);
  const markup = original.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  for (const match of markup.matchAll(/class="([^"]+)"/g)) {
    match[1].split(/\s+/).forEach(value => classes.add(value));
  }
  const css = page.sources.map(source => {
    const text = withoutComments(fs.readFileSync(path.join(root, source), 'utf8'));
    // No current source has URLs. Fail safely if a future edit needs URL
    // rebasing rather than silently resolving an inline URL against the page.
    if (/\burl\s*\(/i.test(text) || /@import\b/i.test(text)) {
      throw new Error(`Inline CSS URL rebasing is required for ${source}`);
    }
    return compact(page.prune ? prune(text, classes) : text);
  }).join('\n');
  if (/<\/style\b/i.test(css)) throw new Error('CSS contains an HTML closing style tag');
  const styleBlock = `<style id="${page.id}-critical-css">\n/* Generated by tools/build-page-critical-css.cjs; edit source stylesheets. */\n${css}\n</style>`;
  const themeBlock = `<script id="${page.id}-critical-theme">\n${theme}\n</script>`;
  let next = replaceGenerated(original, 'style', `${page.id}-critical-css`, styleBlock, page.stylesheet, page.html);
  next = replaceGenerated(next, 'script', `${page.id}-critical-theme`, themeBlock, page.theme, page.html);
  const changed = next !== original;
  results.push({ page: page.html, sources: page.sources, cssBytes: Buffer.byteLength(css), cssGzipBytes: zlib.gzipSync(css).length, changed });
  if (checkOnly) {
    if (changed) process.exitCode = 1;
  } else if (changed) fs.writeFileSync(file, next);
}
console.log(JSON.stringify({ mode: checkOnly ? 'check' : 'write', results }, null, 2));
