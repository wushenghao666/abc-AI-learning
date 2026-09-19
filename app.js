const state = { posts: [], filter: 'all', query: '' };
const grid = document.querySelector('#postsGrid');
const filters = document.querySelector('#filters');
const dialog = document.querySelector('#postDialog');
const content = document.querySelector('#postContent');
const searchInput = document.querySelector('#searchInput');
const themeToggle = document.querySelector('#themeToggle');
const readingProgress = document.querySelector('#readingProgress');

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char]));

function renderInline(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, '<img src="$2" alt="$1" loading="lazy">')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

function renderMarkdown(markdown) {
  const lines = markdown.replaceAll('\r\n', '\n').split('\n');
  const html = [];
  let paragraph = [];
  let listType = '';
  let code = [];
  let codeLanguage = '';

  const flushParagraph = () => {
    if (paragraph.length) { html.push(`<p>${renderInline(paragraph.join(' '))}</p>`); paragraph = []; }
  };
  const closeList = () => {
    if (listType) { html.push(`</${listType}>`); listType = ''; }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fence = line.match(/^```(.*)$/);
    if (fence) {
      flushParagraph(); closeList();
      if (code.length || codeLanguage) {
        html.push(`<pre><code${codeLanguage ? ` class="language-${escapeHtml(codeLanguage)}"` : ''}>${escapeHtml(code.join('\n'))}</code></pre>`);
        code = []; codeLanguage = '';
      } else {
        codeLanguage = fence[1].trim() || 'text';
      }
      continue;
    }
    if (codeLanguage) { code.push(line); continue; }
    if (!line.trim()) { flushParagraph(); closeList(); continue; }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) { flushParagraph(); closeList(); const level = heading[1].length; html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`); continue; }
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) { flushParagraph(); closeList(); html.push(`<blockquote><p>${renderInline(quote[1])}</p></blockquote>`); continue; }
    const nextLine = lines[index + 1] || '';
    const isTable = line.includes('|') && /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(nextLine.trim());
    if (isTable) {
      flushParagraph(); closeList();
      const cells = (row) => row.trim().replace(/^\||\|$/g, '').split('|').map((cell) => renderInline(cell.trim()));
      const headers = cells(line);
      html.push(`<div class="table-wrap"><table><thead><tr>${headers.map((cell) => `<th>${cell}</th>`).join('')}</tr></thead><tbody>`);
      index += 2;
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        html.push(`<tr>${cells(lines[index]).map((cell) => `<td>${cell}</td>`).join('')}</tr>`);
        index += 1;
      }
      html.push('</tbody></table></div>');
      index -= 1;
      continue;
    }
    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const wanted = unordered ? 'ul' : 'ol';
      if (listType !== wanted) { closeList(); listType = wanted; html.push(`<${wanted}>`); }
      html.push(`<li>${renderInline((unordered || ordered)[1])}</li>`);
      continue;
    }
    paragraph.push(line.trim());
  }
  if (codeLanguage) html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
  flushParagraph(); closeList();
  return html.join('\n');
}

function renderPosts() {
  const query = state.query.trim().toLocaleLowerCase('zh-CN');
  const visible = state.posts.filter((post) => {
    const matchesTag = state.filter === 'all' || post.tags.includes(state.filter);
    const haystack = `${post.title} ${post.excerpt} ${post.tags.join(' ')}`.toLocaleLowerCase('zh-CN');
    return matchesTag && (!query || haystack.includes(query));
  });
  if (!visible.length) {
    grid.innerHTML = '<div class="empty-state"><span>NO MATCHES</span><p>没有找到相符的记录，换个关键词试试。</p></div>';
    return;
  }
  grid.innerHTML = visible.map((post, index) => `
    <article class="post-card" data-slug="${escapeHtml(post.slug)}" tabindex="0" role="button" aria-label="阅读：${escapeHtml(post.title)}">
      <div class="post-index">${String(index + 1).padStart(2, '0')}</div>
      <div class="post-date">${escapeHtml(post.date.replaceAll('-', '.'))}</div>
      <h3>${escapeHtml(post.title)}</h3>
      <p class="post-excerpt">${escapeHtml(post.excerpt)}</p>
      <div class="post-footer">${post.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}<span class="read-more">READ ↗</span></div>
    </article>`).join('');
  grid.querySelectorAll('.post-card').forEach((card) => {
    const open = () => openPost(card.dataset.slug);
    card.addEventListener('click', open);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
    });
  });
}

function setupFilters() {
  const tags = [...new Set(state.posts.flatMap((post) => post.tags))];
  tags.forEach((tag) => {
    const button = document.createElement('button');
    button.className = 'filter'; button.type = 'button'; button.dataset.filter = tag; button.textContent = tag;
    filters.appendChild(button);
  });
  filters.addEventListener('click', (event) => {
    if (!event.target.matches('.filter')) return;
    filters.querySelectorAll('.filter').forEach((button) => button.classList.remove('active'));
    event.target.classList.add('active'); state.filter = event.target.dataset.filter; renderPosts();
  });
}

function stripFrontMatter(markdown) {
  return markdown.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n/, '');
}

async function openPost(slug, updateHash = true) {
  const post = state.posts.find((item) => item.slug === slug);
  if (!post) return;
  try {
    const response = await fetch(post.file);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const markdown = stripFrontMatter(await response.text());
    content.innerHTML = `<div class="article-meta"><span>${escapeHtml(post.date)}</span><span>${post.tags.map(escapeHtml).join(' / ')}</span></div>${renderMarkdown(markdown)}`;
    content.querySelector('h1')?.setAttribute('id', 'postTitle');
    document.body.classList.add('reading-open');
    dialog.showModal(); dialog.scrollTop = 0; updateReadingProgress();
    if (updateHash) history.pushState({ post: slug }, '', `#post=${encodeURIComponent(slug)}`);
  } catch (error) {
    content.innerHTML = '<h1 id="postTitle">文章载入失败</h1><p>请检查文章文件是否存在，或稍后再试。</p>';
    dialog.showModal();
  }
}

function closePost(updateHash = true) {
  if (dialog.open) dialog.close();
  document.body.classList.remove('reading-open');
  if (updateHash && location.hash.startsWith('#post=')) history.pushState({}, '', '#archive');
}
function updateReadingProgress() {
  const max = dialog.scrollHeight - dialog.clientHeight;
  readingProgress.style.transform = `scaleX(${max > 0 ? dialog.scrollTop / max : 0})`;
}
function applyTheme(theme) {
  const isLight = theme === 'light';
  document.body.classList.toggle('light', isLight);
  themeToggle.setAttribute('aria-pressed', String(isLight));
  themeToggle.querySelector('span').textContent = isLight ? '◑' : '◐';
}
async function init() {
  try {
    const response = await fetch('posts.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.posts = await response.json(); setupFilters(); renderPosts();
    const slug = location.hash.startsWith('#post=') ? decodeURIComponent(location.hash.slice(6)) : '';
    if (slug) openPost(slug, false);
  } catch (error) {
    grid.innerHTML = '<div class="empty-state"><span>LOAD ERROR</span><p>文章索引尚未生成，请先运行构建脚本。</p></div>';
  }
}

searchInput.addEventListener('input', () => { state.query = searchInput.value; renderPosts(); });
document.querySelector('#dialogClose').addEventListener('click', () => closePost());
dialog.addEventListener('click', (event) => { if (event.target === dialog) closePost(); });
dialog.addEventListener('close', () => {
  document.body.classList.remove('reading-open');
  if (location.hash.startsWith('#post=')) history.replaceState({}, '', '#archive');
});
dialog.addEventListener('scroll', updateReadingProgress, { passive: true });
window.addEventListener('popstate', () => {
  const slug = location.hash.startsWith('#post=') ? decodeURIComponent(location.hash.slice(6)) : '';
  if (slug) openPost(slug, false); else closePost(false);
});
themeToggle.addEventListener('click', () => {
  const theme = document.body.classList.contains('light') ? 'dark' : 'light';
  localStorage.setItem('nn-theme', theme); applyTheme(theme);
});
applyTheme(localStorage.getItem('nn-theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
document.querySelector('#year').textContent = new Date().getFullYear();
init();
