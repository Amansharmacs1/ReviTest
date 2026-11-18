import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  User,
  ShieldCheck,
  LogOut,
  Layers,
  Key,
  Database,
  ArrowRight,
  CheckCircle2,
  Users,
  Calendar,
  Lock,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, organization, logout, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'navy';
      case 'ORG_ADMIN':
        return 'info';
      case 'PROCTOR':
        return 'warning';
      case 'CANDIDATE':
      default:
        return 'success';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. WORKSPACE BANNER */}
      <div className="bg-navy rounded-2xl p-6 sm:p-8 text-white border border-navy-800 shadow-elevated">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-brand-primary flex items-center justify-center text-white shrink-0 shadow-sm">
              <Building2 className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  {organization?.name || 'Institutional Workspace'}
                </h1>
                <Badge variant="navy" size="sm">
                  {organization?.plan || 'FREE_TRIAL'}
                </Badge>
                <Badge variant="success" size="sm" dot>
                  {organization?.status || 'ACTIVE'}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-mono">
                <span>
                  Code:{' '}
                  <strong className="text-white">{organization?.code || 'N/A'}</strong>
                </span>
                <span>•</span>
                <span>
                  Slug:{' '}
                  <strong className="text-white">{organization?.slug || 'N/A'}</strong>
                </span>
                <span>•</span>
                <span>
                  Type:{' '}
                  <strong className="text-brand-electric capitalize">
                    {organization?.type?.replace('_', ' ') || 'College'}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              icon={LogOut}
              className="bg-navy-800 text-slate-200 border-navy-700 hover:bg-navy-700"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* 2. THREE-PANEL OVERVIEW GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Panel 1: Authenticated User Profile */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-brand-primary" />
              <h2 className="text-sm font-bold text-navy">Identity Profile</h2>
            </div>
            <Badge variant={getRoleBadgeVariant(user?.role)} size="sm">
              {user?.role || 'CANDIDATE'}
            </Badge>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-400">Full Name:</span>
              <span className="font-semibold text-navy">{user?.name}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-50">
              <span className="text-slate-400">Email:</span>
              <span className="font-mono text-slate-700">{user?.email}</span>
            </div>
            {user?.profile?.studentId && (
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-400">Roll/Student ID:</span>
                <span className="font-mono text-navy font-semibold">
                  {user.profile.studentId}
                </span>
              </div>
            )}
            {user?.profile?.department && (
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-400">Department:</span>
                <span className="text-slate-700 font-medium">
                  {user.profile.department}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Session Status:</span>
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Authenticated</span>
              </span>
            </div>
          </div>
        </Card>

        {/* Panel 2: Multi-Tenant Scoping Telemetry */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-primary" />
              <h2 className="text-sm font-bold text-navy">Tenant Isolation</h2>
            </div>
            <Badge variant="info" size="sm">
              Logical Partition
            </Badge>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="space-y-0.5">
              <span className="text-slate-400 text-[10px]">TENANT OBJECT ID:</span>
              <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-navy truncate">
                {organization?._id || 'N/A'}
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-slate-400 text-[10px]">USER OBJECT ID:</span>
              <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-navy truncate">
                {user?._id || 'N/A'}
              </div>
            </div>
            <div className="pt-2 text-[11px] text-slate-500 font-sans">
              All queries and upcoming examination attempts are strictly scoped to this{' '}
              <code className="text-brand-primary font-semibold">organizationId</code>.
            </div>
          </div>
        </Card>

        {/* Panel 3: Phase 2 Security Architecture */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-navy">Security Stack</h2>
            </div>
            <Badge variant="success" size="sm">
              Phase 2 Active
            </Badge>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>JWT Bearer Authorization Active</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>HTTP-Only Secure Refresh Cookie</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Bcrypt Salt Rounds: 12</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Role-Based Access Control (RBAC)</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. NEXT PHASE MILESTONES PREVIEW */}
      <Card className="p-6 sm:p-8 bg-gradient-to-r from-slate-50 to-blue-50/40 border border-blue-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Badge variant="navy" size="sm">
              Upcoming: Phase 03
            </Badge>
            <h3 className="text-lg font-bold text-navy">
              Organization Dashboard & Assessment Engine
            </h3>
            <p className="text-xs text-slate-600 max-w-2xl">
              Now that authentication and multi-tenant workspaces are active, Phase 3 will
              introduce institutional member rosters, exam scheduling, question banks, and
              MCQ creation.
            </p>
          </div>

          <div>
            <Button
              variant="primary"
              size="md"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Workspace Ready
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DashboardPage;
