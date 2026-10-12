/*
 * branches.js — the single source of truth for Lucky Lion's branches.
 *
 * Loaded BEFORE api.js on both pages, because api.js needs the branch CODE
 * synchronously to build per-branch member IDs (TRECE-C-0001, TRECE-S-01, …).
 * Richer per-branch contact details (address/phone/hours/facebook) live in
 * data/content.json under `branches.<key>` — this file only carries the
 * canonical keys, human labels, short codes and a few tiny helpers.
 *
 * There are 9 branches. `main` (Buhay na Tubig, Imus) is the company's home /
 * "THIS BRANCH" highlight on the public site.
 */
const BRANCHES = [
  { key: 'main',   name: 'Main — Buhay na Tubig, Imus', short: 'Main',   code: 'MAIN' },
  { key: 'imus',   name: 'Imus Branch',                 short: 'Imus',   code: 'IMUS' },
  { key: 'trece',  name: 'Trece Branch',                short: 'Trece',  code: 'TRECE' },
  { key: 'tanza',  name: 'Tanza Branch',                short: 'Tanza',  code: 'TANZA' },
  { key: 'naic',   name: 'Naic Branch',                 short: 'Naic',   code: 'NAIC' },
  { key: 'tejero', name: 'Tejero Branch',               short: 'Tejero', code: 'TEJERO' },
  { key: 'gma',    name: 'GMA Branch',                  short: 'GMA',    code: 'GMA' },
  { key: 'silang',   name: 'Silang Branch',             short: 'Silang',    code: 'SILANG' },
  { key: 'sanroque', name: 'San Roque Branch',          short: 'San Roque', code: 'SANROQUE' }
];

const BRANCH_BY_KEY = Object.fromEntries(BRANCHES.map(b => [b.key, b]));
const BRANCH_BY_CODE = Object.fromEntries(BRANCHES.map(b => [b.code, b]));
const HOME_BRANCH_KEY = 'main';

// Full label for a branch key, e.g. "Trece Branch". Falls back to the raw key.
const branchName = (k) => (BRANCH_BY_KEY[k] && BRANCH_BY_KEY[k].name) || (k || '—');
// Short label for chips/badges, e.g. "Trece".
const branchShort = (k) => (BRANCH_BY_KEY[k] && BRANCH_BY_KEY[k].short) || (k || '—');
const branchCode = (k) => (BRANCH_BY_KEY[k] && BRANCH_BY_KEY[k].code) || '';

// Build <option> markup for a branch <select>.
//  sel   — the currently-selected branch key
//  opts.all       — include a leading "All branches" option (value "")
//  opts.allLabel  — label for that option (default "All branches")
//  opts.placeholder — leading disabled "— choose —" option (value "")
function branchOptionsHtml(sel, opts = {}) {
  const escv = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let html = '';
  if (opts.placeholder) html += `<option value="" ${!sel ? 'selected' : ''} disabled>${escv(opts.placeholder)}</option>`;
  if (opts.all) html += `<option value="" ${!sel ? 'selected' : ''}>${escv(opts.allLabel || 'All branches')}</option>`;
  // translate="no": branch names are Filipino proper nouns — keep Google Translate from mangling them
  html += BRANCHES.map(b => `<option value="${b.key}" translate="no" class="notranslate" ${b.key === sel ? 'selected' : ''}>${escv(b.name)}</option>`).join('');
  return html;
}
