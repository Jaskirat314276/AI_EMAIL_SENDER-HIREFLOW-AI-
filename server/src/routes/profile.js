import express from 'express';
import { getProfile, updateProfile } from '../services/profile.js';
import { currentUser } from '../lib/auth.js';

const router = express.Router();

router.get('/', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Connect Gmail first at /auth/google' });
  res.json({ profile: getProfile(user.id) });
});

router.put('/', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Connect Gmail first at /auth/google' });
  const patch = req.body || {};
  const profile = updateProfile(user.id, patch);
  res.json({ ok: true, profile });
});

export default router;
