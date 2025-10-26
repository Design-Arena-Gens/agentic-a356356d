"use client";

import { useEffect, useMemo, useRef, useState } from 'react';

type JobStatus = 'idle' | 'queued' | 'processing' | 'completed' | 'failed' | 'canceled';

type GenerationRequest = {
  prompt: string;
  duration: number; // seconds
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3';
  seed?: number | null;
};

type GenerationResponse = {
  jobId: string;
  status: JobStatus;
};

type JobResult = {
  status: JobStatus;
  url?: string;
  error?: string;
};

export default function HomePage() {
  const [prompt, setPrompt] = useState('a serene coastal town at golden hour, cinematic, ultra-detailed');
  const [duration, setDuration] = useState(8);
  const [aspect, setAspect] = useState<GenerationRequest['aspectRatio']>('16:9');
  const [seed, setSeed] = useState<number | ''>('' as any);

  const [job, setJob] = useState<GenerationResponse | null>(null);
  const [result, setResult] = useState<JobResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return prompt.trim().length > 4 && duration >= 2 && duration <= 20 && !submitting;
  }, [prompt, duration, submitting]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, duration, aspectRatio: aspect, seed: seed === '' ? null : Number(seed) }),
      });
      const data: GenerationResponse = await res.json();
      setJob(data);
    } catch (err: any) {
      setResult({ status: 'failed', error: err?.message ?? 'Request failed' });
    } finally {
      setSubmitting(false);
    }
  }

  // polling
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const jid = job?.jobId;
    if (!jid) return;

    async function poll(currentJobId: string) {
      try {
        const r = await fetch(`/api/generate?jobId=${encodeURIComponent(currentJobId)}`);
        const d: JobResult = await r.json();
        setResult(d);
        if (d.status === 'completed' || d.status === 'failed' || d.status === 'canceled') {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch (e) {
        // ignore transient errors
      }
    }

    poll(jid);
    pollRef.current = setInterval(() => poll(jid), 1500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [job?.jobId]);

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 40 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.svg" width={32} height={32} alt="logo"/>
          <strong style={{ fontSize: 18 }}>Sora 2 Free</strong>
          <span className="badge">No watermark · Unrestricted UI</span>
        </div>
        <a className="badge" href="https://vercel.com" target="_blank" rel="noreferrer">Deploy on Vercel</a>
      </header>

      <main className="card" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 20 }}>
        <section>
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
            <label>
              <div style={{ marginBottom: 6, fontWeight: 600 }}>Prompt</div>
              <textarea
                className="input"
                rows={5}
                placeholder="Describe the video you want..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <label>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Duration (2–20s)</div>
                <input
                  className="input"
                  type="number"
                  min={2}
                  max={20}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
              </label>

              <label>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Aspect</div>
                <select className="input" value={aspect} onChange={(e) => setAspect(e.target.value as any)}>
                  <option>16:9</option>
                  <option>9:16</option>
                  <option>1:1</option>
                  <option>4:3</option>
                </select>
              </label>

              <label>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Seed (optional)</div>
                <input
                  className="input"
                  type="number"
                  placeholder="random"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </label>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="button" type="submit" disabled={!canSubmit}>Generate</button>
              <button className="button" type="button" style={{ background: '#0ea5e9' }} onClick={() => { setJob(null); setResult(null); }}>Reset</button>
            </div>
          </form>
        </section>

        <section style={{ display: 'grid', gap: 12 }}>
          <div style={{ fontWeight: 700 }}>Output</div>
          <div className="card" style={{ padding: 0, overflow: 'hidden', aspectRatio: aspect === '9:16' ? '9 / 16' : aspect === '1:1' ? '1 / 1' : aspect === '4:3' ? '4 / 3' : '16 / 9' }}>
            {result?.status === 'completed' && result.url ? (
              <video src={result.url} controls autoPlay style={{ width: '100%', height: '100%', display: 'block' }} />
            ) : (
              <div style={{ padding: 16, display: 'grid', placeItems: 'center', height: '100%', color: '#64748b' }}>
                {job?.status === 'processing' || job?.status === 'queued' ? 'Generating...' : 'Your video will appear here'}
              </div>
            )}
          </div>

          {result?.status === 'failed' && (
            <div className="card" style={{ borderColor: '#fecaca', color: '#991b1b', background: '#fef2f2' }}>
              {result.error ?? 'Generation failed'}
            </div>
          )}

          {result?.status === 'completed' && result.url && (
            <div style={{ display: 'flex', gap: 10 }}>
              <a className="button" href={result.url!} download>Download MP4</a>
              <button className="button" style={{ background: '#10b981' }} onClick={() => navigator.clipboard.writeText(result!.url!)}>Copy Link</button>
            </div>
          )}
        </section>
      </main>

      <footer style={{ marginTop: 16 }} className="footer">
        This UI is for educational use. No provider keys required; mock videos are generated when not configured.
      </footer>
    </div>
  );
}
