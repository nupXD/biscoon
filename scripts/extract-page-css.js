const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pagesCssRoot = path.join(root, 'assets', 'css', 'pages');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return entry.isFile() && fullPath.endsWith('.html') ? [fullPath] : [];
  });
}

function cssPathForHtml(htmlPath) {
  const relative = path.relative(root, htmlPath).replace(/\.html$/, '.css');
  return path.join(pagesCssRoot, relative);
}

function cssHrefForHtml(htmlPath, cssPath) {
  let href = path.relative(path.dirname(htmlPath), cssPath).replace(/\\/g, '/');
  if (!href.startsWith('.')) href = `./${href}`;
  return href;
}

function classPrefixForHtml(htmlPath) {
  return path
    .relative(root, htmlPath)
    .replace(/\.html$/, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function addClassAttribute(tag, className) {
  const classMatch = tag.match(/\sclass=(["'])(.*?)\1/i);
  if (classMatch) {
    const quote = classMatch[1];
    const existing = classMatch[2].trim();
    const next = existing ? `${existing} ${className}` : className;
    return tag.replace(classMatch[0], ` class=${quote}${next}${quote}`);
  }
  return tag.replace(/\s*\/?>$/, match => ` class="${className}"${match}`);
}

function extractPageCss(htmlPath) {
  let html = fs.readFileSync(htmlPath, 'utf8');
  const cssChunks = [];
  const styleMap = new Map();
  const prefix = classPrefixForHtml(htmlPath);
  let styleCount = 0;

  html = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => {
    const trimmed = css.trim();
    if (trimmed) cssChunks.push(`/* Extracted from ${path.relative(root, htmlPath)} */\n${trimmed}`);
    return '';
  });

  html = html.replace(/<([a-zA-Z][^<>]*?)\sstyle=(["'])(.*?)\2([^<>]*?)>/gs, (match, before, _quote, style, after) => {
    const normalized = style.trim().replace(/\s+/g, ' ');
    if (!normalized) return `<${before}${after}>`;

    let className = styleMap.get(normalized);
    if (!className) {
      styleCount += 1;
      className = `${prefix}-inline-${styleCount}`;
      styleMap.set(normalized, className);
    }

    return addClassAttribute(`<${before}${after}>`, className);
  });

  if (styleMap.size) {
    const inlineCss = Array.from(styleMap.entries())
      .map(([style, className]) => `.${className} { ${style} }`)
      .join('\n');
    cssChunks.push(`/* Extracted inline styles from ${path.relative(root, htmlPath)} */\n${inlineCss}`);
  }

  if (!cssChunks.length) return false;

  const cssPath = cssPathForHtml(htmlPath);
  ensureDir(cssPath);
  fs.writeFileSync(cssPath, `${cssChunks.join('\n\n')}\n`);

  const href = cssHrefForHtml(htmlPath, cssPath);
  const link = `<link rel="stylesheet" href="${href}"/>`;
  if (!html.includes(`href="${href}"`) && !html.includes(`href='${href}'`)) {
    const mainCssLink = /<link\s+rel=(["'])stylesheet\1\s+href=(["'])(?:\.\.\/)*assets\/css\/main\.css\2\s*\/?>/i;
    if (mainCssLink.test(html)) {
      html = html.replace(mainCssLink, matched => `${matched}\n${link}`);
    } else {
      html = html.replace(/<\/head>/i, `${link}\n</head>`);
    }
  }

  html = html.replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(htmlPath, html);
  return true;
}

const htmlFiles = [path.join(root, 'index.html'), ...walk(path.join(root, 'pages'))];
const changed = htmlFiles.filter(extractPageCss);
console.log(`Extracted CSS from ${changed.length} HTML files.`);
