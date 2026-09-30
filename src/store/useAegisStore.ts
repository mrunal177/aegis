import { create } from 'zustand';
import { CONFIG, DEFAULT_BOX_ROI, DEFAULT_TARGET_ROI } from '../config';
import { PRIMARY_PROTOCOL } from '../data/protocols';
import { EventDetector } from '../engine/eventDetector';
import { FSMEngine } from '../engine/fsmEngine';
import { Logger } from '../engine/logger';
import { SpokenLine, VoiceQueue } from '../engine/voiceQueue';
import { GeminiService, SceneInterpretation } from '../services/geminiService';
import { GroundLinkService, GroundLinkStatus } from '../services/groundLink';
import {
  BoxMode,
  ColorCalibration,
  FSMOutcome,
  ProtocolConfig,
  RegionOfInterest,
  StepStatus,
  TrackedObject,
} from '../types';

export type ScreenId =
  | 'overview'
  | 'live'
  | 'verification'
  | 'protocol'
  | 'events'
  | 'recordings'
  | 'model'
  | 'architecture'
  | 'tests';

export interface RecordedSegment {
  id: string;
  timestamp: string;
  durationSec: number;
  sizeBytes: number;
  url: string;
  blob: Blob;
}

export interface AegisState {
  // Navigation
  activeScreen: ScreenId;
  setActiveScreen: (screen: ScreenId) => void;

  // Singletons
  logger: Logger;
  voice: VoiceQueue;
  detector: EventDetector;
  fsm: FSMEngine;
  gemini: GeminiService;
  groundLink: GroundLinkService;

  // Telemetry & FSM
  protocol: ProtocolConfig;
  fsmIdx: number;
  activeAlert: {
    status: StepStatus;
    message: string;
    object?: string;
    time: number;
  } | null;
  isPaused: boolean;
  isComplete: boolean;
  runType: 'correct' | 'error';
  lastOutcome: FSMOutcome | null;
  events: FSMOutcome[];
  transcript: SpokenLine[];

  // Perception
  trackedObjects: TrackedObject[];
  fps: number;
  blurScore: number;
  isBlurry: boolean;
  isLowFPS: boolean;
  handMode: 'vision' | 'fallback';
  boxMode: BoxMode;
  boxROI: RegionOfInterest;
  targetROI: RegionOfInterest;
  colors: ColorCalibration;

  // Source & Replay
  sourceMode: 'live' | 'replay';
  activeScenarioId: string;
  isReplayRunning: boolean;
  replayProgress: number; // 0 to 1

  // Ground link
  groundStatus: GroundLinkStatus;

  // Advisory AI
  sceneInterpretation: SceneInterpretation | null;

  // Setup Wizard & Guided Walkthrough
  isSetupWizardOpen: boolean;
  isWalkthroughActive: boolean;
  walkthroughStep: number;

  // Recording
  isRecording: boolean;
  recordings: RecordedSegment[];
  totalVideoBytes: number;

  // Actions
  setProtocol: (p: ProtocolConfig) => void;
  setRunType: (t: 'correct' | 'error') => void;
  setSourceMode: (m: 'live' | 'replay') => void;
  setBoxMode: (m: BoxMode) => void;
  setROIs: (box: RegionOfInterest, target: RegionOfInterest) => void;
  setColors: (colors: ColorCalibration) => void;
  openSetupWizard: () => void;
  closeSetupWizard: () => void;
  startWalkthrough: () => void;
  stopWalkthrough: () => void;
  nextWalkthroughStep: () => void;
  prevWalkthroughStep: () => void;
  addRecordingSegment: (seg: RecordedSegment) => void;
  clearRecordings: () => void;
  toggleRecording: () => void;
  startExperiment: () => void;
  pauseExperiment: () => void;
  resumeExperiment: () => void;
  resetExperiment: () => void;
  clearAlert: () => void;
}

// Instantiate engine core
const initialLogger = new Logger();
const initialVoice = new VoiceQueue();
const initialDetector = new EventDetector();
const initialFsm = new FSMEngine(initialLogger, initialVoice, PRIMARY_PROTOCOL);
const initialGemini = new GeminiService();
const initialGroundLink = new GroundLinkService();

export const useAegisStore = create<AegisState>((set, get) => {
  // Sync Logger to state
  initialLogger.subscribe((events) => {
    set({ events });
  });

  // Sync Voice transcripts to state
  initialVoice['onTranscriptUpdate'] = (transcript) => {
    set({ transcript: [...transcript] });
  };

  // Sync FSM snapshots
  initialFsm.subscribe((snap) => {
    set({
      fsmIdx: snap.idx,
      activeAlert: snap.activeAlert,
      isPaused: snap.isPaused,
      isComplete: snap.isComplete,
      runType: snap.runType,
      lastOutcome: snap.lastOutcome,
    });
  });

  // Sync Ground Link status
  initialGroundLink.subscribe((groundStatus) => {
    set({ groundStatus });
  });

  return {
    activeScreen: 'overview',
    setActiveScreen: (screen) => set({ activeScreen: screen }),

    logger: initialLogger,
    voice: initialVoice,
    detector: initialDetector,
    fsm: initialFsm,
    gemini: initialGemini,
    groundLink: initialGroundLink,

    protocol: PRIMARY_PROTOCOL,
    fsmIdx: 0,
    activeAlert: null,
    isPaused: false,
    isComplete: false,
    runType: 'correct',
    lastOutcome: null,
    events: [],
    transcript: [],

    trackedObjects: [],
    fps: 24,
    blurScore: 110,
    isBlurry: false,
    isLowFPS: false,
    handMode: 'vision',
    boxMode: 'A',
    boxROI: { ...DEFAULT_BOX_ROI },
    targetROI: { ...DEFAULT_TARGET_ROI },
    colors: {
      red: [
        { hMin: 0, hMax: 10, sMin: 120, sMax: 255, vMin: 80, vMax: 255 },
        { hMin: 170, hMax: 180, sMin: 120, sMax: 255, vMin: 80, vMax: 255 },
      ],
      yellow: [
        { hMin: 20, hMax: 35, sMin: 120, sMax: 255, vMin: 100, vMax: 255 },
      ],
    },

    sourceMode: 'replay',
    activeScenarioId: 'TC-01',
    isReplayRunning: false,
    replayProgress: 0,

    groundStatus: initialGroundLink.getStatus(),
    sceneInterpretation: null,

    isSetupWizardOpen: false,
    isWalkthroughActive: false,
    walkthroughStep: 0,

    isRecording: false,
    recordings: [],
    totalVideoBytes: 0,

    setProtocol: (protocol) => {
      get().fsm.setProtocol(protocol);
      set({ protocol });
    },

    setRunType: (runType) => {
      get().fsm.setRunType(runType);
      set({ runType });
    },

    setSourceMode: (sourceMode) => set({ sourceMode }),

    setBoxMode: (boxMode) => {
      get().detector.setBoxMode(boxMode);
      set({ boxMode });
    },

    setROIs: (boxROI, targetROI) => {
      get().detector.boxROI = boxROI;
      get().detector.targetROI = targetROI;
      set({ boxROI, targetROI });
    },

    setColors: (colors) => {
      get().detector.colors = colors;
      set({ colors });
    },

    openSetupWizard: () => set({ isSetupWizardOpen: true }),
    closeSetupWizard: () => set({ isSetupWizardOpen: false }),

    startWalkthrough: () => set({ isWalkthroughActive: true, walkthroughStep: 0 }),
    stopWalkthrough: () => set({ isWalkthroughActive: false }),
    nextWalkthroughStep: () =>
      set((state) => ({ walkthroughStep: Math.min(10, state.walkthroughStep + 1) })),
    prevWalkthroughStep: () =>
      set((state) => ({ walkthroughStep: Math.max(0, state.walkthroughStep - 1) })),

    addRecordingSegment: (seg) =>
      set((state) => ({
        recordings: [seg, ...state.recordings],
        totalVideoBytes: state.totalVideoBytes + seg.sizeBytes,
      })),

    clearRecordings: () => set({ recordings: [], totalVideoBytes: 0 }),

    toggleRecording: () => set((state) => ({ isRecording: !state.isRecording })),

    startExperiment: () => {
      get().fsm.startExperiment();
    },

    pauseExperiment: () => {
      const f = get().fsm;
      f.isPaused = true;
      set({ isPaused: true });
    },

    resumeExperiment: () => {
      const f = get().fsm;
      f.isPaused = false;
      set({ isPaused: false });
    },

    resetExperiment: () => {
      get().fsm.reset();
      get().detector.reset();
      set({ fsmIdx: 0, isPaused: false, activeAlert: null, isComplete: false });
    },

    clearAlert: () => {
      get().fsm.clearAlert('Action verified. Resuming.');
    },
  };
});
