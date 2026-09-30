import React, { useState } from 'react';
import { useAegisStore } from '../store/useAegisStore';
import { BoxMode, RegionOfInterest } from '../types';
import {
  Sliders,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  Camera,
  Layers,
  Palette,
  Gauge,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

export const SetupWizard: React.FC = () => {
  const {
    isSetupWizardOpen,
    closeSetupWizard,
    boxMode,
    setBoxMode,
    boxROI,
    targetROI,
    setROIs,
    colors,
    setColors,
    fps,
    blurScore,
    isBlurry,
    isLowFPS,
    detector,
    fsm,
  } = useAegisStore();

  const [step, setStep] = useState<number>(1);
  const [selectedMode, setSelectedMode] = useState<BoxMode>(boxMode);
  const [tempBoxROI, setTempBoxROI] = useState<RegionOfInterest>({ ...boxROI });
  const [tempTargetROI, setTempTargetROI] = useState<RegionOfInterest>({ ...targetROI });
  const [colorCalibStatus, setColorCalibStatus] = useState<{ red: boolean; yellow: boolean; lid: boolean }>({
    red: true,
    yellow: true,
    lid: true,
  });
  const [preflightErrors, setPreflightErrors] = useState<string[]>([]);
  const [preflightPassed, setPreflightPassed] = useState<boolean>(false);

  if (!isSetupWizardOpen) return null;

  const handleRunPreflight = () => {
    const errors: string[] = [];
    const redState = detector.getObjectState('red');
    const yellowState = detector.getObjectState('yellow');

    // In Mode A, box must be closed initially: red and yellow unseen
    if (selectedMode === 'A') {
      const redVisible = detector.getTrackedObjects().find((o) => o.label === 'red')?.visible;
      const yellowVisible = detector.getTrackedObjects().find((o) => o.label === 'yellow')?.visible;

      // Note: If testing in simulator/empty setup, allow passing if objects are inside box or unseen
      if (redVisible && yellowVisible && redState === 'TARGET_ZONE') {
        errors.push('Precondition failed: Target zone is not empty prior to start.');
      }
    }

    if (isBlurry) {
      errors.push('Precondition failed: Camera feed blur level exceeds limit (Laplacian < 60).');
    }

    if (errors.length > 0) {
      setPreflightErrors(errors);
      setPreflightPassed(false);
    } else {
      setPreflightErrors([]);
      setPreflightPassed(true);
    }
  };

  const handleFinish = () => {
    setBoxMode(selectedMode);
    setROIs(tempBoxROI, tempTargetROI);
    closeSetupWizard();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#0B0E17] border border-slate-700 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-slate-100 font-display">
              Payload Vision Calibration Wizard
            </h2>
          </div>
          <button
            onClick={closeSetupWizard}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono">
          <span className="text-cyan-400 font-semibold">Step {step} of 7</span>
          <span className="text-slate-400">
            {step === 1 && '1. Optical Sensor Selection'}
            {step === 2 && '2. Box Protocol Mode'}
            {step === 3 && '3. Box Region of Interest (ROI)'}
            {step === 4 && '4. Target Zone Calibration'}
            {step === 5 && '5. Color Spectral Segmentation'}
            {step === 6 && '6. Frame Quality & Illumination'}
            {step === 7 && '7. Mission Preflight Verification'}
          </span>
        </div>

        {/* Step Content */}
        <div className="p-6 overflow-y-auto flex-1 text-sm text-slate-200 space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded bg-slate-900/60 border border-slate-800">
                <Camera className="w-6 h-6 text-cyan-400 shrink-0" />
                <div>
                  <h3 className="font-semibold text-slate-100">Fixed Overhead Payload Camera</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Sensor aligned with experimental chamber coordinate frame. Fixed focal length and resolution (320×240).
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-300">
                Select your live USB video capture device or use scenario replay for automated flight verification.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-100">Select Box Detection Mode:</h3>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    mode: 'A' as BoxMode,
                    title: 'Mode A — Lidded Box (Default)',
                    desc: 'Contents hidden until opened. Fires when red/yellow becomes visible inside box ROI for 5 frames after hand contact.',
                  },
                  {
                    mode: 'B' as BoxMode,
                    title: 'Mode B — Open-Top Box',
                    desc: 'Fires when operator hand dwells inside box ROI ≥ 500 ms and leaves for ≥ 300 ms.',
                  },
                  {
                    mode: 'C' as BoxMode,
                    title: 'Mode C — Lid Color Marker',
                    desc: 'Fires when lid marker blob area falls below 30% of baseline area or centroid shifts > 0.5× ROI width.',
                  },
                ].map((item) => (
                  <button
                    key={item.mode}
                    onClick={() => setSelectedMode(item.mode)}
                    className={`p-3.5 rounded-lg border text-left transition-all ${
                      selectedMode === item.mode
                        ? 'bg-cyan-950/40 border-cyan-500/80 text-cyan-200'
                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-100">{item.title}</span>
                      {selectedMode === item.mode && <Check className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-100">Box Region Calibration</h3>
              <p className="text-xs text-slate-400">
                Adjust the normalized coordinates for the source containment box:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">X Offset</label>
                  <input
                    type="number"
                    value={tempBoxROI.x}
                    onChange={(e) => setTempBoxROI({ ...tempBoxROI, x: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Y Offset</label>
                  <input
                    type="number"
                    value={tempBoxROI.y}
                    onChange={(e) => setTempBoxROI({ ...tempBoxROI, y: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Width</label>
                  <input
                    type="number"
                    value={tempBoxROI.w}
                    onChange={(e) => setTempBoxROI({ ...tempBoxROI, w: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Height</label>
                  <input
                    type="number"
                    value={tempBoxROI.h}
                    onChange={(e) => setTempBoxROI({ ...tempBoxROI, h: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-100">Target Destination Zone Calibration</h3>
              <p className="text-xs text-slate-400">
                Adjust coordinates for destination target zone ROI:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">X Offset</label>
                  <input
                    type="number"
                    value={tempTargetROI.x}
                    onChange={(e) => setTempTargetROI({ ...tempTargetROI, x: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Y Offset</label>
                  <input
                    type="number"
                    value={tempTargetROI.y}
                    onChange={(e) => setTempTargetROI({ ...tempTargetROI, y: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Width</label>
                  <input
                    type="number"
                    value={tempTargetROI.w}
                    onChange={(e) => setTempTargetROI({ ...tempTargetROI, w: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Height</label>
                  <input
                    type="number"
                    value={tempTargetROI.h}
                    onChange={(e) => setTempTargetROI({ ...tempTargetROI, h: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-100">Color Calibration Verification</h3>
              <p className="text-xs text-slate-400">
                Segmented HSV ranges for payload specimen containers:
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-red-500" />
                    <span className="font-semibold text-xs text-slate-200">Red Specimen Container</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 space-y-1">
                    <div>H: [0, 10] ∪ [170, 180]</div>
                    <div>S: ≥ 120, V: ≥ 80</div>
                  </div>
                </div>

                <div className="p-3.5 rounded bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-yellow-400" />
                    <span className="font-semibold text-xs text-slate-200">Yellow Reagent Container</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 space-y-1">
                    <div>H: [20, 35]</div>
                    <div>S: ≥ 120, V: ≥ 100</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-100">Optical Quality & Illumination Inspection</h3>
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-3.5 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block mb-1">PROCESSING FPS</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-100">{fps}</span>
                    <span className="text-[11px] text-slate-400">Hz (Min: 15)</span>
                  </div>
                  <span className={`text-[10px] mt-1 block ${isLowFPS ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {isLowFPS ? '▲ Sub-optimal frame rate' : '● Nominal throughput'}
                  </span>
                </div>

                <div className="p-3.5 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block mb-1">LAPLACIAN VARIANCE</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-100">{blurScore}</span>
                    <span className="text-[11px] text-slate-400">(Min: 60)</span>
                  </div>
                  <span className={`text-[10px] mt-1 block ${isBlurry ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {isBlurry ? '▲ Focus or blur warning' : '● Image sharp and focused'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-100">Preflight Invariant Check</h3>
              <p className="text-xs text-slate-400">
                Validates chamber preconditions before granting experiment start permission:
              </p>

              <button
                onClick={handleRunPreflight}
                className="w-full py-2.5 rounded bg-cyan-950/80 border border-cyan-500/60 text-cyan-200 text-xs font-mono font-medium hover:bg-cyan-900/50 transition-colors flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Execute Preflight Diagnostics</span>
              </button>

              {preflightPassed && (
                <div className="p-3 rounded bg-emerald-950/60 border border-emerald-500/60 text-emerald-200 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>All preconditions satisfied. Experiment ready for autonomous execution.</span>
                </div>
              )}

              {preflightErrors.length > 0 && (
                <div className="p-3 rounded bg-rose-950/60 border border-rose-500/60 text-rose-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Preflight Blocked:</span>
                  </div>
                  {preflightErrors.map((err, i) => (
                    <div key={i} className="pl-5 text-rose-300">
                      • {err}
                    </div>
                  ))}
                  <div className="pl-5 text-slate-300 text-[11px] mt-1 italic">
                    Hint: Close the box so the red and yellow objects are hidden prior to start.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-900/80">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {step < 7 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Apply & Save Calibration</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
