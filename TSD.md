# Technical Specification Document (TSD): Blog CMS

This specification outlines the codebase modifications, directory structure, Firestore interactions, and layout bindings for the Blog CMS.

---

## 1. Directory Structure Additions
We add public routes using Next.js App Router folders under `src/app/`:

```
src/
├── app/
│   ├── blog/
│   │   ├── page.js           <-- Public blog post feed layout
│   │   └── [slug]/
│   │       └── page.js       <-- Public single blog details layout
│   └── dashboard/
│       └── page.js           <-- Add renderBlogCMSView() tab
```

---

## 2. Firestore Queries & Data Access

We use Firebase web SDK v12.
- Collection: `blogs`
- Queries:
  - **All Blogs (Admin)**: `getDocs(query(collection(db, "blogs"), orderBy("createdTimestamp", "desc")))`
  - **Published Feed (Public)**: `getDocs(query(collection(db, "blogs"), where("status", "==", "published"), orderBy("createdTimestamp", "desc")))` (Note: requires index if ordering is paired with where constraint, fallback to client-side filtering if composite indices are missing).
  - **Query by Slug (Public)**: `getDocs(query(collection(db, "blogs"), where("slug", "==", slug), limit(1)))`

---

## 3. Markdown Parser Helper
To prevent importing large external dependencies, we use a regex-based lightweight compiler helper inside `src/app/blog/[slug]/page.js` to parse basic markdown (`#`, `##`, `###`, `**`, `*`, `[text](url)`, `code blocks`, `lists`) into styled HTML elements.

```javascript
export function parseMarkdown(mdText) {
  if (!mdText) return "";
  let html = mdText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks: ```javascript code ``` -> <pre className="font-mono bg-surface-container-low p-md rounded-lg border border-outline-variant/30 text-body-md my-md"><code>...</code></pre>
  html = html.replace(/```([\s\S]+?)```/g, (match, code) => {
    return `<pre class="font-mono bg-surface-container-low p-md rounded-lg border border-outline-variant/30 text-body-md my-md overflow-x-auto"><code class="text-primary font-mono">${code.trim()}</code></pre>`;
  });

  // Inline code: `code` -> <code className="font-mono bg-primary/10 text-primary px-1 rounded">code</code>
  html = html.replace(/`([^`]+?)`/g, '<code class="font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[13px]">$1</code>');

  // Headers
  html = html.replace(/^### (.*?)$/gm, '<h3 class="text-title-md font-bold text-on-surface mt-lg mb-sm">$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2 class="text-title-lg font-bold text-on-surface mt-xl mb-md border-b border-outline-variant/30 pb-xs">$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1 class="text-headline-md font-extrabold text-on-surface mt-xl mb-md">$1</h1>');

  // Bold / Italics
  html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+?)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, '<a href="$2" class="text-primary hover:underline font-semibold">$1</a>');

  // Bullets: - item -> <li>item</li>
  html = html.replace(/^- (.*?)$/gm, '<li class="ml-lg list-disc text-body-md text-on-surface-variant my-xs">$1</li>');

  // Paragraph blocks (split by double carriage return and wrap non-headers/lists)
  const paragraphs = html.split(/\n\n+/);
  const parsedParagraphs = paragraphs.map(p => {
    const trimmed = p.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') || trimmed.startsWith('<li') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol')) {
      return trimmed;
    }
    return `<p class="text-body-md text-on-surface-variant leading-relaxed mb-md">${trimmed.replace(/\n/g, '<br/>')}</p>`;
  });

  return parsedParagraphs.join("\n");
}
```

---

## 4. Performance & Styling
- All new layouts must use CSS variables configured in `globals.css` (e.g. `--color-primary`, `--color-surface-container-lowest`) and tailwind utility classes for responsive grids and typography.
- Light/Dark mode transitions are synced through the `.dark` selector on `<html>`.
- Meta title tag and description should be set up inside `/blog` and `/blog/[slug]` to ensure SEO metadata structure conforms to Next.js standards.
- To prevent network latency, the CMS seeds 3 default articles upon first load of the blog dashboard if empty, resolving immediately.
