import React, { useEffect, useState } from 'react';
import { useAegisStore } from '../store/useAegisStore';
import { VideoStage } from '../components/VideoStage';
import { CONFIG } from '../config';
import {
  Play,
  Pause,
  RotateCcw,
  Sliders,
  CheckCircle,
  AlertTriangle,
  Volume2,
  VolumeX,
  RotateCw,
  Sparkles,
  Info,
  Radio,
  Clock,
  Gauge,
  Activity,
  ShieldAlert,
} from 'lucide-react';

export const LiveMonitorScreen: React.FC = () => {
  const {
    protocol,
    fsmIdx,
    activeAlert,
    isPaused,
    isComplete,
    runType,
    setRunType,
    sourceMode,
    setSourceMode,
    activeScenarioId,
    startExperiment,
    pauseExperiment,
    resumeExperiment,
    resetExperiment,
    clearAlert,
    openSetupWizard,
    detector,
    fsm,
    voice,
    gemini,
    events,
    transcript,
    fps,
    blurScore,
    isBlurry,
    isLowFPS,
    handMode,
    boxROI,
  } = useAegisStore();

  const [isMuted, setIsMuted] = useState<boolean>(voice.getMuted());
  const [volume, setVolume] = useState<number>(1.0);
  const [sceneData, setSceneData] = useState<any>(null);
  const [isGeminiPolling, setIsGeminiPolling] = useState<boolean>(true);

  // Poll advisory Gemini Scene Interpreter every 2s (Advisory only)
  useEffect(() => {
    if (!isGeminiPolling) return;
    const interval = setInterval(async () => {
      // Create lightweight advisory frame representation
      const res = await gemini.interpretFrame('');
      setSceneData(res);
    }, 2000);
    return () => clearInterval(interval);
  }, [gemini, isGeminiPolling]);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    voice.setMuted(nextMuted);
    setIsMuted(nextMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    voice.setVolume(val);
  };

  const currentStep = fsm.getCurrentExpectedStep();
  const nextStep = fsm.getNextExpectedStep();
  const trackedObjects = detector.getTrackedObjects();
  const recentEvents = events.slice(-8).reverse();

  // Unified Action Confidence of last event or current default
  const lastOutcome = events[events.length - 1];
  const lastComponents = lastOutcome?.components || {
    state: 0.95,
    contact: 0.85,
    temporal: 0.9,
  };
  const unifiedScore = lastOutcome?.confidence ?? 0.92;

  // Real alert latency
  const lastAlert = events
    .slice()
    .reverse()
    .find((e) => e.status !== 'SUCCESS');
  const alertLatencyText =
    lastAlert && typeof lastAlert.latencyMs === 'number'
      ? `${lastAlert.latencyMs} ms`
      : 'Nominal (< 50 ms)';

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8">
      {/* Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-[#0B0E17] border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {/* Start / Pause / Reset */}
          {!isComplete && (
            <>
              {isPaused ? (
                <button
                  onClick={resumeExperiment}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-medium transition-colors shadow-xs"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume</span>
                </button>
              ) : (
                <button
                  onClick={fsmIdx === 0 && events.length === 0 ? startExperiment : pauseExperiment}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-medium transition-colors shadow-xs"
                >
                  {fsmIdx === 0 && events.length === 0 ? (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Start Experiment</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </>
                  )}
                </button>
              )}
            </>
          )}

          <button
            onClick={resetExperiment}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {/* Run Type Selector */}
          <div className="flex items-center gap-1 p-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-xs">
            <button
              onClick={() => setRunType('correct')}
              className={`px-2.5 py-1 rounded transition-colors ${
                runType === 'correct' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Correct Run
            </button>
            <button
              onClick={() => setRunType('error')}
              className={`px-2.5 py-1 rounded transition-colors ${
                runType === 'error' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Error Run
            </button>
          </div>

          {/* Scenario Source Selector */}
          <div className="flex items-center gap-1 p-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-xs">
            <button
              onClick={() => setSourceMode('live')}
              className={`px-2.5 py-1 rounded transition-colors ${
                sourceMode === 'live' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Live Camera
            </button>
            <button
              onClick={() => setSourceMode('replay')}
              className={`px-2.5 py-1 rounded transition-colors ${
                sourceMode === 'replay' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Scenario Replay
            </button>
          </div>

          {/* Scenario Picker when in replay mode */}
          {sourceMode === 'replay' && (
            <select
              value={activeScenarioId}
              onChange={(e) => useAegisStore.setState({ activeScenarioId: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="TC-01">TC-01: Correct Full Run</option>
              <option value="TC-02">TC-02: Pick Yellow First</option>
              <option value="TC-03">TC-03: Skipped Pick Phase</option>
              <option value="TC-04">TC-04: Self-Healing Recovery</option>
              <option value="TC-05">TC-05: Lost Object Guard</option>
              <option value="TC-06">TC-06: Repeated Pick</option>
              <option value="TC-07">TC-07: Wrong Zone Drop</option>
            </select>
          )}
        </div>

        {/* Status Bar: FPS, Blur, Latency, Hand Mode */}
        <div className="flex items-center gap-3 text-xs font-mono text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">FPS:</span>
            <span className={isLowFPS ? 'text-amber-400' : 'text-emerald-400'}>{fps}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Blur Score:</span>
            <span className={isBlurry ? 'text-amber-400' : 'text-emerald-400'}>{blurScore}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Alert Latency:</span>
            <span className="text-cyan-400">{alertLatencyText}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Hand Mode:</span>
            <span className="text-slate-200">{handMode === 'vision' ? 'MediaPipe' : 'Motion Fallback'}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Stage (Video + Timeline) & Right Intelligence Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (7 cols): Video Stage, 6-Step Progress Bar, Timeline */}
        <div className="lg:col-span-7 space-y-4">
          <VideoStage />

          {/* 6-Step Progress Bar with Ticks */}
          <div className="p-4 rounded-lg bg-[#0B0E17] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="uppercase tracking-wider">Protocol Sequence State</span>
              <span className="text-cyan-400 font-semibold">
                {isComplete ? 'COMPLETE' : `STEP ${fsmIdx + 1} OF ${protocol.steps.length}`}
              </span>
            </div>

            <div className="grid grid-cols-6 gap-1.5">
              {protocol.steps.concat({ id: 6, name: 'COMPLETE', type: 'OPEN', object: 'box', voice: 'Complete' } as any).map((stepItem, idx) => {
                const isPassed = fsmIdx > idx || (isComplete && idx === 5);
                const isCurrent = fsmIdx === idx && !isComplete;
                return (
                  <div
                    key={stepItem.id}
                    className={`h-2 rounded transition-colors ${
                      isPassed
                        ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                        : isCurrent
                        ? 'bg-cyan-500 animate-pulse'
                        : 'bg-slate-800'
                    }`}
                    title={stepItem.name}
                  />
                );
              })}
            </div>

            <div className="grid grid-cols-6 gap-1 text-[10px] font-mono text-slate-400 pt-1 text-center">
              <span>OPEN</span>
              <span>PICK_RED</span>
              <span>PLACE_RED</span>
              <span>PICK_YEL</span>
              <span>PLACE_YEL</span>
              <span>DONE</span>
            </div>
          </div>

          {/* Event Timeline */}
          <div className="p-4 rounded-lg bg-[#0B0E17] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 uppercase tracking-wider">Recent Event Timeline</span>
              <span className="text-slate-400">{events.length} Events Total</span>
            </div>

            {events.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 font-mono">
                No runs recorded yet. Press Start Experiment or select a Scenario Replay.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {recentEvents.map((ev, i) => {
                  const isSuccess = ev.status === 'SUCCESS';
                  const isLost = ev.status === 'LOST';
                  const isUncertain = ev.status === 'UNCERTAIN';
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-2.5 rounded text-xs font-mono border ${
                        isSuccess
                          ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
                          : isLost
                          ? 'bg-purple-950/40 border-purple-800/50 text-purple-200'
                          : isUncertain
                          ? 'bg-amber-950/40 border-amber-800/50 text-amber-200'
                          : 'bg-rose-950/40 border-rose-800/50 text-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isSuccess ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : isLost ? (
                          <ShieldAlert className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        )}
                        <span className="font-semibold">{ev.action}</span>
                        <span className="text-slate-400">· Expected: {ev.expected}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span>Conf: {(ev.confidence * 100).toFixed(0)}%</span>
                        <span>{ev.timestamp}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Step Cards, Confidence Gauge, Object Table, JSON Log, Voice, AI */}
        <div className="lg:col-span-5 space-y-4">
          {/* Step Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Current Step */}
            <div className="p-3.5 rounded-lg bg-[#0B0E17] border border-cyan-500/40 space-y-1">
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                Current Step [idx={fsmIdx}]
              </span>
              <div className="font-semibold text-sm text-slate-100 font-display">
                {currentStep?.name || 'COMPLETE'}
              </div>
              <p className="text-xs text-slate-300 leading-snug line-clamp-2">
                {currentStep?.voice || 'All protocol objectives achieved.'}
              </p>
            </div>

            {/* Next Step */}
            <div className="p-3.5 rounded-lg bg-[#0B0E17] border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Next In Sequence
              </span>
              <div className="font-semibold text-sm text-slate-300 font-display">
                {nextStep?.name || (isComplete ? 'None' : 'Final Step')}
              </div>
              <p className="text-xs text-slate-400 leading-snug line-clamp-2">
                {nextStep?.voice || 'Sequence conclusion.'}
              </p>
            </div>
          </div>

          {/* Unified Action Confidence Gauge */}
          <div className="p-4 rounded-lg bg-[#0B0E17] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 uppercase tracking-wider">
                Unified Action Confidence
              </span>
              <span className="text-cyan-400 font-bold text-sm">
                {(unifiedScore * 100).toFixed(0)}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  unifiedScore >= CONFIG.ACCEPT
                    ? 'bg-emerald-500'
                    : unifiedScore >= CONFIG.UNCERTAIN_MIN
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, unifiedScore * 100))}%` }}
              />
            </div>

            {/* 3 Components Breakdown */}
            <div className="grid grid-cols-3 gap-2 font-mono text-[11px] pt-1 border-t border-slate-800/80">
              <div>
                <span className="text-slate-400 block text-[10px]">STATE (45%)</span>
                <span className="text-slate-200 font-semibold">
                  {(lastComponents.state * 100).toFixed(0)}%
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">CONTACT (30%)</span>
                <span className="text-slate-200 font-semibold">
                  {(lastComponents.contact * 100).toFixed(0)}%
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">TEMPORAL (25%)</span>
                <span className="text-slate-200 font-semibold">
                  {(lastComponents.temporal * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
              <span>ST-GCN Kinematics: Optional signal — Off</span>
              <span>Accept Threshold: ≥ 70%</span>
            </div>
          </div>

          {/* Object State Table */}
          <div className="p-4 rounded-lg bg-[#0B0E17] border border-slate-800 space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block">
              Specimen Track Matrix
            </span>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-left">
                    <th className="pb-1.5">Track ID</th>
                    <th className="pb-1.5">State</th>
                    <th className="pb-1.5">Contact</th>
                    <th className="pb-1.5 text-right">Relative Coords</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {trackedObjects.map((obj) => {
                    const relX = ((obj.centroid.x - boxROI.x) / boxROI.w).toFixed(2);
                    const relY = ((obj.centroid.y - boxROI.y) / boxROI.h).toFixed(2);
                    return (
                      <tr key={obj.id} className="text-slate-200">
                        <td className="py-1.5">{obj.id}</td>
                        <td className="py-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              obj.state === 'HELD'
                                ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                                : obj.state === 'TARGET_ZONE'
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {obj.state}
                          </span>
                        </td>
                        <td className="py-1.5">
                          {obj.contact ? (
                            <span className="text-cyan-400">Yes</span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </td>
                        <td className="py-1.5 text-right text-slate-400">
                          {obj.visible ? `(${relX}, ${relY})` : 'Unseen'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Voice Panel */}
          <div className="p-4 rounded-lg bg-[#0B0E17] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-slate-200">On-device Speech Synthesis</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <button
                  onClick={toggleMute}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
                <button
                  onClick={() => voice.replayLast()}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  title="Replay Last Utterance"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Live Transcript (Last 3) */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded p-2.5 max-h-24 overflow-y-auto space-y-1 font-mono text-xs">
              {transcript.length === 0 ? (
                <div className="text-slate-400 text-[11px]">Speech synthesizer idle.</div>
              ) : (
                transcript.slice(-3).map((line) => (
                  <div key={line.id} className="text-slate-300 leading-snug">
                    <span className="text-slate-400 text-[10px] mr-1.5">[{line.timestamp}]</span>
                    <span>{line.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Scene Interpreter (Gemini, Advisory Only) */}
          <div className="p-4 rounded-lg bg-[#0B0E17] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-semibold text-slate-200">Scene Interpreter (Advisory)</span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">
                {sceneData?.isOnline ? `${sceneData.latencyMs} ms` : 'Local pipeline active'}
              </span>
            </div>

            <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800/80 font-mono text-[11px] text-slate-300 space-y-1">
              {sceneData?.isOnline ? (
                <>
                  <div>Action: {sceneData.current_action}</div>
                  <div>Red: {sceneData.red_state} · Yellow: {sceneData.yellow_state}</div>
                  <div>Box Open: {sceneData.box_open ? 'True' : 'False'}</div>
                </>
              ) : (
                <div className="text-slate-400">
                  Offline — local pipeline active (FSM independent of advisory layer).
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
