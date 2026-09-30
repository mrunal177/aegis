import React, { useEffect, useRef, useState } from 'react';
import { useAegisStore } from '../store/useAegisStore';
import { CONFIG } from '../config';
import { buildScenario } from '../engine/testScenarios';
import { PerceptionFrame, TrackedObject } from '../types';
import { Camera, RefreshCw, AlertTriangle, Play, Pause } from 'lucide-react';

interface VideoStageProps {
  onFrameCaptured?: (canvas: HTMLCanvasElement) => void;
}

export const VideoStage: React.FC<VideoStageProps> = ({ onFrameCaptured }) => {
  const {
    sourceMode,
    activeScenarioId,
    fsmIdx,
    protocol,
    detector,
    fsm,
    boxROI,
    targetROI,
    boxMode,
    handMode,
    activeAlert,
    isPaused,
    gemini,
  } = useAegisStore();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [cameraAvailable, setCameraAvailable] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [replayIdx, setReplayIdx] = useState<number>(0);
  const [isReplayPlaying, setIsReplayPlaying] = useState<boolean>(true);
  const [replayFrames, setReplayFrames] = useState<PerceptionFrame[]>([]);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Enumerate camera devices
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoDevs = devices.filter((d) => d.kind === 'videoinput');
          setCameraDevices(videoDevs);
          if (videoDevs.length > 0 && !selectedDeviceId) {
            setSelectedDeviceId(videoDevs[0].deviceId);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Initialize camera when in live mode
  useEffect(() => {
    if (sourceMode !== 'live') {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      return;
    }

    let activeStream: MediaStream | null = null;
    const constraints: MediaStreamConstraints = {
      video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : { width: 640, height: 480 },
      audio: false,
    };

    navigator.mediaDevices
      ?.getUserMedia(constraints)
      .then((stream) => {
        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setCameraAvailable(true);
        setCameraError(null);
      })
      .catch((err) => {
        setCameraAvailable(false);
        setCameraError(err.message || 'Camera permission denied or camera unavailable');
      });

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [sourceMode, selectedDeviceId]);

  // Load scenario frames when scenario changes
  useEffect(() => {
    const frames = buildScenario(activeScenarioId);
    setReplayFrames(frames);
    setReplayIdx(0);
    setIsReplayPlaying(true);
  }, [activeScenarioId]);

  // Main rendering & perception loop (~20 FPS)
  useEffect(() => {
    let lastRenderT = 0;
    let localReplayIdx = replayIdx;

    const renderLoop = (timestamp: number) => {
      animFrameRef.current = requestAnimationFrame(renderLoop);

      // Throttle to ~25-30 FPS (~33ms)
      if (timestamp - lastRenderT < 32) return;
      lastRenderT = timestamp;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const W = CONFIG.PROC_W;
      const H = CONFIG.PROC_H;

      let currentFrame: PerceptionFrame | null = null;

      if (sourceMode === 'replay' && replayFrames.length > 0) {
        if (isReplayPlaying) {
          localReplayIdx = (localReplayIdx + 1) % replayFrames.length;
          setReplayIdx(localReplayIdx);
        }
        currentFrame = replayFrames[localReplayIdx];

        // Draw synthetic frame background
        ctx.fillStyle = '#080C14';
        ctx.fillRect(0, 0, W, H);

        // Draw subtle microgravity experimental chamber grid
        ctx.strokeStyle = '#131B2E';
        ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 32) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, H);
          ctx.stroke();
        }
        for (let y = 0; y < H; y += 32) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(W, y);
          ctx.stroke();
        }

        // Draw objects
        if (currentFrame.red.visible) {
          ctx.fillStyle = '#EF4444';
          ctx.fillRect(
            currentFrame.red.centroid.x - 12,
            currentFrame.red.centroid.y - 12,
            24,
            24
          );
          ctx.strokeStyle = '#FCA5A5';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(
            currentFrame.red.centroid.x - 12,
            currentFrame.red.centroid.y - 12,
            24,
            24
          );
        }

        if (currentFrame.yellow.visible) {
          ctx.fillStyle = '#EAB308';
          ctx.fillRect(
            currentFrame.yellow.centroid.x - 12,
            currentFrame.yellow.centroid.y - 12,
            24,
            24
          );
          ctx.strokeStyle = '#FEF08A';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(
            currentFrame.yellow.centroid.x - 12,
            currentFrame.yellow.centroid.y - 12,
            24,
            24
          );
        }

        // Draw hand landmarks
        if (currentFrame.hand.present && currentFrame.hand.fingertips.length > 0) {
          ctx.fillStyle = '#06B6D4';
          for (const pt of currentFrame.hand.fingertips) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          if (currentFrame.hand.palmCenter) {
            ctx.beginPath();
            ctx.arc(currentFrame.hand.palmCenter.x, currentFrame.hand.palmCenter.y, 6, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        // Run perception pipeline with frame
        const res = detector.processFrame(
          currentFrame.t,
          currentFrame.red,
          currentFrame.yellow,
          currentFrame.hand,
          fsm.idx,
          currentFrame.boxOpenSignal,
          currentFrame.lidArea
        );

        if (res.lostDetected) {
          fsm.handleLost(res.lostDetected.object, res.lostDetected.t);
        }
        if (res.wrongZoneDetected) {
          fsm.handleWrongZone(res.wrongZoneDetected.object, res.wrongZoneDetected.t);
        }
        for (const ev of res.events) {
          fsm.onAction(ev);
        }

        fsm.updateStates(
          {
            red: detector.getObjectState('red'),
            yellow: detector.getObjectState('yellow'),
          },
          currentFrame.t
        );
      } else if (sourceMode === 'live' && videoRef.current && videoRef.current.readyState >= 2) {
        // Draw live video to processing canvas
        ctx.drawImage(videoRef.current, 0, 0, W, H);
      }

      // Draw Overlay Graphics on top of canvas
      drawOverlay(ctx, W, H, detector, fsm, boxROI, targetROI, handMode);

      if (onFrameCaptured) {
        onFrameCaptured(canvas);
      }
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [
    sourceMode,
    replayFrames,
    isReplayPlaying,
    detector,
    fsm,
    boxROI,
    targetROI,
    handMode,
    onFrameCaptured,
  ]);

  // Helper to draw overlaid HUD bounding boxes & instructions
  const drawOverlay = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    det: typeof detector,
    fsmEngine: typeof fsm,
    bROI: typeof boxROI,
    tROI: typeof targetROI,
    hMode: 'vision' | 'fallback'
  ) => {
    // 1. Box ROI (dashed cyan)
    ctx.strokeStyle = '#06B6D4';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(bROI.x, bROI.y, bROI.w, bROI.h);
    ctx.setLineDash([]);
    ctx.fillStyle = '#06B6D4';
    ctx.font = '10px monospace';
    ctx.fillText('BOX REGION [ROI#0]', bROI.x + 4, bROI.y + 12);

    // 2. Target Zone (dashed emerald)
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(tROI.x, tROI.y, tROI.w, tROI.h);
    ctx.setLineDash([]);
    ctx.fillStyle = '#10B981';
    ctx.fillText('TARGET ZONE [ROI#1]', tROI.x + 4, tROI.y + 12);

    // 3. Tracked Objects (Bounding boxes, label, state chip, payload-relative x/y)
    const tracked = det.getTrackedObjects();
    for (const obj of tracked) {
      if (!obj.visible) continue;
      const isRed = obj.label === 'red';
      const colorHex = isRed ? '#EF4444' : '#EAB308';

      // Bounding box
      ctx.strokeStyle = colorHex;
      ctx.lineWidth = 2;
      ctx.strokeRect(obj.bbox.x, obj.bbox.y, obj.bbox.w, obj.bbox.h);

      // Trajectory trail
      if (obj.trajectory.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = isRed ? 'rgba(239, 68, 68, 0.4)' : 'rgba(234, 179, 8, 0.4)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < obj.trajectory.length; i++) {
          const pt = obj.trajectory[i];
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }

      // Payload-relative normalized coords (0-1 relative to Box ROI)
      const relX = ((obj.centroid.x - bROI.x) / bROI.w).toFixed(2);
      const relY = ((obj.centroid.y - bROI.y) / bROI.h).toFixed(2);

      // Object label header
      ctx.fillStyle = 'rgba(11, 14, 23, 0.85)';
      ctx.fillRect(obj.bbox.x, Math.max(0, obj.bbox.y - 18), 120, 16);
      ctx.fillStyle = colorHex;
      ctx.font = '10px monospace';
      ctx.fillText(
        `${obj.id.toUpperCase()} · ${obj.state} · (${relX},${relY})`,
        obj.bbox.x + 2,
        Math.max(12, obj.bbox.y - 5)
      );
    }

    // 4. Payload Axes Widget in top right
    const axisX = w - 42;
    const axisY = 32;
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(axisX, axisY);
    ctx.lineTo(axisX + 22, axisY); // +X
    ctx.moveTo(axisX, axisY);
    ctx.lineTo(axisX, axisY + 22); // +Y
    ctx.stroke();
    ctx.fillStyle = '#94A3B8';
    ctx.font = '9px monospace';
    ctx.fillText('+X', axisX + 24, axisY + 3);
    ctx.fillText('+Y', axisX - 2, axisY + 32);
    ctx.fillText('PAYLOAD REF', axisX - 35, axisY - 8);

    // 5. Hand fallback indicator
    if (hMode === 'fallback') {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
      ctx.fillRect(4, h - 22, 170, 18);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('MOTION FALLBACK TRACKING', 8, h - 9);
    }
  };

  // Compute top instruction banner text & hint
  const currentStep = fsm.getCurrentExpectedStep();
  let detectionHint = 'Awaiting step verification';
  if (fsmIdx === 0) {
    detectionHint = 'Waiting for box to open — red/yellow not yet visible in box region';
  } else if (fsmIdx === 1) {
    detectionHint = 'Grasp and lift the red object from the box region';
  } else if (fsmIdx === 2) {
    detectionHint = 'Transfer and release red object inside target zone';
  } else if (fsmIdx === 3) {
    detectionHint = 'Grasp and lift yellow object from the box region';
  } else if (fsmIdx === 4) {
    detectionHint = 'Transfer and release yellow object inside target zone';
  } else if (fsm.isComplete()) {
    detectionHint = 'Experiment procedure completed';
  }

  return (
    <div className="relative flex flex-col bg-[#07090E] border border-slate-800 rounded-lg overflow-hidden shadow-xl">
      {/* Top Instruction Banner */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/90 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2 truncate">
          <span className="font-mono text-cyan-400 font-semibold uppercase tracking-wider">
            STEP {fsmIdx + 1}/{protocol.steps.length}:
          </span>
          <span className="text-slate-100 font-medium truncate">
            {currentStep?.voice || 'Experiment Complete'}
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400 hidden sm:inline ml-2 shrink-0">
          {detectionHint}
        </span>
      </div>

      {/* Main Canvas Area */}
      <div className="relative w-full aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
        {/* Hidden video element for live webcam feed */}
        <video
          ref={videoRef}
          playsInline
          muted
          className="hidden"
          width={CONFIG.PROC_W}
          height={CONFIG.PROC_H}
        />

        {/* Composited Processing & Display Canvas */}
        <canvas
          ref={canvasRef}
          width={CONFIG.PROC_W}
          height={CONFIG.PROC_H}
          className="w-full h-full object-contain"
        />

        {/* Alert Ribbon Banner (aria-live="assertive") */}
        {activeAlert && (
          <div
            role="alert"
            aria-live="assertive"
            className="absolute top-2 inset-x-2 p-2.5 rounded bg-rose-950/90 border border-rose-500/80 text-rose-200 text-xs flex items-center justify-between backdrop-blur-md shadow-lg"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <span className="font-mono font-bold tracking-wider mr-2 text-rose-300">
                  {activeAlert.status}:
                </span>
                <span>{activeAlert.message}</span>
              </div>
            </div>
          </div>
        )}

        {/* Hand Fallback Banner */}
        {handMode === 'fallback' && (
          <div className="absolute bottom-2 left-2 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/50 text-amber-300">
            Hand tracking unavailable — using object-motion tracking
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900/90 border-t border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          {sourceMode === 'replay' ? (
            <>
              <button
                onClick={() => setIsReplayPlaying(!isReplayPlaying)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono transition-colors"
              >
                {isReplayPlaying ? <Pause className="w-3.5 h-3.5 text-cyan-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{isReplayPlaying ? 'Pause Replay' : 'Play Replay'}</span>
              </button>
              <span className="text-[11px] font-mono text-slate-400">
                Frame {replayIdx + 1}/{replayFrames.length}
              </span>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              {cameraDevices.length > 0 ? (
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
                >
                  {cameraDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-slate-400 font-mono">Live Video Stream</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
          <span>Resolution: 320×240</span>
          <span>Target: 20-30 FPS</span>
        </div>
      </div>
    </div>
  );
};
