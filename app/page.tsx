'use client';

import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  RefreshCw, 
  Trash2, 
  Globe, 
  Leaf, 
  CheckSquare, 
  ChevronRight 
} from 'lucide-react';

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
  const [showRaw, setShowRaw] = useState<boolean>(false);

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

      // Detect Section Headers (supporting both markdown headers and bold lines)
      if (trimmed.startsWith('#') || trimmed.startsWith('**')) {
        const lower = trimmed.toLowerCase();
        if (lower.includes('identified object') || lower.includes('material')) {
          currentSection = 'material';
          continue;
        } else if (lower.includes('recyclability') || lower.includes('status')) {
          currentSection = 'status';
          continue;
        } else if (lower.includes('preparation') || lower.includes('steps')) {
          currentSection = 'steps';
          continue;
        } else if (lower.includes('eco fact') || lower.includes('fact')) {
          currentSection = 'ecoFact';
          continue;
        }
      }

      if (!currentSection) continue;

      // Strip symbols like markdown bold/lists and accumulate content
      const cleanLine = trimmed
        .replace(/^[\*\-\s#]+/, '') // Remove lists/headers prefixes
        .replace(/^\d+[\.\)]\s*/, '') // Remove numbered prefixes
        .replace(/\*\*/g, '') // Remove inline bold
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

    // Fallback if parsing fails to find sections
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

    // Detect recyclability status (YES, NO, LOCAL RULES APPLY)
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
    reader.onloadend = () => {
      setImage(reader.result as string);
    };
    reader.onerror = () => {
      setError("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleScanClick = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    setImage(null);
    setMimeType('');
    setAnalysis(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const verifyWithAI = async () => {
    if (!image) return;

    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: image,
          mimeType: mimeType || 'image/jpeg'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze packaging.');
      }

      const parsed = parseAnalysis(data.result);
      setAnalysis(parsed);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Background Gradient Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-72 h-72 bg-teal-500/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Leaf className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-50 bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                BinSight
              </h1>
            </div>
          </div>
          <span className="text-[10px] uppercase font-semibold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            AI Scanner
          </span>
        </div>
      </header>

      {/* Main Container */}
      <section className="flex-1 w-full max-w-md mx-auto px-4 py-6 flex flex-col space-y-6 z-10">
        
        {/* Intro Banner */}
        <div className="text-center space-y-2 py-2">
          <p className="text-xs font-semibold tracking-widest text-emerald-400 uppercase">Instant Recyclability Guide</p>
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">Smart Packaging Scanner</h2>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            Take a picture of any item or holiday packaging to see how to properly recycle it.
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-500/30 text-rose-200 rounded-2xl p-4 flex items-start space-x-3 shadow-lg" id="error-banner">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold text-sm">Scanner Issue</h4>
              <p className="text-xs text-rose-300/90 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Image Preview & Upload States */}
        {!image ? (
          /* TAP TO SCAN BUTTON */
          <button
            onClick={handleScanClick}
            id="scan-button"
            className="w-full aspect-[4/3] rounded-3xl bg-slate-900/40 border-2 border-dashed border-slate-800 hover:border-emerald-500/40 transition-all duration-300 flex flex-col items-center justify-center space-y-4 shadow-inner group relative overflow-hidden"
          >
            {/* Hover reflection */}
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/0 via-emerald-500/5 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:scale-110 group-hover:border-emerald-500/50 group-hover:shadow-lg group-hover:shadow-emerald-500/10 transition-all duration-300">
              <Camera className="w-7 h-7 text-slate-400 group-hover:text-emerald-400 transition-colors" />
            </div>
            
            <div className="text-center space-y-1">
              <span className="text-slate-200 font-semibold text-base block group-hover:text-emerald-300 transition-colors">Tap to Scan Packaging</span>
              <span className="text-slate-500 text-xs block">Supports Camera or Photo Upload</span>
            </div>
          </button>
        ) : (
          /* IMAGE PREVIEW ACTIVE */
          <div className="space-y-4">
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt="Captured Waste Item"
                className="w-full h-full object-cover"
              />
              <button
                onClick={handleReset}
                id="reset-button"
                className="absolute top-3 right-3 bg-slate-950/80 hover:bg-slate-900 backdrop-blur-md text-slate-300 hover:text-rose-400 w-10 h-10 rounded-full flex items-center justify-center border border-slate-800/80 transition-all"
                title="Discard Image"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {/* VERIFY BUTTON */}
            {!analysis && !isAnalyzing && (
              <button
                onClick={verifyWithAI}
                id="verify-button"
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold tracking-wide shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-5 h-5 text-slate-950" />
                <span>Verify with BinSight AI</span>
              </button>
            )}
          </div>
        )}

        {/* LOADING STATE */}
        {isAnalyzing && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-8 text-center space-y-4 shadow-xl" id="loading-container">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20" />
              <div className="absolute inset-0 rounded-full border-4 border-t-emerald-400 animate-spin" />
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-slate-200">Analyzing item with AI...</h4>
              <p className="text-slate-500 text-xs animate-pulse">Consulting material guidelines</p>
            </div>
          </div>
        )}

        {/* ANALYSIS RESULT RENDERING */}
        {analysis && (
          <div className="space-y-4 animate-fade-in">
            
            {/* Status Card (Colored dynamically based on recyclability) */}
            <div 
              className={`rounded-3xl border p-6 shadow-xl relative overflow-hidden transition-all duration-300 ${
                analysis.statusType === 'yes' 
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200 shadow-emerald-500/5'
                  : analysis.statusType === 'no'
                  ? 'bg-rose-950/20 border-rose-500/30 text-rose-200 shadow-rose-500/5'
                  : 'bg-amber-950/25 border-amber-500/30 text-amber-200 shadow-amber-500/5'
              }`}
              id="result-status-card"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    {analysis.statusType === 'yes' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : analysis.statusType === 'no' ? (
                      <AlertCircle className="w-5 h-5 text-rose-400" />
                    ) : (
                      <Info className="w-5 h-5 text-amber-400" />
                    )}
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                      Recyclability Status
                    </span>
                  </div>
                  
                  <h3 className="text-3xl font-extrabold uppercase tracking-tight">
                    {analysis.statusType === 'yes' ? 'YES' : analysis.statusType === 'no' ? 'NO' : 'LOCAL RULES'}
                  </h3>
                  
                  <p className="text-sm text-slate-300 leading-relaxed max-w-xs">
                    {analysis.status}
                  </p>
                </div>
              </div>
            </div>

            {/* Identified Material Card */}
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-5 space-y-2">
              <div className="flex items-center space-x-2 text-slate-400">
                <Leaf className="w-4 h-4 text-emerald-400" />
                <span className="text-xs uppercase font-bold tracking-wider">Object & Material</span>
              </div>
              <p className="text-base text-slate-200 font-semibold">
                {analysis.material}
              </p>
            </div>

            {/* Preparation Steps Card */}
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-5 space-y-3">
              <div className="flex items-center space-x-2 text-slate-400">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <span className="text-xs uppercase font-bold tracking-wider">Preparation Steps</span>
              </div>
              <ul className="space-y-2 text-sm text-slate-300">
                {analysis.steps.map((step, index) => (
                  <li key={index} className="flex items-start space-x-2.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-400 shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Eco Fact Card */}
            <div className="bg-gradient-to-r from-emerald-950/20 to-teal-950/20 border border-teal-500/20 rounded-3xl p-5 space-y-2">
              <div className="flex items-center space-x-2 text-slate-400">
                <Globe className="w-4 h-4 text-teal-400" />
                <span className="text-xs uppercase font-bold tracking-wider text-teal-400">Eco Fact</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "{analysis.ecoFact}"
              </p>
            </div>

            {/* Toggle Raw output */}
            <div className="pt-2">
              <button
                onClick={() => setShowRaw(!showRaw)}
                id="toggle-raw-button"
                className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-400 transition-colors flex items-center justify-center space-x-1"
              >
                <span>{showRaw ? 'Hide Raw AI Output' : 'Show Raw Markdown Output'}</span>
              </button>
              {showRaw && (
                <pre className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-[10px] text-slate-400 overflow-x-auto whitespace-pre-wrap font-mono mt-2">
                  {analysis.rawText}
                </pre>
              )}
            </div>

            {/* Reset / Scan Another button */}
            <button
              onClick={handleReset}
              id="reset-scan-button"
              className="w-full py-3.5 px-6 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800/80 hover:border-slate-700 text-slate-300 font-semibold tracking-wide transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4 text-slate-400" />
              <span>Scan Another Item</span>
            </button>

          </div>
        )}
      </section>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
        id="file-input"
      />

      {/* Footer */}
      <footer className="py-6 border-t border-slate-900 text-center text-slate-600 text-xs">
        <p>© 2026 BinSight. Empowering sustainable holiday & household habits.</p>
      </footer>
    </main>
  );
}
