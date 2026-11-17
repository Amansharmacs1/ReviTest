import React from 'react';
import {
  Server,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Cpu,
  Layers,
  HardDrive,
} from 'lucide-react';
import { useSystemStore } from '../../store/systemStore';
import Card from './Card';
import Badge from './Badge';
import Button from './Button';

export const SystemHealthCard = () => {
  const {
    apiStatus,
    dbStatus,
    apiDetails,
    dbDetails,
    latencyMs,
    lastChecked,
    errorMessage,
    isRefreshing,
    checkSystemHealth,
  } = useSystemStore();

  const isApiHealthy = apiStatus === 'healthy';
  const isDbHealthy = dbStatus === 'connected';

  return (
    <Card className="p-6 md:p-8 bg-white border border-slate-200/90 shadow-elevated">
      {/* Header of the Telemetry Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-primary animate-pulse" />
            <h3 className="text-lg font-bold text-navy">Live Infrastructure Telemetry</h3>
            <Badge
              variant={isApiHealthy && isDbHealthy ? 'success' : 'warning'}
              size="sm"
            >
              {isApiHealthy && isDbHealthy ? 'Fully Operational' : 'Verifying State'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Real-time verification of frontend-to-backend communication and database
            connectivity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastChecked && (
            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3" />
              <span>Checked {lastChecked}</span>
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={checkSystemHealth}
            disabled={isRefreshing}
            icon={RefreshCw}
            className={isRefreshing ? 'animate-spin' : ''}
          >
            {isRefreshing ? 'Pinging...' : 'Verify Now'}
          </Button>
        </div>
      </div>

      {/* Grid of 2 major components: API Engine and Database Engine */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
        {/* Node.js / Express API Card */}
        <div className="p-5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isApiHealthy
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-navy">Express API Server</h4>
                <p className="text-xs text-slate-500 font-mono">GET /api/health</p>
              </div>
            </div>
            <Badge variant={isApiHealthy ? 'success' : 'error'} size="sm" dot>
              {isApiHealthy ? 'Online' : 'Unreachable'}
            </Badge>
          </div>

          <div className="space-y-2 pt-2 text-xs border-t border-slate-200/60 font-mono">
            <div className="flex justify-between items-center text-slate-600">
              <span className="text-slate-400">Environment:</span>
              <span className="font-medium text-navy uppercase bg-white px-2 py-0.5 rounded border border-slate-200">
                {apiDetails?.environment || 'detecting...'}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="text-slate-400">Roundtrip Latency:</span>
              <span className="font-medium text-brand-primary">
                {latencyMs !== null ? `${latencyMs} ms` : 'calculating...'}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="text-slate-400">Server Uptime:</span>
              <span className="font-medium text-slate-700">
                {apiDetails?.uptime || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="text-slate-400">Memory RSS:</span>
              <span className="font-medium text-slate-700">
                {apiDetails?.process?.memory?.rss || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* MongoDB Database Card */}
        <div className="p-5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isDbHealthy
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-navy">MongoDB Cluster</h4>
                <p className="text-xs text-slate-500 font-mono">GET /api/health/db</p>
              </div>
            </div>
            <Badge variant={isDbHealthy ? 'success' : 'error'} size="sm" dot>
              {isDbHealthy ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>

          <div className="space-y-2 pt-2 text-xs border-t border-slate-200/60 font-mono">
            <div className="flex justify-between items-center text-slate-600">
              <span className="text-slate-400">Driver State:</span>
              <span className="font-medium text-emerald-700 capitalize">
                {dbDetails?.state || (isDbHealthy ? 'Connected' : 'Waiting...')}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="text-slate-400">Active Database:</span>
              <span className="font-medium text-navy bg-white px-2 py-0.5 rounded border border-slate-200">
                {dbDetails?.name || 'revitest'}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="text-slate-400">Database Host:</span>
              <span className="font-medium text-slate-700 truncate max-w-[180px]">
                {dbDetails?.host || '127.0.0.1'}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="text-slate-400">Ping Latency:</span>
              <span className="font-medium text-brand-primary">
                {dbDetails?.pingMs !== null && dbDetails?.pingMs !== undefined
                  ? `${dbDetails.pingMs} ms`
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error or Alert banner if degraded */}
      {errorMessage && (
        <div className="mt-5 p-3.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <span className="font-semibold">Connectivity Notice: </span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Micro Info bar */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-slate-400" />
            <span>Connection Pool Max: 50</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span>Rate Limiter: Enabled</span>
          </span>
        </div>
        <div className="font-mono text-slate-400">
          VITE_API_BASE_URL:{' '}
          {import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}
        </div>
      </div>
    </Card>
  );
};

export default SystemHealthCard;
