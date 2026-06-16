import express from 'express';
import multer from 'multer';
import db from '../db.js';
import { parseFile } from '../services/parser.js';
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

    const insert = db.prepare(`
      INSERT INTO recipients (user_id, name, email, company, role, linkedin, extra)
      VALUES (@user_id, @name, @email, @company, @role, @linkedin, @extra)
      ON CONFLICT(user_id, email) DO UPDATE SET
        name=excluded.name, company=excluded.company, role=excluded.role,
        linkedin=excluded.linkedin, extra=excluded.extra
    `);

    const tx = db.transaction((leads) => {
      let added = 0;
      for (const l of leads) {
        const info = insert.run({
          user_id: user.id,
          name: l.name || '',
          email: l.email,
          company: l.company || '',
          role: l.role || '',
          linkedin: l.linkedin || '',
          extra: l.extra ? JSON.stringify(l.extra) : null,
        });
        if (info.changes > 0) added++;
      }
      return added;
    });

    const added = tx(parsed.leads);

    res.json({
      ok: true,
      filename: req.file.originalname,
      parsed: parsed.total,
      added,
      duplicates_updated: parsed.leads.length - added,
      invalid_skipped: parsed.skipped,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
