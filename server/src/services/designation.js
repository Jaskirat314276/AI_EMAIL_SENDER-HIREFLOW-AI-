// Deterministic contact-designation classifier. Output is stored on
// `recipients.contact_type`; provenance on `recipients.designation_source`.
// (The Groq LLM fallback is deferred — classifyBatch never invokes it this round.)

export const ENUM = ['hr', 'recruiter', 'exec', 'founder', 'other'];

// Email local-part tokens -> label. Order = priority (founder/exec before recruiter).
const LOCALPART_RULES = [
  [/(^|[._-])(founder|cofounder|co-founder)([._-]|$)/,             'founder'],
  [/(^|[._-])(ceo|owner|president|proprietor)([._-]|$)/,           'founder'],
  [/(^|[._-])(cto|coo|cfo|vp|chief|head)([._-]|$)/,                'exec'],
  [/(^|[._-])(hr|humanresources|people|peopleops|hrbp)([._-]|$)/,  'hr'],
  [/(^|[._-])(recruit|recruiting|recruiter|talent|ta|careers|jobs|hiring)([._-]|$)/, 'recruiter'],
];

// Contact-title keyword dictionaries (extendable via config.extra_rules).
const TITLE_RULES = {
  founder:   ['founder', 'co-founder', 'cofounder', 'ceo', 'owner', 'president', 'managing director', 'proprietor'],
  exec:      ['cto', 'coo', 'cfo', 'vp', 'vice president', 'head of', 'director', 'chief', 'partner'],
  hr:        ['hr', 'human resource', 'people ops', 'people operations', 'hrbp', 'people partner'],
  recruiter: ['recruit', 'talent acquisition', 'talent', 'sourcer', 'hiring manager', 'staffing'],
};

// Merge user-supplied extra keywords into the base dictionaries (config-driven, no code change).
function mergeRules(base, extra = {}) {
  const out = {};
  for (const k of Object.keys(base)) {
    const add = Array.isArray(extra?.[k]) ? extra[k].map((s) => String(s).toLowerCase()) : [];
    out[k] = [...base[k], ...add];
  }
  return out;
}

// Deterministic classification: explicit column hint -> contact title -> email local-part -> other.
export function classifyDesignation({ email = '', role = '', designationHint = '' } = {}, config = {}) {
  // 0. explicit column hint, if it already names an enum value.
  const hint = String(designationHint || '').trim().toLowerCase();
  if (ENUM.includes(hint)) return { designation: hint, source: 'column' };

  const rules = mergeRules(TITLE_RULES, config.extra_rules);

  // 1. contact title keywords (most reliable when present). founder/exec before hr/recruiter.
  const title = String(role || '').toLowerCase();
  for (const label of ['founder', 'exec', 'hr', 'recruiter']) {
    if (rules[label].some((kw) => title.includes(kw)))
      return { designation: label, source: 'title' };
  }

  // 2. email local-part tokens.
  const local = (String(email || '').split('@')[0] || '').toLowerCase();
  for (const [re, label] of LOCALPART_RULES) {
    if (re.test(local)) return { designation: label, source: 'email' };
  }

  // 3. give up deterministically.
  return { designation: 'other', source: 'default' };
}

// Run the deterministic classifier over parsed rows ({ email, role, designation_hint }).
// Returns index-aligned [{ designation, source }]. Deterministic only — no LLM this round.
export function classifyBatch(rows = [], config = {}) {
  return rows.map((r) =>
    classifyDesignation(
      { email: r.email, role: r.role, designationHint: r.designation_hint },
      config,
    ),
  );
}

// Opt-in Groq fallback — deferred. Intentionally NOT wired: classifyBatch never calls it.
export async function classifyDesignationLLM(/* rows */) {
  throw new Error('LLM designation fallback is not enabled this round');
}
