import db from '../db.js';
import { DEFAULT_PROFILE } from '../lib/profile-seed.js';

const SELECT = `SELECT * FROM profiles WHERE user_id = ?`;
const INSERT = `
  INSERT INTO profiles (user_id, name, email, phone, location, target_role, summary,
    skills_json, experience_json, projects_json, links_json,
    subject_template, body_template, updated_at)
  VALUES (@user_id, @name, @email, @phone, @location, @target_role, @summary,
    @skills_json, @experience_json, @projects_json, @links_json,
    @subject_template, @body_template, datetime('now'))
`;
const UPDATE = `
  UPDATE profiles SET
    name=@name, email=@email, phone=@phone, location=@location, target_role=@target_role,
    summary=@summary, skills_json=@skills_json, experience_json=@experience_json,
    projects_json=@projects_json, links_json=@links_json,
    subject_template=@subject_template, body_template=@body_template,
    updated_at=datetime('now')
  WHERE user_id=@user_id
`;

function row2profile(row) {
  if (!row) return null;
  return {
    name: row.name,
    email: row.email,
    phone: row.phone,
    location: row.location,
    target_role: row.target_role,
    summary: row.summary,
    skills: row.skills_json ? JSON.parse(row.skills_json) : [],
    experience: row.experience_json ? JSON.parse(row.experience_json) : [],
    projects: row.projects_json ? JSON.parse(row.projects_json) : [],
    links: row.links_json ? JSON.parse(row.links_json) : {},
    subject_template: row.subject_template || '',
    body_template: row.body_template || '',
    updated_at: row.updated_at,
  };
}

function profile2row(userId, p) {
  return {
    user_id: userId,
    name: p.name || '',
    email: p.email || '',
    phone: p.phone || '',
    location: p.location || '',
    target_role: p.target_role || '',
    summary: p.summary || '',
    skills_json: JSON.stringify(p.skills || []),
    experience_json: JSON.stringify(p.experience || []),
    projects_json: JSON.stringify(p.projects || []),
    links_json: JSON.stringify(p.links || {}),
    subject_template: p.subject_template || '',
    body_template: p.body_template || '',
  };
}

export function getProfile(userId) {
  let row = db.prepare(SELECT).get(userId);
  if (!row) {
    db.prepare(INSERT).run(profile2row(userId, DEFAULT_PROFILE));
    row = db.prepare(SELECT).get(userId);
  }
  // Backfill template fields for profiles created before templates existed
  if (!row.subject_template || !row.body_template) {
    db.prepare(`
      UPDATE profiles
      SET subject_template = COALESCE(NULLIF(subject_template, ''), ?),
          body_template    = COALESCE(NULLIF(body_template, ''), ?)
      WHERE user_id = ?
    `).run(DEFAULT_PROFILE.subject_template, DEFAULT_PROFILE.body_template, userId);
    row = db.prepare(SELECT).get(userId);
  }
  return row2profile(row);
}

export function updateProfile(userId, patch) {
  const current = getProfile(userId);
  const merged = { ...current, ...patch };
  db.prepare(UPDATE).run(profile2row(userId, merged));
  return getProfile(userId);
}
