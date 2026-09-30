import React, { useState } from 'react';
import { useAegisStore } from '../store/useAegisStore';
import { FSMOutcome } from '../types';
import {
  Download,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  ThumbsUp,
  ThumbsDown,
  Trash2,
} from 'lucide-react';

export const EventLogScreen: React.FC = () => {
  const { logger, events } = useAegisStore();

  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const metrics = logger.getMetrics();

  const handleExportJSON = () => {
    const jsonStr = logger.exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aegis_telemetry_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const csvStr = logger.exportCSV();
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aegis_telemetry_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredEvents = events.filter((e) => {
    if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      e.action.toLowerCase().includes(term) ||
      e.expected.toLowerCase().includes(term) ||
      e.status.toLowerCase().includes(term) ||
      e.timestamp.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Export Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#0B0E17] border border-slate-800">
        <div>
          <h1 className="text-base font-bold text-slate-100 font-display flex items-center gap-2">
            Flight Telemetry &amp; Verification Audit Log
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable flight event log with millisecond timestamping, latency auditing, and operator review.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJSON}
            disabled={events.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-mono transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={events.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-mono transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => logger.clear()}
            disabled={events.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-rose-900/60 disabled:opacity-40 text-slate-400 hover:text-rose-200 text-xs font-mono transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Audit Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
        <div className="p-4 rounded-xl bg-[#0B0E17] border border-slate-800">
          <span className="text-slate-400 block text-[11px] mb-1">TOTAL EVENTS LOGGED</span>
          <span className="text-2xl font-bold text-slate-100">{metrics.totalEvents}</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0B0E17] border border-slate-800">
          <span className="text-slate-400 block text-[11px] mb-1">STEP ACCURACY</span>
          {metrics.stepAccuracy !== null ? (
            <span className="text-2xl font-bold text-emerald-400">{metrics.stepAccuracy}%</span>
          ) : (
            <span className="text-xs text-slate-400">No runs recorded yet</span>
          )}
        </div>

        <div className="p-4 rounded-xl bg-[#0B0E17] border border-slate-800">
          <span className="text-slate-400 block text-[11px] mb-1">FALSE ALERTS REVIEWED</span>
          <span className="text-2xl font-bold text-cyan-400">{metrics.falseAlerts}</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0B0E17] border border-slate-800">
          <span className="text-slate-400 block text-[11px] mb-1">AVG ALERT DELAY</span>
          {metrics.avgAlertLatency !== null ? (
            <span className="text-2xl font-bold text-purple-400">{metrics.avgAlertLatency} ms</span>
          ) : (
            <span className="text-xs text-slate-400">No runs recorded yet</span>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-[#0B0E17] border border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, expected step, or status..."
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="OUT_OF_SEQUENCE">OUT_OF_SEQUENCE</option>
            <option value="SKIPPED_STEP">SKIPPED_STEP</option>
            <option value="REPEATED_STEP">REPEATED_STEP</option>
            <option value="LOST">LOST</option>
            <option value="WRONG_OBJECT_OR_ZONE">WRONG_OBJECT_OR_ZONE</option>
            <option value="UNCERTAIN">UNCERTAIN</option>
          </select>
        </div>
      </div>

      {/* Telemetry Table */}
      <div className="rounded-xl bg-[#0B0E17] border border-slate-800 overflow-hidden shadow-lg">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-slate-400">
            No runs recorded yet. Start the experiment or run test scenarios to populate the flight log.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 w-8"></th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Step</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Expected</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Confidence</th>
                  <th className="py-2.5 px-3 text-right">Latency</th>
                  <th className="py-2.5 px-4 text-center">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEvents.map((ev, idx) => {
                  const isExpanded = expandedIndex === idx;
                  const isSuccess = ev.status === 'SUCCESS';
                  const isAlert = !isSuccess && ev.status !== 'UNCERTAIN';

                  return (
                    <React.Fragment key={idx}>
                      <tr
                        onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                        className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-4 text-slate-400">
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{ev.timestamp}</td>
                        <td className="py-2.5 px-3 text-slate-400">0{ev.step}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-100">{ev.action}</td>
                        <td className="py-2.5 px-3 text-slate-400">{ev.expected}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              isSuccess
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                : ev.status === 'LOST'
                                ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                                : ev.status === 'UNCERTAIN'
                                ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                                : 'bg-rose-950/80 text-rose-300 border-rose-800'
                            }`}
                          >
                            {ev.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-200">
                          {(ev.confidence * 100).toFixed(0)}%
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400">
                          {ev.latencyMs ? `${ev.latencyMs} ms` : '—'}
                        </td>
                        <td
                          className="py-2.5 px-4 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isAlert && (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => logger.updateAlertReview(idx, 'valid')}
                                className={`p-1 rounded transition-colors ${
                                  ev.alertReview === 'valid'
                                    ? 'bg-emerald-900 text-emerald-300 border border-emerald-500'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                }`}
                                title="Confirm Alert Valid"
                              >
                                <ThumbsUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => logger.updateAlertReview(idx, 'false')}
                                className={`p-1 rounded transition-colors ${
                                  ev.alertReview === 'false'
                                    ? 'bg-rose-900 text-rose-300 border border-rose-500'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                }`}
                                title="Mark False Alert"
                              >
                                <ThumbsDown className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Row Expand View (Raw JSON + Forensic Evidence) */}
                      {isExpanded && (
                        <tr className="bg-slate-900/70 border-b border-slate-800">
                          <td colSpan={9} className="p-4 text-xs font-mono space-y-3">
                            <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1.5">
                              <span className="uppercase tracking-wider">Raw Telemetry Packet &amp; Evidence</span>
                              <span>FSM Index: {ev.step}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <span className="text-slate-400 block mb-1">Standard Telemetry JSON:</span>
                                <pre className="p-3 rounded bg-black/60 border border-slate-800 text-cyan-300 text-[11px] overflow-x-auto leading-relaxed">
{JSON.stringify(
  {
    timestamp: ev.timestamp,
    step: ev.step,
    action: ev.action,
    expected: ev.expected,
    status: ev.status,
    confidence: ev.confidence,
  },
  null,
  2
)}
                                </pre>
                              </div>

                              <div className="space-y-2">
                                <span className="text-slate-400 block mb-1">Forensic Analysis:</span>
                                <div className="p-3 rounded bg-black/60 border border-slate-800 text-slate-300 text-[11px] space-y-2">
                                  <div>
                                    <span className="text-slate-400">Explanation: </span>
                                    <span>{ev.explanation || 'State transition verified with trajectory continuity.'}</span>
                                  </div>
                                  {ev.components && (
                                    <div>
                                      <span className="text-slate-400">Confidence Components: </span>
                                      <span>
                                        State: {(ev.components.state * 100).toFixed(0)}%, Contact: {(ev.components.contact * 100).toFixed(0)}%, Temporal: {(ev.components.temporal * 100).toFixed(0)}%
                                      </span>
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-slate-400">Run Type: </span>
                                    <span>{ev.runType || 'Correct Run'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
