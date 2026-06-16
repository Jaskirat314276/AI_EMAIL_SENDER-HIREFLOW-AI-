// Mail-merge template renderer. Same content every send, only placeholders swapped.
// Supported placeholders: {{name}} {{first_name}} {{last_name}} {{email}} {{company}} {{role}} {{linkedin}}

function firstName(full) {
  if (!full) return '';
  return String(full).trim().split(/\s+/)[0];
}

function lastName(full) {
  if (!full) return '';
  const parts = String(full).trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(' ') : '';
}

function buildVars(recipient) {
  const name = (recipient.name || '').trim();
  return {
    name: name || 'there',
    first_name: firstName(name) || 'there',
    last_name: lastName(name),
    email: recipient.email || '',
    company: (recipient.company || '').trim() || 'your company',
    role: (recipient.role || '').trim(),
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
  const subjectTpl = profile.subject_template || 'Application for {{company}}';
  const bodyTpl = profile.body_template || 'Hi {{first_name}},\n\n— ' + (profile.name || '');
  return {
    subject: substitute(subjectTpl, recipient),
    body: substitute(bodyTpl, recipient),
  };
}

export const PLACEHOLDERS = ['name', 'first_name', 'last_name', 'email', 'company', 'role', 'linkedin'];
