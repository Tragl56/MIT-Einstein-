import express from 'express';
import { postgresSnapshotStore } from './cloudStore';
import { createCloudApp } from './cloudGateway';

const app = express();
let handler: ReturnType<typeof createCloudApp> | undefined;
app.use((req, res, next) => {
  if (!process.env.DATABASE_URL) { res.status(503).json({ erro: 'banco_nao_configurado' }); return; }
  try {
    handler ??= createCloudApp(postgresSnapshotStore(process.env.DATABASE_URL));
    handler(req, res, next);
  } catch { res.status(503).json({ erro: 'servico_indisponivel' }); }
});
export default app;
