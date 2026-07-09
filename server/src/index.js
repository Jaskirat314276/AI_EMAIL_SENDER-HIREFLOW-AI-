import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import './db.js';
import authRouter from './routes/auth.js';
import profileRouter from './routes/profile.js';
import uploadRouter from './routes/upload.js';
import recipientsRouter from './routes/recipients.js';
import generateRouter from './routes/generate.js';
import sendRouter from './routes/send.js';
import trackerRouter from './routes/tracker.js';
import { startWorker } from './services/worker.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

app.get('/health', (req, res) => res.json({ ok: true, service: 'hireflow-server' }));

app.use('/auth', authRouter);
app.use('/profile', profileRouter);
app.use('/upload', uploadRouter);
app.use('/recipients', recipientsRouter);
app.use('/send', sendRouter);
app.use('/tracker', trackerRouter);
app.use('/', generateRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal error' });
});

app.listen(PORT, () => {
  console.log(`hireflow-server listening on http://localhost:${PORT}`);
  startWorker();
});
