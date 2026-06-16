import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const FIELD_ALIASES = {
  name:     ['name', 'full name', 'fullname', 'recruiter', 'contact'],
  email:    ['email', 'e-mail', 'mail', 'email address'],
  company:  ['company', 'organization', 'organisation', 'employer'],
  role:     ['role', 'title', 'position', 'designation', 'job title'],
  linkedin: ['linkedin', 'linkedin url', 'linkedin profile', 'profile'],
};

function normalizeKey(raw) {
  return String(raw || '').trim().toLowerCase();
}

function mapRow(row) {
  const out = { name: '', email: '', company: '', role: '', linkedin: '', extra: {} };
  const used = new Set();

  for (const [canonical, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const key of Object.keys(row)) {
      const k = normalizeKey(key);
      if (aliases.includes(k) && !out[canonical]) {
        out[canonical] = String(row[key] ?? '').trim();
        used.add(key);
        break;
      }
    }
  }

  for (const key of Object.keys(row)) {
    if (!used.has(key)) out.extra[key] = row[key];
  }
  return out;
}

function isValid(lead) {
  return lead.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email);
}

export function parseCsv(buffer) {
  const text = buffer.toString('utf8');
  const { data, errors } = Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
  if (errors.length) {
    const fatal = errors.find((e) => e.type === 'Delimiter' || e.type === 'Quotes');
    if (fatal) throw new Error(`CSV parse error: ${fatal.message}`);
  }
  return data.map(mapRow);
}

export function parseXlsx(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return rows.map(mapRow);
}

export function parseFile(filename, buffer) {
  const ext = filename.toLowerCase().split('.').pop();
  let leads = [];
  if (ext === 'csv' || ext === 'tsv' || ext === 'txt') leads = parseCsv(buffer);
  else if (ext === 'xlsx' || ext === 'xls') leads = parseXlsx(buffer);
  else throw new Error(`Unsupported file type: .${ext}`);

  const valid = leads.filter(isValid);
  const skipped = leads.length - valid.length;
  return { leads: valid, total: leads.length, skipped };
}
