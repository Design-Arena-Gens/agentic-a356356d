import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

// In-memory job store for demo
const jobs = new Map<string, { status: 'queued' | 'processing' | 'completed' | 'failed'; url?: string; error?: string }>();

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const prompt = String(body?.prompt ?? '').slice(0, 500);
  const duration = Math.min(20, Math.max(2, Number(body?.duration ?? 8)));
  const aspectRatio = (body?.aspectRatio ?? '16:9') as '16:9' | '9:16' | '1:1' | '4:3';

  if (!prompt || prompt.length < 5) {
    return Response.json({ error: 'Prompt too short' }, { status: 400 });
  }

  const jobId = randomUUID();
  jobs.set(jobId, { status: 'queued' });

  // Mock: simulate processing asynchronously (no watermark). Replace with real provider logic if available.
  void (async () => {
    try {
      jobs.set(jobId, { status: 'processing' });
      await sleep(1200 + Math.random() * 1500);

      // Provide a public domain sample video hosted on archive.org or a small mp4 hosted by Vercel edge assets alternative
      // For demo, we'll return an MP4 from samplelib
      const samples: Record<string, string[]> = {
        '16:9': [
          'https://files.samplelib.com/mp4/sample-5s.mp4',
          'https://files.samplelib.com/mp4/sample-10s.mp4'
        ],
        '9:16': [
          'https://cdn.coverr.co/videos/coverr-surfing-at-sunset-1767/1080p.mp4',
        ],
        '1:1': [
          'https://files.samplelib.com/mp4/sample-10s.mp4'
        ],
        '4:3': [
          'https://files.samplelib.com/mp4/sample-5s.mp4'
        ],
      };
      const list = samples[aspectRatio] ?? samples['16:9'];
      const url = list[Math.floor(Math.random() * list.length)];
      jobs.set(jobId, { status: 'completed', url });
    } catch (e: any) {
      jobs.set(jobId, { status: 'failed', error: e?.message ?? 'Unknown error' });
    }
  })();

  return Response.json({ jobId, status: 'queued' });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');
  if (!jobId) return Response.json({ error: 'Missing jobId' }, { status: 400 });
  const job = jobs.get(jobId);
  if (!job) return Response.json({ status: 'failed', error: 'Job not found' }, { status: 404 });
  return Response.json(job);
}
