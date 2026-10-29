import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import WebSocket from 'ws';
import { getCurrentUser } from '@/lib/auth';
import { assertSameOrigin, clientIp, jsonError, rateLimit } from '@/lib/server/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const SAMPLE_RATE = 16_000;

function textFromMessage(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const data = value as { payload?: { output?: { sentence?: { text?: string } }; sentence?: { text?: string }; result?: { text?: string } }; output?: { sentence?: { text?: string }; text?: string } };
  return data.payload?.output?.sentence?.text || data.payload?.sentence?.text || data.payload?.result?.text || data.output?.sentence?.text || data.output?.text || '';
}

function isSentenceEnd(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const data = value as { payload?: { output?: { sentence?: { end?: boolean } }; sentence?: { end?: boolean } }; output?: { sentence?: { end?: boolean } } };
  return Boolean(data.payload?.output?.sentence?.end || data.payload?.sentence?.end || data.output?.sentence?.end);
}

async function transcribePcm(pcm: Buffer): Promise<string> {
  const key = process.env.DASHSCOPE_API_KEY || '';
  if (!key) throw new Error('尚未配置 DASHSCOPE_API_KEY');
  const model = process.env.DASHSCOPE_ASR_MODEL || 'paraformer-realtime-v2';
  const taskId = randomUUID();
  const socket = new WebSocket('wss://dashscope.aliyuncs.com/api-ws/v1/inference/', {
    headers: { Authorization: `Bearer ${key}` },
  });
  const messages: string[] = [];
  const result = await new Promise<string>((resolve, reject) => {
    let settled = false;
    let offset = 0;
    const timer = setTimeout(() => finish(new Error('语音识别超时，请重试')), 25_000);
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { socket.close(); } catch {}
      if (error) reject(error); else resolve(messages.join(''));
    };
    socket.on('open', () => {
      socket.send(JSON.stringify({
        header: { action: 'run-task', task_id: taskId, streaming: 'duplex' },
        payload: { task_group: 'audio', task: 'asr', function: 'recognition', model, parameters: { format: 'pcm', sample_rate: SAMPLE_RATE, language_hints: ['zh'] }, input: {} },
      }));
    });
    socket.on('message', (raw, isBinary) => {
      if (isBinary) return;
      try {
        const value = JSON.parse(raw.toString());
        const text = textFromMessage(value);
        if (text && !messages.includes(text)) messages.push(text);
        if (isSentenceEnd(value) && offset >= pcm.length) {
          socket.send(JSON.stringify({ header: { action: 'finish-task', task_id: taskId, streaming: 'duplex' } }));
        }
      } catch { /* Ignore non-JSON provider frames. */ }
    });
    socket.on('error', () => finish(new Error('语音识别服务连接失败')));
    socket.on('close', () => { if (!settled) finish(); });
    const sendNext = () => {
      if (settled || socket.readyState !== WebSocket.OPEN) return;
      if (offset < pcm.length) {
        const end = Math.min(offset + 3200, pcm.length);
        socket.send(pcm.subarray(offset, end));
        offset = end;
        setTimeout(sendNext, 20);
      } else {
        socket.send(JSON.stringify({ header: { action: 'finish-task', task_id: taskId, streaming: 'duplex' } }));
      }
    };
    socket.on('open', () => setTimeout(sendNext, 80));
  });
  return result.trim();
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
    rateLimit(`speech:${user.id}:${clientIp(request)}`, 10, 60_000);
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('audio/pcm') && !contentType.includes('application/octet-stream')) throw new Error('语音数据格式不支持');
    const body = Buffer.from(await request.arrayBuffer());
    if (!body.length || body.length > MAX_AUDIO_BYTES) throw new Error('语音长度或大小不合适');
    const text = await transcribePcm(body);
    if (!text) throw new Error('没有识别到语音内容，请再试一次');
    return NextResponse.json({ text, provider: 'dashscope', model: process.env.DASHSCOPE_ASR_MODEL || 'paraformer-realtime-v2' });
  } catch (error) {
    return jsonError(error);
  }
}
