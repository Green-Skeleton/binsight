'use client';

import React, { useState, useRef } from 'react';
import { Camera, Sparkles, CheckCircle, AlertCircle, Info, RefreshCw, Trash2, Globe, Leaf, CheckSquare } from 'lucide-react';

interface AnalysisResult {
  material: string;
  status: string;
  statusType: 'yes' | 'no' | 'local';
  steps: string[];
  ecoFact: string;
  rawText: string;
}

export default function BinSightHome() {
  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse the markdown response from Gemini into structured sections
  const parseAnalysis = (text: string): AnalysisResult => {
    const sections = {
      material: '',
      status: '',
      steps: [] as string[],
      ecoFact: ''
    };

    const lines = text.split('\n');
    let currentSection: 'material' | 'status' | 'steps' | 'ecoFact' | null = null;

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const lower = trimmed.toLowerCase();
      if (trimmed.startsWith('#') || trimmed.startsWith('**')) {
        if (lower.includes('identified object') || lower.includes('material')) {
          currentSection = 'material'; continue;
        } else if (lower.includes('recyclability') || lower.includes('status')) {
          currentSection = 'status'; continue;
        } else if (lower.includes('preparation') || lower.includes('steps')) {
          currentSection = 'steps'; continue;
        } else if (lower.includes('eco fact') || lower.includes('fact')) {
          currentSection = 'ecoFact'; continue;
        }
      }

      if (!currentSection) continue;

      const cleanLine = trimmed
        .replace(/^[\*\-\s#]+/, '') 
        .replace(/^\d+[\.\)]\s*/, '') 
        .replace(/\*\*/g, '') 
        .trim();

      if (!cleanLine) continue;

      if (currentSection === 'material') {
        sections.material += (sections.material ? ' ' : '') + cleanLine;
      } else if (currentSection === 'status') {
        sections.status += (sections.status ? ' ' : '') + cleanLine;
      } else if (currentSection === 'steps') {
        sections.steps.push(cleanLine);
      } else if (currentSection === 'ecoFact') {
        sections.ecoFact += (sections.ecoFact ? ' ' : '') + cleanLine;
      }
    }

    if (!sections.material && !sections.status) {
      return {
        material: 'Scanned Packaging Item',
        status: text.substring(0, 150) + '...',
        statusType: 'local',
        steps: ['Follow general local waste sorting rules.'],
        ecoFact: 'Always check local guidelines if in doubt.',
        rawText: text
      };
    }

    let statusType: 'yes' | 'no' | 'local' = 'local';
    const statusUpper = sections.status.toUpperCase();
    if (statusUpper.includes('YES')) {
      statusType = 'yes';
    } else if (statusUpper.includes('NO')) {
      statusType = 'no';
    }

    return {
      material: sections.material || 'Household waste item',
      status: sections.status || 'Details in regional guides',
      statusType,
      steps: sections.steps.length > 0 ? sections.steps : ['Rinse if dirty', 'Separate from other materials'],
      ecoFact: sections.ecoFact || 'Recycling saves energy and reduces landfill footprint.',
      rawText: text
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setAnalysis(null);
    setMimeType(file.type);

    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result as string);
    reader.onerror = () => setError("Failed to read image file.");
    reader.readAsDataURL(file);
  };

  const verifyWithAI = async () => {
    if (!image) return;
    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, mimeType: mimeType || 'image/jpeg' })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to analyze packaging.');
      setAnalysis(parseAnalysis(data.result));
    } catch (err: any) {
      setError(err.message || 'Something went wrong during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setMimeType('');
    setAnalysis(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-slate-950" />
            </div>
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">BinSight</h1>
          </div>
        </div>
      </header>

      <section className="flex-1 w-full max-w-md mx-auto px-4 py-6 flex flex-col space-y-6 z-10">
        <div className="text-center space-y-2">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Instant Recyclability Guide</p>
          <h2 className="text-3xl font-extrabold text-slate-100">Smart Packaging Scanner</h2>
        </div>

        {error && (
          <div className="bg-rose-950/40 border border-rose-500/30 text-rose-200 rounded-2xl p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <p className="text-xs">{error}</p>
          </div>
        )}

        {!image ? (
          <button onClick={() => fileInputRef.current?.click()} className="w-full aspect-[4/3] rounded-3xl bg-slate-900/40 border-2 border-dashed border-slate-800 hover:border-emerald-500/40 flex flex-col items-center justify-center space-y-4 group">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:scale-110 transition-all">
              <Camera className="w-7 h-7 text-slate-400 group-hover:text-emerald-400" />
            </div>
            <span className="text-slate-200 font-semibold group-hover:text-emerald-300">Tap to Scan Packaging</span>
          </button>
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-slate-800 bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="Captured" className="w-full h-full object-cover" />
              <button onClick={handleReset} className="absolute top-3 right-3 bg-slate-950/80 text-slate-300 hover:text-rose-400 w-10 h-10 rounded-full flex items-center justify-center border border-slate-800/80">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            {!analysis && !isAnalyzing && (
              <button onClick={verifyWithAI} className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold flex items-center justify-center space-x-2">
                <Sparkles className="w-5 h-5" />
                <span>Verify with BinSight AI</span>
              </button>
            )}
          </div>
        )}

        {isAnalyzing && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-8 text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20" />
              <div className="absolute inset-0 rounded-full border-4 border-t-emerald-400 animate-spin" />
            </div>
            <h4 className="font-semibold text-slate-200">Analyzing item with AI...</h4>
          </div>
        )}

        {analysis && (
          <div className="space-y-4">
            <div className={`rounded-3xl border p-6 ${analysis.statusType === 'yes' ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200' : analysis.statusType === 'no' ? 'bg-rose-950/20 border-rose-500/30 text-rose-200' : 'bg-amber-950/25 border-amber-500/30 text-amber-200'}`}>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  {analysis.statusType === 'yes' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : analysis.statusType === 'no' ? <AlertCircle className="w-5 h-5 text-rose-400" /> : <Info className="w-5 h-5 text-amber-400" />}
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Recyclability Status</span>
                </div>
                <h3 className="text-3xl font-extrabold uppercase">{analysis.statusType === 'yes' ? 'YES' : analysis.statusType === 'no' ? 'NO' : 'LOCAL RULES'}</h3>
                <p className="text-sm text-slate-300">{analysis.status}</p>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-5 space-y-2">
              <div className="flex items-center space-x-2 text-slate-400">
                <Leaf className="w-4 h-4 text-emerald-400" />
                <span className="text-xs uppercase font-bold">Object & Material</span>
              </div>
              <p className="text-base text-slate-200 font-semibold">{analysis.material}</p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-5 space-y-3">
              <div className="flex items-center space-x-2 text-slate-400">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <span className="text-xs uppercase font-bold">Preparation Steps</span>
              </div>
              <ul className="space-y-2 text-sm text-slate-300">
                {analysis.steps.map((step, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-400 shrink-0">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gradient-to-r from-emerald-950/20 to-teal-950/20 border border-teal-500/20 rounded-3xl p-5 space-y-2">
              <div className="flex items-center space-x-2 text-slate-400">
                <Globe className="w-4 h-4 text-teal-400" />
                <span className="text-xs uppercase font-bold text-teal-400">Eco Fact</span>
              </div>
              <p className="text-xs text-slate-300 italic">"{analysis.ecoFact}"</p>
            </div>

            <button onClick={handleReset} className="w-full py-3.5 px-6 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800/80 text-slate-300 font-semibold flex items-center justify-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>Scan Another Item</span>
            </button>
          </div>
        )}
      </section>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />
    </main>
  );
}
