'use client';

import { useState, useRef } from 'react';
import {
  Camera,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Leaf,
  CheckCircle,
  XCircle,
  MapPin,
  FlaskConical,
  ListChecks,
  Globe,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParsedAnalysis {
  material: string;
  recyclabilityRaw: string;
  verdict: 'yes' | 'no' | 'local' | 'unknown';
  steps: string[];
  ecoFact: string;
  rawText: string;
}

// ─── Markdown Parser ──────────────────────────────────────────────────────────

function parseMarkdown(text: string): ParsedAnalysis {
  const result: ParsedAnalysis = {
    material: '',
    recyclabilityRaw: '',
    verdict: 'unknown',
    steps: [],
    ecoFact: '',
    rawText: text,
  };

  const lines = text.split('\n');
  type Section = 'material' | 'status' | 'steps' | 'fact' | null;
  let section: Section = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const lower = line.toLowerCase();

    // Detect section headers
    if (line.startsWith('#') || line.startsWith('**')) {
      if (lower.includes('identified') || lower.includes('material')) {
        section = 'material';
        continue;
      }
      if (lower.includes('recyclability') || lower.includes('status')) {
        section = 'status';
        continue;
      }
      if (lower.includes('preparation') || lower.includes('steps')) {
        section = 'steps';
        continue;
      }
      if (lower.includes('eco') || lower.includes('fact')) {
        section = 'fact';
        continue;
      }
    }

    if (!section) continue;

    // Strip markdown decoration
    const clean = line
      .replace(/^#{1,6}\s*/, '')
      .replace(/\*\*/g, '')
      .replace(/^\d+[\.\)]\s*/, '')
      .replace(/^[-*]\s*/, '')
      .trim();

    if (!clean) continue;

    switch (section) {
      case 'material':
        result.material += (result.material ? ' ' : '') + clean;
        break;
      case 'status':
        result.recyclabilityRaw += (result.recyclabilityRaw ? ' ' : '') + clean;
        break;
      case 'steps':
        result.steps.push(clean);
        break;
      case 'fact':
        result.ecoFact += (result.ecoFact ? ' ' : '') + clean;
        break;
    }
  }

  // Determine verdict
  const statusUp = result.recyclabilityRaw.toUpperCase();
  if (statusUp.includes('LOCAL RULES')) {
    result.verdict = 'local';
  } else if (/\bYES\b/.test(statusUp)) {
    result.verdict = 'yes';
  } else if (/\bNO\b/.test(statusUp)) {
    result.verdict = 'no';
  }

  // Fallback if parsing found nothing
  if (!result.material && !result.recyclabilityRaw) {
    result.material = 'Packaging item';
    result.recyclabilityRaw = text.slice(0, 200);
    result.verdict = 'unknown';
  }

  return result;
}

// ─── Verdict UI helpers ───────────────────────────────────────────────────────

const VERDICT_CONFIG = {
  yes: {
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-500/40',
    badge: 'bg-emerald-500 text-slate-950',
    icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
    label: 'Recyclable ✓',
    text: 'text-emerald-200',
  },
  no: {
    bg: 'bg-rose-950/30',
    border: 'border-rose-500/40',
    badge: 'bg-rose-500 text-white',
    icon: <XCircle className="w-5 h-5 text-rose-400" />,
    label: 'Not Recyclable ✗',
    text: 'text-rose-200',
  },
  local: {
    bg: 'bg-amber-950/30',
    border: 'border-amber-500/40',
    badge: 'bg-amber-500 text-slate-950',
    icon: <MapPin className="w-5 h-5 text-amber-400" />,
    label: 'Check Local Rules',
    text: 'text-amber-200',
  },
  unknown: {
    bg: 'bg-slate-800/50',
    border: 'border-slate-600/40',
    badge: 'bg-slate-600 text-slate-100',
    icon: <FlaskConical className="w-5 h-5 text-slate-400" />,
    label: 'See Details',
    text: 'text-slate-300',
  },
} as const;

// ─── Page Component ───────────────────────────────────────────────────────────

export default function BinSightHome() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ParsedAnalysis | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File handling ────────────────────────────────────────────────────────────

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setAnalysis(null);
    setMimeType(file.type || 'image/jpeg');

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      // Pass only the raw base64 content (strip the data: prefix)
      setBase64Data(dataUrl.split(',')[1]);
    };
    reader.onerror = () => setError('Failed to read the image file.');
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setImagePreview(null);
    setBase64Data(null);
    setAnalysis(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── AI Analysis ──────────────────────────────────────────────────────────────

  const analyzeImage = async () => {
    if (!base64Data) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Data, mimeType }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `Server error: ${res.status}`);
      }

      setAnalysis(parseMarkdown(data.analysis));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  const verdict = analysis ? VERDICT_CONFIG[analysis.verdict] : null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-teal-600/5 rounded-full blur-[80px]" />
      </div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Leaf className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent leading-none">
                BinSight
              </h1>
              <p className="text-[10px] text-slate-500 leading-none mt-0.5">AI Packaging Scanner</p>
            </div>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            Gemini AI
          </span>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <section className="relative z-10 flex-1 w-full max-w-md mx-auto px-4 py-6 flex flex-col gap-5">

        {/* Hero text */}
        <div className="text-center pt-1">
          <p className="text-[11px] font-bold tracking-widest text-emerald-400 uppercase mb-1.5">
            Instant Recyclability Guide
          </p>
          <h2 className="text-2xl font-extrabold text-slate-50 leading-tight">
            Smart Packaging Scanner
          </h2>
          <p className="text-slate-400 text-xs mt-2 max-w-xs mx-auto">
            Point your camera at any household or holiday packaging to instantly learn how to dispose of it responsibly.
          </p>
        </div>

        {/* ── Error banner ──────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-3 bg-rose-950/40 border border-rose-500/30 rounded-2xl p-4 text-rose-200">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Something went wrong</p>
              <p className="text-xs text-rose-300/80 mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* ── Tap-to-scan button ────────────────────────────────────────── */}
        {!imagePreview && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-[4/3] rounded-3xl bg-slate-900/50 border-2 border-dashed border-slate-800 hover:border-emerald-500/50 transition-all duration-300 flex flex-col items-center justify-center gap-4 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/0 to-teal-500/0 group-hover:from-emerald-500/5 group-hover:to-teal-500/5 transition-all duration-500" />
            <div className="w-18 h-18 w-[72px] h-[72px] rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center group-hover:scale-110 group-hover:border-emerald-500/50 group-hover:shadow-xl group-hover:shadow-emerald-500/10 transition-all duration-300">
              <Camera className="w-8 h-8 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-200 group-hover:text-emerald-300 transition-colors">
                Tap to Scan Packaging
              </p>
              <p className="text-slate-500 text-xs mt-1">Camera or photo library</p>
            </div>
          </button>
        )}

        {/* ── Image preview ─────────────────────────────────────────────── */}
        {imagePreview && !analysis && (
          <div className="space-y-3">
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Captured packaging item"
                className="w-full h-full object-cover"
              />
            </div>

            {!loading && (
              <button
                onClick={analyzeImage}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold tracking-wide shadow-lg shadow-emerald-500/15 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Verify with BinSight AI
              </button>
            )}
          </div>
        )}

        {/* ── Loading spinner ───────────────────────────────────────────── */}
        {loading && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 flex flex-col items-center gap-4 shadow-xl">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
              <div className="absolute inset-0 rounded-full border-4 border-t-emerald-400 animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-200">Analyzing item with AI...</p>
              <p className="text-slate-500 text-xs mt-1 animate-pulse">Consulting recycling guidelines</p>
            </div>
          </div>
        )}

        {/* ── Results ───────────────────────────────────────────────────── */}
        {analysis && verdict && (
          <div className="space-y-3">

            {/* Captured preview thumbnail */}
            {imagePreview && (
              <div className="aspect-[16/7] rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Scanned item" className="w-full h-full object-cover" />
              </div>
            )}

            {/* ── Status card (dynamically colored) ── */}
            <div className={`rounded-3xl border p-5 ${verdict.bg} ${verdict.border} shadow-xl`}>
              <div className="flex items-center gap-2 mb-3">
                {verdict.icon}
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  Recyclability Status
                </span>
              </div>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-3 ${verdict.badge}`}>
                {verdict.label}
              </span>
              <p className={`text-sm leading-relaxed ${verdict.text}`}>{analysis.recyclabilityRaw}</p>
            </div>

            {/* ── Identified material ── */}
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 flex gap-3 items-start">
              <FlaskConical className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">
                  Object & Material
                </p>
                <p className="text-slate-200 font-semibold text-sm leading-snug">{analysis.material}</p>
              </div>
            </div>

            {/* ── Preparation steps ── */}
            {analysis.steps.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ListChecks className="w-4 h-4 text-emerald-400" />
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                    Preparation Steps
                  </p>
                </div>
                <ol className="space-y-2">
                  {analysis.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <span className="flex-none w-5 h-5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-400 flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* ── Eco fact ── */}
            {analysis.ecoFact && (
              <div className="bg-gradient-to-br from-emerald-950/25 to-teal-950/20 border border-teal-500/20 rounded-2xl p-4 flex gap-3 items-start">
                <Globe className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-teal-400 mb-1">Eco Fact</p>
                  <p className="text-xs text-slate-300 leading-relaxed italic">"{analysis.ecoFact}"</p>
                </div>
              </div>
            )}

            {/* ── Scan again ── */}
            <button
              onClick={reset}
              className="w-full py-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800/70 hover:border-slate-700 text-slate-300 font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4 text-slate-400" />
              Scan Another Item
            </button>
          </div>
        )}
      </section>

      {/* ── Hidden file input ───────────────────────────────────────────────── */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        className="hidden"
      />

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 py-6 border-t border-slate-900 text-center text-slate-600 text-xs">
        © 2026 BinSight — Empowering sustainable habits.
      </footer>
    </main>
  );
}
