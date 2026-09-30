import React from 'react';
import { useAegisStore } from './store/useAegisStore';
import { Navigation } from './components/Navigation';
import { SetupWizard } from './components/SetupWizard';
import { GuidedWalkthrough } from './components/GuidedWalkthrough';

import { OverviewScreen } from './screens/OverviewScreen';
import { LiveMonitorScreen } from './screens/LiveMonitorScreen';
import { VerificationLabScreen } from './screens/VerificationLabScreen';
import { ProtocolScreen } from './screens/ProtocolScreen';
import { EventLogScreen } from './screens/EventLogScreen';
import { RecordingsStreamScreen } from './screens/RecordingsStreamScreen';
import { ModelDatasetScreen } from './screens/ModelDatasetScreen';
import { ArchitectureScreen } from './screens/ArchitectureScreen';
import { TestCenterScreen } from './screens/TestCenterScreen';

export const App: React.FC = () => {
  const { activeScreen } = useAegisStore();

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Bar Contract (1 row, 3 zones) */}
      <Navigation />

      {/* Main Workspace Stage */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-6">
        {activeScreen === 'overview' && <OverviewScreen />}
        {activeScreen === 'live' && <LiveMonitorScreen />}
        {activeScreen === 'verification' && <VerificationLabScreen />}
        {activeScreen === 'protocol' && <ProtocolScreen />}
        {activeScreen === 'events' && <EventLogScreen />}
        {activeScreen === 'recordings' && <RecordingsStreamScreen />}
        {activeScreen === 'model' && <ModelDatasetScreen />}
        {activeScreen === 'architecture' && <ArchitectureScreen />}
        {activeScreen === 'tests' && <TestCenterScreen />}
      </main>

      {/* Setup Wizard Modal */}
      <SetupWizard />

      {/* Guided Walkthrough Floating Tour Controller & Summary Modal */}
      <GuidedWalkthrough />

      {/* Subtle Aerospace Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-[#07090E] px-6 py-4 text-xs font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span>AEGIS · Autonomous Experiment Guidance &amp; Interaction System</span>
          <span>·</span>
          <span>SIH26174 · Team Mavira52</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Edge Deploy: NVIDIA Jetson Orin Nano</span>
          <span>·</span>
          <span>Fixed Overhead Coordinate Frame</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
