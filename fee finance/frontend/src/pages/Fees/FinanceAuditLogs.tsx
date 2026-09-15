import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  FileCode,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  Layers,
} from 'lucide-react';
import { Badge } from '../../components/Badge';
import { useToast } from '../../components/Toast';
import api from '../../api/client';

interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId?: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  details?: any;
  createdAt: string;
}

const ENTITY_TYPES = [
  { label: 'All Entities', value: 'ALL' },
  { label: 'Fee Category', value: 'FEE_CATEGORY' },
  { label: 'Fee Structure', value: 'FEE_STRUCTURE' },
  { label: 'Payment Plan', value: 'PAYMENT_PLAN' },
  { label: 'Discount Rule', value: 'DISCOUNT_RULE' },
  { label: 'Student Concession', value: 'STUDENT_DISCOUNT' },
  { label: 'Fee Assignment', value: 'FEE_ASSIGNMENT' },
];

const ACTIONS = [
  { label: 'All Actions', value: 'ALL' },
  { label: 'CREATE', value: 'CREATE' },
  { label: 'UPDATE', value: 'UPDATE' },
  { label: 'APPROVE', value: 'APPROVE' },
  { label: 'REJECT', value: 'REJECT' },
  { label: 'DELETE / STATUS', value: 'STATUS_CHANGE' },
];

export const FinanceAuditLogs: React.FC = () => {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityTypeFilter, setEntityTypeFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/fees/audit-logs', {
        params: {
          entityType: entityTypeFilter !== 'ALL' ? entityTypeFilter : undefined,
          action: actionFilter !== 'ALL' ? actionFilter : undefined,
          search: search || undefined,
        },
      });
      setLogs(res.data.auditLogs || res.data.logs || []);
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Failed to fetch audit logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [entityTypeFilter, actionFilter, search, showToast]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Metrics
  const totalLogs = logs.length;
  const updateLogs = logs.filter((l) => l.action === 'UPDATE').length;
  const approvalLogs = logs.filter((l) => l.action === 'APPROVE' || l.action === 'REJECT').length;
  const createLogs = logs.filter((l) => l.action === 'CREATE').length;

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'success';
      case 'UPDATE':
        return 'warning';
      case 'APPROVE':
        return 'success';
      case 'REJECT':
      case 'DELETE':
        return 'danger';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Finance Audit & Governance Trail</h1>
            <Badge variant="info" size="sm">Module 6</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Immutable system logs tracking financial configurations, structure edits, policy concessions, and approval trails.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Audit Events</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalLogs}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Recorded actions</p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Configuration Creates</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{createLogs}</h3>
            <p className="text-xs text-emerald-600 mt-0.5 font-medium">New entity entries</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Modifications / Updates</p>
            <h3 className="text-2xl font-bold text-amber-700 mt-1">{updateLogs}</h3>
            <p className="text-xs text-amber-600 mt-0.5 font-medium">Old vs New changes</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <FileCode className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Governance Approvals</p>
            <h3 className="text-2xl font-bold text-teal-700 mt-1">{approvalLogs}</h3>
            <p className="text-xs text-teal-600 mt-0.5 font-medium">Discounts & waivers</p>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by entity, user, or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            className="text-xs border-slate-300 rounded-lg py-1.5 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
          >
            {ENTITY_TYPES.map((et) => (
              <option key={et.value} value={et.value}>
                {et.label}
              </option>
            ))}
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs border-slate-300 rounded-lg py-1.5 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
          >
            {ACTIONS.map((act) => (
              <option key={act.value} value={act.value}>
                {act.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity Type & ID</th>
                <th className="py-3 px-4">Modified By</th>
                <th className="py-3 px-4">Change Summary / Remarks</th>
                <th className="py-3 px-4 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    <RotateCcw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading audit trail entries...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No finance audit records found matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const summaryText =
                    typeof log.details === 'object'
                      ? log.details?.reason ||
                        log.details?.remarks ||
                        log.details?.name ||
                        (log.details?.oldValue && log.details?.newValue ? 'Field updates recorded' : JSON.stringify(log.details))
                      : String(log.details || '—');

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        <div className="font-mono text-slate-900 font-medium">
                          {new Date(log.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(log.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <Badge variant={getActionBadgeVariant(log.action)} size="sm">
                          {log.action}
                        </Badge>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-emerald-600" />
                          {log.entityType}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 truncate max-w-[140px]">
                          {log.entityId}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {log.user?.name || 'System Administrator'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {log.user?.role || 'FINANCE'}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-700 max-w-xs truncate font-medium">
                        {summaryText}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Inspect Old vs New Diff"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Diff Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-end animate-fadeIn">
          <div className="w-full max-w-2xl bg-white min-h-screen shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div>
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-6 sticky top-0 z-10 flex items-center justify-between border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">Audit Event Inspection</h2>
                    <Badge variant={getActionBadgeVariant(selectedLog.action)} size="sm">
                      {selectedLog.action}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedLog.entityType} • Log ID: {selectedLog.id}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Meta info */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Timestamp:</span>
                    <span className="font-semibold text-slate-900">
                      {new Date(selectedLog.createdAt).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Operator / User:</span>
                    <span className="font-semibold text-slate-900">
                      {selectedLog.user?.name || 'Admin'} ({selectedLog.user?.email || 'N/A'})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Target Entity ID:</span>
                    <span className="font-mono text-slate-800">{selectedLog.entityId}</span>
                  </div>
                </div>

                {/* Old vs New Diff Comparison */}
                {selectedLog.details && (selectedLog.details.oldValue || selectedLog.details.newValue) ? (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-emerald-600" />
                      Side-by-Side Configuration Diff
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Old State */}
                      <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-xl">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 uppercase tracking-wider mb-2">
                          <XCircle className="w-4 h-4" />
                          Previous State (Old)
                        </div>
                        <pre className="text-[11px] font-mono text-rose-950 whitespace-pre-wrap overflow-x-auto bg-white/70 p-3 rounded-lg border border-rose-100">
                          {JSON.stringify(selectedLog.details.oldValue, null, 2) || 'None / Not Applicable'}
                        </pre>
                      </div>

                      {/* New State */}
                      <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Applied State (New)
                        </div>
                        <pre className="text-[11px] font-mono text-emerald-950 whitespace-pre-wrap overflow-x-auto bg-white/70 p-3 rounded-lg border border-emerald-100">
                          {JSON.stringify(selectedLog.details.newValue, null, 2) || 'None / Not Applicable'}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-2">Audit Event Details Snapshot</h3>
                    <pre className="text-xs font-mono text-slate-800 bg-slate-100 p-4 rounded-xl border border-slate-200 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end sticky bottom-0 z-10">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close Diff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
