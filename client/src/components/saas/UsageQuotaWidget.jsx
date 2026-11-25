import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import { saasService } from '../../services/saasService';
import { Activity, Zap, CheckCircle2, AlertCircle } from 'lucide-react';

export const UsageQuotaWidget = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        setLoading(true);
        const res = await saasService.getUsageMetrics();
        setMetrics(res.data);
      } catch (err) {
        console.error('Error fetching usage metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, []);

  if (loading || !metrics) {
    return (
      <Card className="p-4 bg-slate-50 border border-slate-200 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/4 mb-3" />
        <div className="h-8 bg-slate-200 rounded w-full" />
      </Card>
    );
  }

  const { plan, usage } = metrics;

  const renderMeter = (title, current, max, percentage) => {
    let barColor = 'bg-brand-primary';
    if (percentage > 85) barColor = 'bg-rose-500';
    else if (percentage > 70) barColor = 'bg-amber-500';

    return (
      <div className="space-y-1.5 flex-1 min-w-[140px]">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-slate-600">{title}</span>
          <span className="font-mono text-[11px] text-slate-500">
            <strong>{current}</strong> / {max}
          </span>
        </div>
        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <Card className="p-5 space-y-4 border border-slate-200 shadow-xs bg-gradient-to-r from-white via-white to-blue-50/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-brand-primary shrink-0" />
          <h3 className="text-xs font-bold text-navy uppercase tracking-wider">
            Subscription Plan & Quotas
          </h3>
          <Badge
            variant={plan === 'ENTERPRISE' ? 'navy' : plan === 'PRO' ? 'info' : 'warning'}
            size="sm"
          >
            {plan.replace('_', ' ')}
          </Badge>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">
          Automated real-time tier quota enforcement
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {renderMeter(
          'Active Assessments',
          usage.activeExams.current,
          usage.activeExams.max,
          usage.activeExams.percentage
        )}
        {renderMeter(
          'Enrolled Candidates',
          usage.candidates.current,
          usage.candidates.max,
          usage.candidates.percentage
        )}
        {renderMeter(
          'Monthly Submissions',
          usage.monthlySubmissions.current,
          usage.monthlySubmissions.max,
          usage.monthlySubmissions.percentage
        )}
      </div>
    </Card>
  );
};

export default UsageQuotaWidget;
