import { randomBytes, timingSafeEqual } from 'node:crypto';
import { ErroDominio } from './estado';
export type LiaJob = { id: string; pacienteId: string; session: string; text: string; context: string; locale: string; expires: number; lease?: string; leasedUntil?: number; result?: unknown; failed?: boolean };
export type LiaRelayState = { heartbeat: number; jobs: LiaJob[] };
export function relayAuth(header: string | undefined) {
  const expected = process.env.ONCOFLOW_LIA_WORKER_TOKEN;
  if (!expected || expected.length < 32 || !header || Buffer.byteLength(header) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(header), Buffer.from(expected))) throw new ErroDominio(401, 'worker_invalido', 'Conexão da Lia não autorizada.');
}
export function relayPrune(state: LiaRelayState, now: number) { state.jobs = state.jobs.filter(j => j.expires > now); }
export function relayCreate(state: LiaRelayState, now: number, input: Omit<LiaJob, 'id' | 'expires'>) {
  relayPrune(state, now);
  if (state.heartbeat < now - 110_000) throw new ErroDominio(503, 'lia_desconectada', 'O computador da Lia está desconectado. Tente novamente em instantes.');
  if (state.jobs.filter(j => !j.result && !j.failed).length >= 8 || state.jobs.filter(j => j.session === input.session).length >= 20) throw new ErroDominio(429, 'lia_ocupada', 'A Lia está ocupada. Tente novamente em instantes.');
  const job: LiaJob = { ...input, id: `turn-${randomBytes(18).toString('base64url')}`, expires: now + 180_000 };
  state.jobs.push(job); return job;
}
export function relayClaim(state: LiaRelayState, now: number) {
  relayPrune(state, now); state.heartbeat = now;
  const job = state.jobs.find(j => !j.result && !j.failed && (!j.leasedUntil || j.leasedUntil < now));
  if (!job) return null;
  job.lease = randomBytes(18).toString('base64url'); job.leasedUntil = now + 100_000;
  return { id: job.id, lease: job.lease, text: job.text, context: job.context, locale: job.locale };
}
