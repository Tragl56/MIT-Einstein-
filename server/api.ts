import express from 'express';
import { criarRotas } from './rotas';
import { criarIntegracaoMobile, type MobileOptions } from './mobile';
import { unwrapApiPath } from './apiPath';
import { tr } from '../src/idioma';
import { cabecalhosSeguranca, doProprioComputador, limitarTaxa, protegerRotasLocais } from './seguranca';

/** Actual Express API, also mounted unchanged by HTTP integration tests. */
export function criarApi(options: MobileOptions = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cabecalhosSeguranca);
  // Na nuvem o acesso passa pela proteção do provedor; localmente, o Pro e a sessão fixa da demo
  // ficam restritos a este computador mesmo se o servidor for aberto na rede para o celular.
  if (!options.cloud) {
    app.use(protegerRotasLocais);
    // Limites por origem só no servidor local: na nuvem todos chegariam pelo mesmo proxy, e a rota
    // móvel já tem limites próprios. O app do paciente consulta a API com frequência (~230/min ao
    // abrir), por isso o limite geral vale para aparelhos da rede, não para este computador.
    const porIp = (req: express.Request) => req.socket.remoteAddress ?? '?';
    const limiteRede = limitarTaxa('api', 1200, 60_000, porIp);
    app.use('/api', (req, res, next) => (doProprioComputador(req) ? next() : limiteRede(req, res, next)));
    const limiteDemo = limitarTaxa('demo', 20, 60_000, porIp);
    app.use('/api/demo', (req, res, next) => (req.method === 'POST' ? limiteDemo(req, res, next) : next()));
    app.use('/api/paciente/conversa', limitarTaxa('lia-texto', 30, 60_000, porIp));
  }
  app.use((req, _res, next) => {
    try { req.url = unwrapApiPath(req.url); next(); } catch (error) { next(error); }
  });
  const allowed = new Set(['https://localhost', 'http://localhost', 'capacitor://localhost', ...(process.env.ONCOFLOW_ALLOWED_ORIGINS ?? '').split(',').map(x => x.trim()).filter(Boolean)]);
  app.use((req, res, next) => {
    const origin = req.header('origin');
    if (origin && allowed.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type,Idempotency-Key,x-demo-usuario');
    }
    if (req.method === 'OPTIONS') { res.sendStatus(origin && !allowed.has(origin) ? 403 : 204); return; }
    next();
  });
  app.get('/api/health', (_req, res) => { res.setHeader('Cache-Control', 'no-store'); res.json({ status: 'ok', service: 'OncoFlow', demo: true, ready: true, storage: options.storage ?? (options.cloud ? 'redis' : 'local') }); });
  const json = express.json({ limit: '256kb' });
  // The cloud entrypoint parses the bounded body BEFORE entering its state transaction.
  app.use((req, res, next) => options.cloud || req.path === '/api/transcrever-audio' ? next() : json(req, res, next));
  const mobile = criarIntegracaoMobile(options);
  app.use(mobile.router);
  app.use(criarRotas());
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // Never echo submitted text, tokens, codes or exception details.
    const status = error && typeof error === 'object' && 'status' in error && typeof error.status === 'number' ? error.status : 500;
    res.status(status >= 400 && status < 600 ? status : 500).json({ erro: 'erro_api', mensagem: status === 500 ? tr('Falha ao salvar ou processar a demonstração.', 'Could not save or process the demo.') : tr('Requisição inválida.', 'Invalid request.') });
  });
  return { app, ...mobile };
}
