// Mail-merge template renderer. Same content every send, only placeholders swapped.
// Supported placeholders: {{name}} {{first_name}} {{last_name}} {{email}} {{company}}
//   {{role}} (contact's own job title) {{apply_role}} (the role being applied for)
//   {{contact_title}} / {{designation}} / {{contact_type}} (contact designation) {{linkedin}}

// Strip a leading honorific so "Ms. Neha Agarwal" → first_name "Neha", last_name "Agarwal".
const HONORIFICS = new Set(['mr', 'mrs', 'ms', 'miss', 'mx', 'dr', 'prof', 'sir', 'madam']);
function nameParts(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1 && HONORIFICS.has(parts[0].toLowerCase().replace(/[.,]/g, ''))) {
    return parts.slice(1);
  }
  return parts;
}

function firstName(full) {
  const parts = nameParts(full);
  if (!parts.length) return '';
  // A leading initial (e.g. "R Murali") makes "Hi R," read wrong — greet with the full name.
  if (parts[0].replace(/\./g, '').length <= 1 && parts.length > 1) {
    return parts.join(' ');
  }
  return parts[0];
}

function lastName(full) {
  const parts = nameParts(full);
  return parts.length > 1 ? parts.slice(1).join(' ') : '';
}

function buildVars(recipient) {
  const name = (recipient.name || '').trim();
  const contactType = (recipient.contact_type || '').trim();
  return {
    name: name || 'there',
    first_name: firstName(name) || 'there',
    last_name: lastName(name),
    email: recipient.email || '',
    company: (recipient.company || '').trim() || 'your company',
    role: (recipient.role || '').trim(),               // the contact's own job title (unchanged)
    apply_role: (recipient.apply_role || '').trim(),   // the role the sender is applying for
    contact_title: contactType,                        // contact designation (hr/recruiter/exec/…)
    designation: contactType,                          // alias of contact_title
    contact_type: contactType,                         // alias of contact_title
    linkedin: recipient.linkedin || '',
  };
}

export function substitute(template, recipient) {
  if (!template) return '';
  const vars = buildVars(recipient);
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    if (key in vars) return vars[key];
    return match; // leave unknown placeholders untouched so the user can see them
  });
}

export function renderEmail({ profile, recipient }) {
  // apply_role falls back to the profile's target_role when the recipient has no applied-for role.
  const rec = {
    ...recipient,
    apply_role: (recipient.apply_role || '').trim() || profile.target_role || '',
  };
  const subjectTpl = profile.subject_template || 'Application for the {{apply_role}} role at {{company}}';
  const bodyTpl = profile.body_template || 'Hi {{first_name}},\n\n— ' + (profile.name || '');
  return {
    subject: substitute(subjectTpl, rec),
    body: substitute(bodyTpl, rec),
  };
}

export const PLACEHOLDERS = ['name', 'first_name', 'last_name', 'email', 'company', 'role', 'apply_role', 'contact_title', 'designation', 'contact_type', 'linkedin'];
