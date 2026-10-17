/** Shared email shell: warm paper background, pine-and-bark palette. */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

export function emailLayout({ heading, body, cta }: { heading: string; body: string; cta?: { label: string; url: string } }) {
  const button = cta
    ? `<p style="margin:28px 0"><a href="${cta.url}" style="background:#2f5d3a;color:#fffdf9;padding:14px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">${escapeHtml(cta.label)}</a></p>`
    : ''
  return `<!doctype html><html><body style="margin:0;background:#faf6f0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#3d352e">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<p style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#7a7067;margin:0 0 8px">ChuckFest</p>
<div style="background:#fffdf9;border:1px solid #e8dcc8;border-radius:12px;padding:28px 24px">
<h1 style="font-size:22px;margin:0 0 16px;color:#5c4033">${escapeHtml(heading)}</h1>
<div style="font-size:16px;line-height:1.55">${body}</div>
${button}
</div>
<p style="font-size:12px;color:#7a7067;margin:16px 4px">You're getting this because you're part of ChuckFest.</p>
</div></body></html>`
}
