const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

function formatProfile(p) {
  const skills = (p.skills || []).slice(0, 12).join(', ');
  const exp = (p.experience || [])
    .slice(0, 2)
    .map((e) => `- ${e.title} at ${e.company} (${e.period}): ${(e.bullets || []).slice(0, 2).join(' | ')}`)
    .join('\n');
  const projects = (p.projects || [])
    .slice(0, 3)
    .map((pr) => `- ${pr.name} [${(pr.tech || []).slice(0, 5).join(', ')}]: ${pr.description}${pr.impact ? ' Impact: ' + pr.impact : ''}`)
    .join('\n');
  const portfolioUrl = p.links?.portfolio || p.links?.github || '';

  return `SENDER PROFILE
Name: ${p.name}
Target role: ${p.target_role}
Location: ${p.location || ''}
Summary: ${p.summary || ''}

Skills: ${skills}

Experience:
${exp || '(none)'}

Projects:
${projects || '(none)'}

Portfolio: ${portfolioUrl}`;
}

function buildMessages({ profile, recipient, tone }) {
  const system = `You are an expert at writing cold outreach emails. A job-seeker is writing to a recruiter to express interest in open roles at the recruiter's company. Write a personalized email for ONE specific recruiter using the sender's profile.

CRITICAL FACTS:
- "Recipient Role" is the recruiter's OWN job title. It is NEVER the role the sender wants. Do not say "interested in your <recruiter title> position".
- The sender is applying for the kind of role listed under "Target role" in the profile.
- Pick 1–2 most relevant projects from the profile (prefer ones whose tech matches what a frontend/full-stack role would care about).
- Pick 3–4 most relevant skills to mention.
- Include a measurable impact (numbers/metrics from projects or experience) when available.
- If a portfolio URL exists, include it in the body on its own line near the end.

EMAIL RULES
- Address recruiter by first name only.
- Mention the company by name once, naturally.
- Body 80–130 words. No filler ("I hope this finds you well", "Trust this email finds you...").
- Don't fabricate facts about the company; only use what's given.
- Subject: max 60 chars, MUST mention the company name OR a specific project/skill — never generic like "Full-stack Developer Role" or "Job application".
- Plain text only. No markdown.
- Sign off with sender's first name only on its own line.

RESPONSE FORMAT — use EXACTLY this format, nothing else, no markdown fences, no preamble:
SUBJECT: <one line>
BODY:
<the email body, can span multiple lines>`;

  const user = `TONE: ${tone || 'Direct'} (Direct = punchy, no fluff. Conversational = warm, casual. Bold = confident pitch.)

${formatProfile(profile)}

RECIPIENT (the recruiter)
- Name: ${recipient.name || 'Hiring Team'}
- Company: ${recipient.company || 'their company'}
- Recipient Role (their job title, NOT what sender is applying for): ${recipient.role || 'unknown'}

Write the email now in the SUBJECT/BODY format.`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

export async function generatePersonalized({ profile, recipient, tone }) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not set in .env');
  if (!profile) throw new Error('profile is required');
  if (!recipient) throw new Error('recipient is required');

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: buildMessages({ profile, recipient, tone }),
      temperature: 0.7,
      max_tokens: 700,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq returned empty content');

  return parseSubjectBody(text);
}

function parseSubjectBody(text) {
  const cleaned = text.replace(/^```(?:\w+)?\s*|\s*```\s*$/g, '').trim();
  const m = cleaned.match(/^\s*SUBJECT\s*:\s*(.+?)\s*\n+\s*BODY\s*:\s*\n?([\s\S]+)$/i);
  if (!m) throw new Error(`Could not parse SUBJECT/BODY from LLM output: ${cleaned.slice(0, 200)}`);
  const subject = m[1].trim();
  const body = m[2].trim();
  if (!subject || !body) throw new Error('Empty subject or body from LLM');
  return { subject, body };
}
