import express from 'express';
import { criarApi } from './api';
import { verificarInatividade } from './estado';
import type { SnapshotStore, SnapshotTransaction } from './cloudStore';

// O domínio original é síncrono e usa estado de módulo. Serializamos a hidratação
// dentro da instância; FOR UPDATE serializa a mesma operação entre instâncias.
let tail: Promise<void> = Promise.resolve();
let waiting = 0;

export function createCloudApp(store: SnapshotStore) {
  const api = criarApi({ statePath: null, cloud: true, autoConnect: true, storage: 'supabase' });
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));
  app.use(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (waiting >= 128) { res.status(503).json({ erro: 'ocupado', mensagem: 'Tente novamente em instantes.' }); return; }
    waiting++;
    const previous = tail;
    let unlock!: () => void;
    tail = new Promise<void>(resolve => { unlock = resolve; });
    await previous;
    let tx: SnapshotTransaction | undefined;
    const originalEnd = res.end.bind(res);
    const originalWrite = res.write.bind(res);
    const chunks: Buffer[] = [];
    let length = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stage = 'database';
    try {
      tx = await store.begin();
      stage = 'hydrate';
      api.importSnapshot(tx.snapshot as Parameters<typeof api.importSnapshot>[0]);
      verificarInatividade();
      stage = 'route';
      await new Promise<void>((resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Request timeout')), 15_000);
        const capture = (chunk: unknown, encoding?: BufferEncoding) => {
          if (chunk !== undefined && chunk !== null) {
            const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), encoding);
            length += bytes.length;
            if (length > 2 * 1024 * 1024) throw new Error('Response too large');
            chunks.push(bytes);
          }
        };
        res.write = ((chunk: unknown, encoding?: BufferEncoding, callback?: () => void) => {
          try { capture(chunk, typeof encoding === 'string' ? encoding : undefined); callback?.(); return true; }
          catch (error) { reject(error); return false; }
        }) as typeof res.write;
        res.end = ((chunk?: unknown, encoding?: BufferEncoding) => {
          try { capture(chunk, typeof encoding === 'string' ? encoding : undefined); resolve(); } catch (error) { reject(error); }
          return res;
        }) as typeof res.end;
        api.app(req, res, () => { res.status(404).json({ erro: 'nao_encontrado' }); });
      });
      if (timer) clearTimeout(timer);
      stage = 'commit';
      if (res.statusCode >= 500) await tx.rollback();
      else await tx.commit(api.exportSnapshot());
      res.write = originalWrite;
      res.end = originalEnd;
      // Nenhum recibo HTTP é enviado antes do commit durável.
      originalEnd(Buffer.concat(chunks));
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'INTERNAL';
      console.error('Demo transaction failed', stage, /^[A-Z0-9_]{1,80}$/.test(code) ? code : 'INTERNAL');
      if (timer) clearTimeout(timer);
      await tx?.rollback().catch(() => {});
      res.write = originalWrite;
      res.end = originalEnd;
      res.removeHeader('Content-Length');
      if (!res.destroyed) res.status(503).json({ erro: 'persistencia_indisponivel', mensagem: 'Não foi possível salvar agora. Tente novamente.' });
    } finally { waiting--; unlock(); }
  });
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 500;
    res.status(status === 413 ? 413 : 400).json({ erro: 'dados_invalidos' });
  });
  return app;
}
