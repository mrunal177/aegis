import React, { useState } from 'react';
import { useAegisStore } from '../store/useAegisStore';
import { ALTERNATE_PROTOCOL, PRIMARY_PROTOCOL } from '../data/protocols';
import { ProtocolConfig, ProtocolStep } from '../types';
import {
  FileCode2,
  Check,
  RotateCcw,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Gauge,
  Sliders,
} from 'lucide-react';

export const ProtocolScreen: React.FC = () => {
  const { protocol, setProtocol, gemini, fps, blurScore, isBlurry, isLowFPS } = useAegisStore();

  const [jsonText, setJsonText] = useState<string>(JSON.stringify(protocol, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<boolean>(false);

  const [naturalText, setNaturalText] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsedPreview, setParsedPreview] = useState<ProtocolStep[] | null>(null);

  const handleApplyJSON = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed.steps || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
        throw new Error('Protocol must include a non-empty "steps" array.');
      }
      setProtocol(parsed as ProtocolConfig);
      setJsonError(null);
      setApplySuccess(true);
      setTimeout(() => setApplySuccess(false), 2500);
    } catch (err: any) {
      setJsonError(err.message || 'Invalid JSON syntax');
    }
  };

  const handleLoadAlternate = () => {
    setProtocol(ALTERNATE_PROTOCOL);
    setJsonText(JSON.stringify(ALTERNATE_PROTOCOL, null, 2));
    setJsonError(null);
  };

  const handleResetDefault = () => {
    setProtocol(PRIMARY_PROTOCOL);
    setJsonText(JSON.stringify(PRIMARY_PROTOCOL, null, 2));
    setJsonError(null);
  };

  const handleParseNatural = async () => {
    if (!naturalText.trim()) return;
    setIsParsing(true);
    const steps = await gemini.parseNaturalProtocol(naturalText);
    setParsedPreview(steps);
    setIsParsing(false);
  };

  const handleApplyParsed = () => {
    if (!parsedPreview) return;
    const newConfig: ProtocolConfig = {
      ...protocol,
      name: 'Custom Parsed Biological Protocol',
      steps: parsedPreview,
    };
    setProtocol(newConfig);
    setJsonText(JSON.stringify(newConfig, null, 2));
    setParsedPreview(null);
    setNaturalText('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#0B0E17] border border-slate-800">
        <div>
          <h1 className="text-base font-bold text-slate-100 font-display flex items-center gap-2">
            Payload Experiment Protocol Specification
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Synchronized sequence schema, precondition gates, and natural procedure ingestion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLoadAlternate}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
          >
            Load Alternate 4-Step Protocol
          </button>
          <button
            onClick={handleResetDefault}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
          >
            Reset Default
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): JSON/YAML Editor & Step Flow */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 rounded-xl bg-[#0B0E17] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 uppercase tracking-wider">Protocol Configuration (JSON)</span>
              {applySuccess && (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Schema Applied
                </span>
              )}
            </div>

            <textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setJsonError(null);
              }}
              rows={14}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg p-3 text-xs font-mono text-cyan-200 focus:outline-none focus:border-cyan-500 selection:bg-cyan-500/30 leading-relaxed resize-y"
            />

            {jsonError && (
              <div className="p-2.5 rounded bg-rose-950/60 border border-rose-500/60 text-rose-200 text-xs flex items-center gap-2 font-mono">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{jsonError}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleApplyJSON}
                className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-medium transition-colors"
              >
                Validate &amp; Apply Protocol
              </button>
            </div>
          </div>

          {/* Parsed Step-Flow List */}
          <div className="p-4 rounded-xl bg-[#0B0E17] border border-slate-800 space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block">
              Active Step Flow Invariants
            </span>
            <div className="space-y-2">
              {protocol.steps.map((st, i) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between p-2.5 rounded bg-slate-900/60 border border-slate-800 text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">0{i + 1}</span>
                    <span className="text-slate-200 font-semibold">{st.name}</span>
                    <span className="text-slate-400">· Type: {st.type}</span>
                    <span className="text-slate-400">· Object: {st.object}</span>
                  </div>
                  <span className="text-slate-400 italic font-sans text-[11px] truncate max-w-xs">
                    "{st.voice}"
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Pre/Post Conditions, Frame Quality, Natural Language Parser */}
        <div className="lg:col-span-5 space-y-4">
          {/* Preconditions & Postconditions */}
          <div className="p-4 rounded-xl bg-[#0B0E17] border border-slate-800 space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block">
              Invariants &amp; Boundary Conditions
            </span>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1.5">
                <span className="text-amber-400 font-semibold text-[11px] block">
                  PRECONDITIONS (Checked at Start):
                </span>
                {protocol.preconditions.map((p, i) => (
                  <div key={i} className="text-slate-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>{p}</span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1.5">
                <span className="text-emerald-400 font-semibold text-[11px] block">
                  POSTCONDITIONS (Verified at Complete):
                </span>
                {protocol.postconditions.map((p, i) => (
                  <div key={i} className="text-slate-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Frame Quality Diagnostics Panel */}
          <div className="p-4 rounded-xl bg-[#0B0E17] border border-slate-800 space-y-3 font-mono text-xs">
            <span className="text-slate-400 uppercase tracking-wider block">
              Optical Quality Gate
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">CURRENT FPS</span>
                <span className={`text-xl font-bold ${isLowFPS ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {fps}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Threshold: ≥ 15</span>
              </div>
              <div className="p-3 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">LAPLACIAN BLUR</span>
                <span className={`text-xl font-bold ${isBlurry ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {blurScore}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Threshold: ≥ 60</span>
              </div>
            </div>
          </div>

          {/* Protocol Parser (Natural Language Ingestion) */}
          <div className="p-4 rounded-xl bg-[#0B0E17] border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                Natural-Language Protocol Parser
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Converts plain English protocol procedures into structured JSON steps via Gemini with deterministic regex fallback.
            </p>

            <textarea
              value={naturalText}
              onChange={(e) => setNaturalText(e.target.value)}
              placeholder="e.g. First open the experiment box. Then pick the red specimen tube and place it in the target zone. Next pick the yellow tube and deposit it in the target zone."
              rows={3}
              className="w-full bg-slate-900/80 border border-slate-700 rounded p-2.5 text-xs text-slate-200 font-sans focus:outline-none focus:border-cyan-500"
            />

            <button
              onClick={handleParseNatural}
              disabled={isParsing || !naturalText.trim()}
              className="w-full py-2 rounded bg-purple-950/80 border border-purple-500/60 text-purple-200 text-xs font-mono font-medium hover:bg-purple-900/50 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isParsing ? 'Parsing Structure...' : 'Parse Procedure'}</span>
            </button>

            {parsedPreview && (
              <div className="p-3 rounded bg-slate-900 border border-purple-800/60 space-y-2 text-xs font-mono">
                <span className="text-purple-300 font-semibold block">
                  Generated {parsedPreview.length} Steps:
                </span>
                <div className="space-y-1 text-slate-300">
                  {parsedPreview.map((s, idx) => (
                    <div key={idx}>
                      • {s.name} ({s.type}) - {s.object}
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleApplyParsed}
                  className="w-full py-1.5 mt-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono transition-colors"
                >
                  Accept &amp; Overwrite Active Protocol
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
