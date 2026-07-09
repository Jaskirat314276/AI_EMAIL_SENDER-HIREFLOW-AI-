import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Tiered aliases. STRONG = unambiguous, matched first by exact normalized-header
// equality. GENERIC = ambiguous (role vs apply_role vs linkedin), resolved in a
// second pass by value sniffing.
const STRONG_ALIASES = {
  email:      ['email', 'e-mail', 'mail', 'email address', 'contact email'],
  name:       ['name', 'full name', 'fullname', 'contact', 'contact name', 'recruiter name',
               'admin name', 'hr name', 'contact person', 'poc', 'point of contact', 'recruiter'],
  company:    ['company', 'organization', 'organisation', 'employer', 'company name'],
  linkedin:   ['linkedin', 'linkedin url', 'linkedin profile', 'li url'],
  apply_role: ['applying for', 'apply for', 'applied for', 'role applied', 'applied role',
               'role applying', 'applying role', 'position applied', 'applied position',
               'applying position', 'target role', 'job applied', 'job applied for',
               'applied for role', 'apply role', 'role i am applying', "role i'm applying",
               'opening applied', 'profile applied', 'applied profile', 'desired role'],
  role:       ['designation', 'job title', 'job tittle', 'jobtitle', 'contact title', 'contact designation',
               'their title', 'their role', 'recruiter title', 'hr title', 'seniority'],
  designation:['designation type', 'category', 'contact type', 'persona'], // explicit hint column, optional
};

// Ambiguous headers — resolved by sniffColumn in detectColumns pass 2.
const GENERIC_ALIASES = {
  role_or_apply: ['role', 'position', 'title', 'job role', 'job', 'profile'],
  linkedin:      ['profile url', 'url'],
};

const LINKEDIN_RE = /linkedin\.com\/(in|pub)\//i;
const TITLE_TOKENS = ['ceo', 'cto', 'coo', 'cfo', 'founder', 'co-founder', 'cofounder', 'president',
  'director', 'head', 'vp', 'vice president', 'manager', 'recruiter', 'talent', 'hr', 'human resource',
  'people', 'engineer', 'lead', 'chief', 'partner', 'associate', 'sourcer'];

function normalizeKey(raw) {
  return String(raw || '').trim().toLowerCase();
}

// Deterministic value inspection: disentangles a generic role/position/profile column
// that could be the contact's own title, a LinkedIn URL, or the role being applied for.
function sniffColumn(headerKey, vals) {
  if (!vals.length) return 'apply_role';
  const frac = (pred) => vals.filter(pred).length / vals.length;
  if (frac((v) => LINKEDIN_RE.test(v)) > 0.5) return 'linkedin';
  // Values that read like people's job titles -> the CONTACT title (role).
  if (frac((v) => TITLE_TOKENS.some((t) => v.toLowerCase().includes(t))) > 0.4) return 'role';
  // Otherwise a generic column is far more likely the role I'm applying for.
  return 'apply_role';
}

// Deterministic column detection. Never throws on ambiguity; returns a proposal.
// Order of resolution: user override -> strong alias -> value sniff -> unmapped.
export function detectColumns(headers, sampleRows = [], config = {}) {
  const norm = headers.map((h) => ({ raw: h, k: normalizeKey(h) }));
  const mapping = {};      // canonical -> raw header
  const used = new Set();
  const candidates = {};   // canonical -> [alternate raw headers] for later UI dropdowns

  // Pass 0: user overrides win outright.
  for (const [raw, canonical] of Object.entries(config.column_overrides || {})) {
    const hit = norm.find((n) => n.raw === raw && !used.has(raw));
    if (hit) { mapping[canonical] = raw; used.add(raw); }
  }

  // Pass 1: strong exact-alias matches; first match fills, later matches become candidates.
  for (const [canonical, aliases] of Object.entries(STRONG_ALIASES)) {
    for (const n of norm) {
      if (used.has(n.raw)) continue;
      if (!aliases.includes(n.k)) continue;
      if (!mapping[canonical]) { mapping[canonical] = n.raw; used.add(n.raw); }
      else candidates[canonical] = [...(candidates[canonical] || []), n.raw];
    }
  }

  // Pass 2: generic columns -> value sniffing decides role vs apply_role vs linkedin.
  for (const n of norm) {
    if (used.has(n.raw)) continue;
    if (!GENERIC_ALIASES.role_or_apply.includes(n.k) &&
        !GENERIC_ALIASES.linkedin.includes(n.k)) continue;

    const vals = sampleRows.map((r) => String(r[n.raw] ?? '').trim()).filter(Boolean);
    const kind = sniffColumn(n.k, vals);          // 'linkedin' | 'role' | 'apply_role'
    const target = mapping[kind] ? null : kind;   // don't overwrite an already-filled canonical
    if (target) { mapping[target] = n.raw; used.add(n.raw); }
    else candidates[kind] = [...(candidates[kind] || []), n.raw];
  }

  const unmapped = norm.filter((n) => !used.has(n.raw)).map((n) => n.raw);
  return { mapping, candidates, unmapped };
}

// Map one raw row through a confirmed/detected {canonical: rawHeader} mapping.
// The optional explicit `designation` column surfaces as `designation_hint`.
export function mapRowWithMapping(row, mapping) {
  const out = { name: '', email: '', company: '', role: '', apply_role: '',
                linkedin: '', designation_hint: '', extra: {} };
  const used = new Set();
  for (const [canonical, rawHeader] of Object.entries(mapping)) {
    if (rawHeader == null) continue;
    const v = String(row[rawHeader] ?? '').trim();
    if (canonical === 'designation') out.designation_hint = v;
    else out[canonical] = v;
    used.add(rawHeader);
  }
  for (const key of Object.keys(row)) if (!used.has(key)) out.extra[key] = row[key];
  return out;
}

function isValid(lead) {
  return lead.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email);
}

// Locate the real header row by skipping leading banner/blank rows (e.g. a merged
// "600+ HRs Email & Contact List" title sitting above the actual column names).
function findHeaderRow(matrix) {
  const scan = Math.min(matrix.length, 10);
  let maxCells = 0;
  for (let i = 0; i < scan; i++) {
    const n = (matrix[i] || []).filter((c) => String(c ?? '').trim() !== '').length;
    if (n > maxCells) maxCells = n;
  }
  const threshold = Math.max(2, Math.ceil(maxCells * 0.5));
  for (let i = 0; i < scan; i++) {
    const n = (matrix[i] || []).filter((c) => String(c ?? '').trim() !== '').length;
    if (n >= threshold) return i;
  }
  return 0;
}

// Turn a raw sheet matrix (array of arrays) into { headers, rows } keyed by the detected
// header row. Fully-blank rows and unnamed columns are dropped.
function matrixToRows(matrix) {
  if (!matrix || !matrix.length) return { headers: [], rows: [] };
  const h = findHeaderRow(matrix);
  const headerCells = (matrix[h] || []).map((c) => String(c ?? '').trim());
  const rows = [];
  for (let i = h + 1; i < matrix.length; i++) {
    const arr = matrix[i] || [];
    if (arr.every((c) => String(c ?? '').trim() === '')) continue;
    const obj = {};
    headerCells.forEach((key, ci) => { if (key) obj[key] = arr[ci] ?? ''; });
    rows.push(obj);
  }
  return { headers: headerCells.filter(Boolean), rows };
}

// Low-level readers return { headers, rows }; both skip a leading title/banner row so
// detectColumns sees the real column names.
export function parseCsv(buffer) {
  const text = buffer.toString('utf8');
  const { data, errors } = Papa.parse(text, { skipEmptyLines: true }); // array-of-arrays
  if (errors.length) {
    const fatal = errors.find((e) => e.type === 'Delimiter' || e.type === 'Quotes');
    if (fatal) throw new Error(`CSV parse error: ${fatal.message}`);
  }
  return matrixToRows(data);
}

export function parseXlsx(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  return matrixToRows(matrix);
}

// One-shot auto-detect parse. Signature + return shape preserved: { leads, total, skipped }.
// Now also fills `apply_role` and `designation_hint` on each lead.
export function parseFile(filename, buffer) {
  const ext = filename.toLowerCase().split('.').pop();
  let headers = [];
  let rows = [];
  if (ext === 'csv' || ext === 'tsv' || ext === 'txt') ({ headers, rows } = parseCsv(buffer));
  else if (ext === 'xlsx' || ext === 'xls') ({ headers, rows } = parseXlsx(buffer));
  else throw new Error(`Unsupported file type: .${ext}`);

  const sample = rows.slice(0, 8);
  const { mapping } = detectColumns(headers, sample);
  const leads = rows.map((r) => mapRowWithMapping(r, mapping));

  const valid = leads.filter(isValid);
  const skipped = leads.length - valid.length;
  return { leads: valid, total: leads.length, skipped };
}
