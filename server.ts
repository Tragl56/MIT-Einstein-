import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { criarApi } from './server/api';
import { pacienteDaSessao, verificarInatividade, ErroDominio } from './server/estado';
import { tr } from './src/idioma';
import { hostDoServidor, limitarTaxa, validarAudio } from './server/seguranca';

dotenv.config();

async function startServer() {
  const { app, persist } = criarApi();
  const PORT = Number(process.env.PORT) || 3000;

  // Só a transcrição recebe corpo grande (áudio em base64); o resto da API tem limite de 256 kB.
  const corpoAudio = express.json({ limit: '12mb' });
  const sessaoDa = (req: express.Request) => req.header('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  // Cada transcrição custa uma chamada ao fornecedor: limite por origem para conter abuso de custo
  // (por sessão não serviria, pois quem abusa pode trocar o token a cada pedido).
  const limiteTranscricao = limitarTaxa('transcricao', 12, 60_000, req => req.socket.remoteAddress ?? '?');

  // Inicialização centralizada do SDK @google/genai no servidor (usado só para transcrever áudio)
  let aiClient: GoogleGenAI | null = null;
  const getAiClient = (): GoogleGenAI => {
    if (!aiClient) {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY || '',
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
    }
    return aiClient;
  };

  // /api/health fica em server/api.ts e não informa se há chave de fornecedor configurada.

  // Transcrição do áudio do paciente (fala para a Lia ou check-in por voz). Vem do IRIS.
  // O áudio não é guardado: só a transcrição volta para o app, que mostra "Entendi: ..." antes
  // de qualquer ação.
  app.post('/api/transcrever-audio', limiteTranscricao, corpoAudio, async (req, res) => {
    let cleanMimeType: string;
    try {
      pacienteDaSessao(sessaoDa(req));
      cleanMimeType = validarAudio(req.body?.audioBase64, req.body?.mimeType);
    } catch (err) {
      const erro = err as ErroDominio;
      return res.status(erro.status ?? 400).json({ error: erro.message, sucesso: false });
    }
    const { audioBase64 } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: tr('Transcrição indisponível: chave do Gemini não configurada', 'Transcription unavailable: Gemini key not configured'), sucesso: false });
    }

    const ai = getAiClient();
    const contents = [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: cleanMimeType, data: audioBase64 } },
          {
            text: tr('Transcreva o áudio a seguir em português do Brasil. Retorne apenas o texto transcrito, sem nenhum comentário adicional, sem formatação, sem aspas.', 'Transcribe the following audio in US English. Return only the transcribed text, with no extra comments, no formatting and no quotes.'),
          },
        ],
      },
    ];

    try {
      let response;
      try {
        // Modelo especializado em transcrição de áudio estático
        response = await ai.models.generateContent({ model: 'gemini-3.5-transcribe', contents });
      } catch {
        // Fallback para modelo multimodal padrão se o modelo de transcrição não estiver disponível
        response = await ai.models.generateContent({ model: 'gemini-3.8-flash', contents });
      }
      const transcricao = (response.text || '').trim().replace(/^["']|["']$/g, '');
      return res.json({ transcricao, sucesso: true });
    } catch (apiErr: any) {
      console.error(tr('Erro na transcrição de áudio via Gemini API:', 'Gemini audio transcription failed:'), apiErr?.message);
      return res.status(502).json({ error: tr('Falha ao transcrever áudio', 'Failed to transcribe audio'), sucesso: false });
    }
  });

  // Herdado do IRIS: depois de N minutos sem atividade do profissional, a Lia volta a atender.
  setInterval(() => { verificarInatividade(); persist(); }, 30_000).unref();

  // The built mobile experience can be served alongside Pro on the private demo network.
  // This path is server configuration, never supplied by a patient request.
  const patientWebPath = path.resolve(process.env.ONCOFLOW_PATIENT_WEB_DIR || '../oncoflow-patient/dist');
  app.use('/app', express.static(patientWebPath));
  app.get(['/app', '/app/*'], (_req, res) => res.sendFile(path.join(patientWebPath, 'index.html')));

  // Vite middleware for development vs Static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Por padrão só este computador acessa. Para o celular na mesma rede: ONCOFLOW_REDE_LOCAL=true.
  const HOST = hostDoServidor();
  app.listen(PORT, HOST, () => {
    console.log(`OncoFlow listening on ${HOST}:${PORT}${HOST === '127.0.0.1' ? ' (only this computer)' : ' (local network)'}`);
  });
}

startServer();
