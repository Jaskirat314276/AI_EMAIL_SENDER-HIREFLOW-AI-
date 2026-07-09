import express from 'express';
import multer from 'multer';
import db from '../db.js';
import { parseFile } from '../services/parser.js';
import { classifyBatch, ENUM } from '../services/designation.js';
import { currentUser } from '../lib/auth.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post('/', upload.single('file'), (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Connect Gmail first at /auth/google' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded (field name: file)' });

  try {
    const parsed = parseFile(req.file.originalname, req.file.buffer);

    // Deterministic designation classification (index-aligned with parsed.leads).
    const designations = classifyBatch(parsed.leads);
    const breakdown = Object.fromEntries(ENUM.map((k) => [k, 0]));
    for (const d of designations) {
      const key = ENUM.includes(d.designation) ? d.designation : 'other';
      breakdown[key]++;
    }

    const insert = db.prepare(`
      INSERT INTO recipients
        (user_id, name, email, company, role, apply_role, linkedin, contact_type, designation_source, extra)
      VALUES
        (@user_id, @name, @email, @company, @role, @apply_role, @linkedin, @contact_type, @designation_source, @extra)
      ON CONFLICT(user_id, email) DO UPDATE SET
        name=excluded.name, company=excluded.company, role=excluded.role,
        apply_role=excluded.apply_role, linkedin=excluded.linkedin,
        -- never overwrite a human's manual designation on re-import:
        contact_type       = CASE WHEN recipients.designation_source='manual'
                                  THEN recipients.contact_type ELSE excluded.contact_type END,
        designation_source = CASE WHEN recipients.designation_source='manual'
                                  THEN 'manual' ELSE excluded.designation_source END,
        extra=excluded.extra
    `);

    const tx = db.transaction((leads, dz) => {
      let added = 0;
      for (let i = 0; i < leads.length; i++) {
        const l = leads[i];
        const d = dz[i] || { designation: 'other', source: 'default' };
        const info = insert.run({
          user_id: user.id,
          name: l.name || '',
          email: l.email,
          company: l.company || '',
          role: l.role || '',
          apply_role: l.apply_role || '',
          linkedin: l.linkedin || '',
          contact_type: d.designation || 'other',
          designation_source: d.source || 'default',
          extra: l.extra ? JSON.stringify(l.extra) : null,
        });
        if (info.changes > 0) added++;
      }
      return added;
    });

    const added = tx(parsed.leads, designations);

    // Keep tracker rows in lockstep: one application per recipient (idempotent).
    db.prepare(
      `INSERT OR IGNORE INTO applications (recipient_id) SELECT id FROM recipients WHERE user_id = ?`
    ).run(user.id);

    res.json({
      ok: true,
      filename: req.file.originalname,
      parsed: parsed.total,
      added,
      duplicates_updated: parsed.leads.length - added,
      invalid_skipped: parsed.skipped,
      designation_breakdown: breakdown,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
