import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Users,
  GraduationCap,
  ShieldAlert,
  Search,
  Plus,
  Eye,
  RefreshCw,
  CheckCircle2,
  Layers,
  Settings,
  Shield,
  LogOut,
  Copy,
  Check,
  Mail,
  Phone,
  Globe,
  MapPin,
  Sliders,
  ArrowUpRight,
  User,
  Clock,
  Activity,
  Key,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { organizationService } from '../services/organizationService';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Pagination from '../components/common/Pagination';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, organization, logout, checkAuth } = useAuthStore();

  const isOrgAdmin = user?.role === 'ORG_ADMIN' || user?.role === 'SUPER_ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Active Tab
  const [activeTab, setActiveTab] = useState('overview');

  // Dashboard Stats & Activity
  const [dashboardStats, setDashboardStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Users Management State
  const [users, setUsers] = useState([]);
  const [usersPagination, setUsersPagination] = useState(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersRoleFilter, setUsersRoleFilter] = useState('');
  const [usersStatusFilter, setUsersStatusFilter] = useState('');
  const [usersPage, setUsersPage] = useState(1);

  // Proctors Management State
  const [proctors, setProctors] = useState([]);
  const [proctorsPagination, setProctorsPagination] = useState(null);
  const [proctorsLoading, setProctorsLoading] = useState(false);
  const [proctorsSearch, setProctorsSearch] = useState('');
  const [proctorsStatusFilter, setProctorsStatusFilter] = useState('');
  const [proctorsPage, setProctorsPage] = useState(1);

  // Candidates Management State
  const [candidates, setCandidates] = useState([]);
  const [candidatesPagination, setCandidatesPagination] = useState(null);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesSearch, setCandidatesSearch] = useState('');
  const [candidatesStatusFilter, setCandidatesStatusFilter] = useState('');
  const [candidatesPage, setCandidatesPage] = useState(1);

  // Profile Form State
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // Modals & Dialogs
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [statusConfirmUser, setStatusConfirmUser] = useState(null);
  const [statusConfirmTargetStatus, setStatusConfirmTargetStatus] = useState('');
  const [statusConfirmLoading, setStatusConfirmLoading] = useState(false);

  // Add Proctor Modal
  const [addProctorModalOpen, setAddProctorModalOpen] = useState(false);
  const [addProctorForm, setAddProctorForm] = useState({
    name: '',
    email: '',
    department: '',
    password: '',
    autoGeneratePassword: true,
  });
  const [addProctorLoading, setAddProctorLoading] = useState(false);
  const [createdProctorCredentials, setCreatedProctorCredentials] = useState(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // Notification Toast Feedback
  const [feedback, setFeedback] = useState(null);

  // Dismiss feedback after 5 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Load Dashboard Overview Stats
  const loadDashboardStats = useCallback(async () => {
    if (!isOrgAdmin) return;
    setStatsLoading(true);
    try {
      const res = await organizationService.getDashboardStats();
      setDashboardStats(res.data);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to fetch dashboard metrics.',
      });
    } finally {
      setStatsLoading(false);
    }
  }, [isOrgAdmin]);

  // Load Users
  const loadUsers = useCallback(async () => {
    if (!isOrgAdmin) return;
    setUsersLoading(true);
    try {
      const res = await organizationService.getUsers({
        page: usersPage,
        limit: 10,
        search: usersSearch || undefined,
        role: usersRoleFilter || undefined,
        status: usersStatusFilter || undefined,
      });
      setUsers(res.data.users);
      setUsersPagination(res.data.pagination);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to fetch users list.',
      });
    } finally {
      setUsersLoading(false);
    }
  }, [isOrgAdmin, usersPage, usersSearch, usersRoleFilter, usersStatusFilter]);

  // Load Proctors
  const loadProctors = useCallback(async () => {
    if (!isOrgAdmin) return;
    setProctorsLoading(true);
    try {
      const res = await organizationService.getProctors({
        page: proctorsPage,
        limit: 10,
        search: proctorsSearch || undefined,
        status: proctorsStatusFilter || undefined,
      });
      setProctors(res.data.proctors);
      setProctorsPagination(res.data.pagination);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to fetch proctors list.',
      });
    } finally {
      setProctorsLoading(false);
    }
  }, [isOrgAdmin, proctorsPage, proctorsSearch, proctorsStatusFilter]);

  // Load Candidates
  const loadCandidates = useCallback(async () => {
    if (!isOrgAdmin) return;
    setCandidatesLoading(true);
    try {
      const res = await organizationService.getCandidates({
        page: candidatesPage,
        limit: 10,
        search: candidatesSearch || undefined,
        status: candidatesStatusFilter || undefined,
      });
      setCandidates(res.data.candidates);
      setCandidatesPagination(res.data.pagination);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to fetch candidates list.',
      });
    } finally {
      setCandidatesLoading(false);
    }
  }, [isOrgAdmin, candidatesPage, candidatesSearch, candidatesStatusFilter]);

  // Load Organization Profile
  const loadProfile = useCallback(async () => {
    if (!isOrgAdmin) return;
    setProfileLoading(true);
    try {
      const res = await organizationService.getProfile();
      const org = res.data.organization;
      setProfileData({
        name: org.name || '',
        type: org.type || 'COLLEGE_UNIVERSITY',
        contactEmail: org.contactEmail || '',
        phone: org.phone || '',
        website: org.website || '',
        address: {
          street: org.address?.street || '',
          city: org.address?.city || '',
          state: org.address?.state || '',
          country: org.address?.country || '',
          zipCode: org.address?.zipCode || '',
        },
        settings: {
          allowSelfRegistration: org.settings?.allowSelfRegistration ?? true,
          requireProctoringDefault: org.settings?.requireProctoringDefault ?? false,
          defaultDurationMinutes: org.settings?.defaultDurationMinutes ?? 60,
        },
        // Readonly reference values
        _readonly: {
          slug: org.slug,
          code: org.code,
          status: org.status,
          plan: org.plan,
          createdAt: org.createdAt,
        },
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to fetch organization profile.',
      });
    } finally {
      setProfileLoading(false);
    }
  }, [isOrgAdmin]);

  // Initial Load based on tab
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (activeTab === 'overview') {
      loadDashboardStats();
    } else if (activeTab === 'members') {
      loadUsers();
    } else if (activeTab === 'proctors') {
      loadProctors();
    } else if (activeTab === 'candidates') {
      loadCandidates();
    } else if (activeTab === 'profile') {
      loadProfile();
    }
  }, [
    activeTab,
    loadDashboardStats,
    loadUsers,
    loadProctors,
    loadCandidates,
    loadProfile,
  ]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Open User Status Confirm
  const handleOpenStatusConfirm = (targetUser, targetStatus) => {
    setStatusConfirmUser(targetUser);
    setStatusConfirmTargetStatus(targetStatus);
  };

  // Confirm User Status Change
  const handleExecuteStatusChange = async () => {
    if (!statusConfirmUser || !statusConfirmTargetStatus) return;
    setStatusConfirmLoading(true);
    try {
      await organizationService.updateUserStatus(
        statusConfirmUser._id,
        statusConfirmTargetStatus
      );
      setFeedback({
        type: 'success',
        message: `User '${statusConfirmUser.name}' status updated to ${statusConfirmTargetStatus}.`,
      });
      setStatusConfirmUser(null);
      // Refresh current tab
      if (activeTab === 'members') loadUsers();
      if (activeTab === 'proctors') loadProctors();
      if (activeTab === 'candidates') loadCandidates();
      if (activeTab === 'overview') loadDashboardStats();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update user status.',
      });
    } finally {
      setStatusConfirmLoading(false);
    }
  };

  // Create Proctor
  const handleCreateProctorSubmit = async (e) => {
    e.preventDefault();
    setAddProctorLoading(true);
    try {
      const payload = {
        name: addProctorForm.name,
        email: addProctorForm.email,
        department: addProctorForm.department || undefined,
        autoGeneratePassword: addProctorForm.autoGeneratePassword,
      };
      if (!addProctorForm.autoGeneratePassword && addProctorForm.password) {
        payload.password = addProctorForm.password;
      }

      const res = await organizationService.createProctor(payload);
      setCreatedProctorCredentials({
        name: res.data.proctor.name,
        email: res.data.proctor.email,
        temporaryPassword: res.data.temporaryPassword || addProctorForm.password,
      });

      setFeedback({
        type: 'success',
        message: `Proctor account created successfully for ${res.data.proctor.name}.`,
      });

      // Refresh list
      loadProctors();
      if (activeTab === 'overview') loadDashboardStats();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to create proctor account.',
      });
    } finally {
      setAddProctorLoading(false);
    }
  };

  // Save Profile Changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileData) return;
    setProfileSaving(true);
    try {
      await organizationService.updateProfile({
        name: profileData.name,
        type: profileData.type,
        contactEmail: profileData.contactEmail,
        phone: profileData.phone,
        website: profileData.website,
        address: profileData.address,
        settings: profileData.settings,
      });
      setFeedback({
        type: 'success',
        message: 'Organization profile updated successfully.',
      });
      loadProfile();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update profile.' });
    } finally {
      setProfileSaving(false);
    }
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <Badge variant="success" size="sm" dot>
            Active
          </Badge>
        );
      case 'INACTIVE':
        return (
          <Badge variant="neutral" size="sm" dot>
            Inactive
          </Badge>
        );
      case 'SUSPENDED':
        return (
          <Badge variant="error" size="sm" dot>
            Suspended
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm">
            {status}
          </Badge>
        );
    }
  };

  // Copy temporary credentials
  const handleCopyCredentials = () => {
    if (!createdProctorCredentials) return;
    const text = `REVITEST Proctor Credentials\nEmail: ${createdProctorCredentials.email}\nTemporary Password: ${createdProctorCredentials.temporaryPassword}\nLogin at: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopiedCredentials(true);
    setTimeout(() => setCopiedCredentials(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Super Admin Switcher Banner if applicable */}
      {isSuperAdmin && (
        <div className="bg-navy-900 border border-brand-electric/30 rounded-xl p-4 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-brand-electric" />
            </div>
            <div>
              <span className="text-xs font-bold text-brand-electric uppercase tracking-wider block">
                Platform Super Administrator Privileges Active
              </span>
              <p className="text-xs text-slate-300">
                You have global governance access across all institutional workspaces.
              </p>
            </div>
          </div>
          <Link to="/app/platform">
            <Button variant="primary" size="sm" icon={ArrowUpRight} iconPosition="right">
              Platform Console
            </Button>
          </Link>
        </div>
      )}

      {/* Workspace Header */}
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
                  {organization?.plan || 'ENTERPRISE'}
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

      {/* Toast Notification Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg border flex items-center justify-between text-xs font-medium animate-in fade-in slide-in-from-top-1 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs Navigation for ORG_ADMIN */}
      {isOrgAdmin ? (
        <div>
          <div className="border-b border-slate-200">
            <nav className="flex space-x-6">
              {[
                { id: 'overview', label: 'Workspace Overview', icon: Activity },
                { id: 'members', label: 'All Members', icon: Users },
                { id: 'proctors', label: 'Proctors', icon: ShieldAlert },
                { id: 'candidates', label: 'Candidates', icon: GraduationCap },
                { id: 'profile', label: 'Organization & Settings', icon: Settings },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-3 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-xs sm:text-sm transition-colors ${
                      isActive
                        ? 'border-brand-primary text-brand-primary'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* TAB CONTENT: 1. OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 mt-6">
              {/* Real Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-5 space-y-2 border-l-4 border-l-brand-primary">
                  <div className="flex items-center justify-between text-slate-500 text-xs">
                    <span>Total Candidates</span>
                    <GraduationCap className="w-4 h-4 text-brand-primary" />
                  </div>
                  <div className="text-2xl font-black text-navy">
                    {statsLoading
                      ? '...'
                      : (dashboardStats?.counts?.candidates?.total ?? 0)}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    <span className="text-emerald-600 font-semibold">
                      {dashboardStats?.counts?.candidates?.active ?? 0}
                    </span>{' '}
                    active •{' '}
                    <span className="text-slate-500">
                      {dashboardStats?.counts?.candidates?.inactive ?? 0}
                    </span>{' '}
                    inactive
                  </div>
                </Card>

                <Card className="p-5 space-y-2 border-l-4 border-l-amber-500">
                  <div className="flex items-center justify-between text-slate-500 text-xs">
                    <span>Active Proctors</span>
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-navy">
                    {statsLoading
                      ? '...'
                      : (dashboardStats?.counts?.proctors?.active ?? 0)}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {dashboardStats?.counts?.proctors?.total ?? 0} total registered
                  </div>
                </Card>

                <Card className="p-5 space-y-2 border-l-4 border-l-indigo-500">
                  <div className="flex items-center justify-between text-slate-500 text-xs">
                    <span>Total Members</span>
                    <Users className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-black text-navy">
                    {statsLoading ? '...' : (dashboardStats?.counts?.totalMembers ?? 0)}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Across all organizational roles
                  </div>
                </Card>

                <Card className="p-5 space-y-2 border-l-4 border-l-emerald-500">
                  <div className="flex items-center justify-between text-slate-500 text-xs">
                    <span>Workspace Status</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-lg font-bold text-navy flex items-center gap-1.5 pt-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    <span>{dashboardStats?.organization?.status || 'ACTIVE'}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Since{' '}
                    {dashboardStats?.organization?.registeredAt
                      ? new Date(
                          dashboardStats.organization.registeredAt
                        ).toLocaleDateString()
                      : 'N/A'}
                  </div>
                </Card>
              </div>

              {/* Identity & Scoping Panels */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-brand-primary" />
                      <h3 className="text-xs font-bold text-navy uppercase tracking-wider">
                        Administrator Session
                      </h3>
                    </div>
                    <Badge variant={getRoleBadgeVariant(user?.role)} size="sm">
                      {user?.role}
                    </Badge>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Name:</span>
                      <span className="font-semibold text-navy">{user?.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Email:</span>
                      <span className="font-mono text-slate-700">{user?.email}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Status:</span>
                      <span className="text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active Session</span>
                      </span>
                    </div>
                  </div>
                </Card>

                <Card className="p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-brand-primary" />
                      <h3 className="text-xs font-bold text-navy uppercase tracking-wider">
                        Tenant Scoping
                      </h3>
                    </div>
                    <Badge variant="info" size="sm">
                      Strict Partition
                    </Badge>
                  </div>
                  <div className="space-y-1.5 text-xs font-mono">
                    <div>
                      <span className="text-slate-400 text-[10px]">ORGANIZATION ID:</span>
                      <div className="p-1 rounded bg-slate-50 border border-slate-200 text-navy truncate text-[11px]">
                        {organization?._id || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">TENANT CODE:</span>
                      <div className="p-1 rounded bg-slate-50 border border-slate-200 text-brand-primary font-bold text-[11px]">
                        {organization?.code || 'N/A'}
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-xs font-bold text-navy uppercase tracking-wider">
                        Quick Governance
                      </h3>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-xs"
                      icon={Plus}
                      onClick={() => {
                        setAddProctorModalOpen(true);
                        setCreatedProctorCredentials(null);
                      }}
                    >
                      Invite / Register Proctor
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-xs"
                      icon={GraduationCap}
                      onClick={() => setActiveTab('candidates')}
                    >
                      Manage Candidate Roster
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-xs"
                      icon={Settings}
                      onClick={() => setActiveTab('profile')}
                    >
                      Organization Profile & Settings
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Recent Organization Activity (Audit Log) */}
              <Card className="overflow-hidden border border-slate-200">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-brand-primary" />
                    <h3 className="text-xs font-bold text-navy uppercase tracking-wider">
                      Recent Activity & Audit Trail
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={RefreshCw}
                    onClick={loadDashboardStats}
                    disabled={statsLoading}
                  >
                    Refresh
                  </Button>
                </div>

                <div className="divide-y divide-slate-100">
                  {statsLoading ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Loading audit events...
                    </div>
                  ) : !dashboardStats?.recentActivity ||
                    dashboardStats.recentActivity.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No recent activities recorded for this workspace.
                    </div>
                  ) : (
                    dashboardStats.recentActivity.map((log) => (
                      <div
                        key={log._id}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/60 transition-colors text-xs"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-brand-primary mt-1.5 shrink-0" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-navy">
                                {log.description}
                              </span>
                              <Badge variant="neutral" size="sm">
                                {log.action}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Actor:{' '}
                              <strong className="text-slate-600">{log.actorName}</strong>{' '}
                              ({log.actorRole})
                              {log.targetName && (
                                <span>
                                  {' '}
                                  • Target:{' '}
                                  <strong className="text-slate-600">
                                    {log.targetName}
                                  </strong>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-400 font-mono whitespace-nowrap self-end sm:self-center">
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* TAB CONTENT: 2. ALL MEMBERS */}
          {activeTab === 'members' && (
            <div className="space-y-4 mt-6">
              {/* Search & Filters */}
              <Card className="p-4 bg-white">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search members by name or institutional email..."
                      value={usersSearch}
                      onChange={(e) => {
                        setUsersSearch(e.target.value);
                        setUsersPage(1);
                      }}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={usersRoleFilter}
                      onChange={(e) => {
                        setUsersRoleFilter(e.target.value);
                        setUsersPage(1);
                      }}
                      className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                      <option value="">All Roles</option>
                      <option value="ORG_ADMIN">Organization Admin</option>
                      <option value="PROCTOR">Proctor</option>
                      <option value="CANDIDATE">Candidate</option>
                    </select>

                    <select
                      value={usersStatusFilter}
                      onChange={(e) => {
                        setUsersStatusFilter(e.target.value);
                        setUsersPage(1);
                      }}
                      className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                      <option value="">All Statuses</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </div>
                </div>
              </Card>

              {/* Members Table */}
              <Card className="overflow-hidden border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Member Name</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Joined Date</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {usersLoading ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-400">
                            Loading workspace members...
                          </td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-400">
                            No members found matching your search criteria.
                          </td>
                        </tr>
                      ) : (
                        users.map((item) => (
                          <tr
                            key={item._id}
                            className="hover:bg-slate-50/60 transition-colors"
                          >
                            <td className="py-3 px-4 font-semibold text-navy">
                              {item.name}
                              {item._id === user?._id && (
                                <span className="ml-2 text-[10px] text-brand-primary font-bold">
                                  (You)
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600">
                              {item.email}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={getRoleBadgeVariant(item.role)} size="sm">
                                {item.role}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">{getStatusBadge(item.status)}</td>
                            <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  icon={Eye}
                                  onClick={() => setSelectedUserDetails(item)}
                                >
                                  View
                                </Button>
                                {item._id !== user?._id &&
                                  item.role !== 'SUPER_ADMIN' &&
                                  (item.status === 'ACTIVE' ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-rose-600 hover:bg-rose-50 border-rose-200"
                                      onClick={() =>
                                        handleOpenStatusConfirm(item, 'INACTIVE')
                                      }
                                    >
                                      Deactivate
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() =>
                                        handleOpenStatusConfirm(item, 'ACTIVE')
                                      }
                                    >
                                      Activate
                                    </Button>
                                  ))}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  pagination={usersPagination}
                  onPageChange={(p) => setUsersPage(p)}
                  isLoading={usersLoading}
                />
              </Card>
            </div>
          )}

          {/* TAB CONTENT: 3. PROCTORS */}
          {activeTab === 'proctors' && (
            <div className="space-y-4 mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Manage invigilators authorized to proctor examinations in this
                  workspace.
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  onClick={() => {
                    setAddProctorModalOpen(true);
                    setCreatedProctorCredentials(null);
                  }}
                >
                  Add Proctor
                </Button>
              </div>

              {/* Search & Status Filter */}
              <Card className="p-4 bg-white">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search proctors by name or email..."
                      value={proctorsSearch}
                      onChange={(e) => {
                        setProctorsSearch(e.target.value);
                        setProctorsPage(1);
                      }}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>

                  <select
                    value={proctorsStatusFilter}
                    onChange={(e) => {
                      setProctorsStatusFilter(e.target.value);
                      setProctorsPage(1);
                    }}
                    className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    <option value="">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </Card>

              {/* Proctors Table */}
              <Card className="overflow-hidden border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Proctor</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Department / Designation</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Added On</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {proctorsLoading ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-400">
                            Loading proctors...
                          </td>
                        </tr>
                      ) : proctors.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-400">
                            No proctors registered yet. Click &apos;Add Proctor&apos; to
                            invite one.
                          </td>
                        </tr>
                      ) : (
                        proctors.map((item) => (
                          <tr
                            key={item._id}
                            className="hover:bg-slate-50/60 transition-colors"
                          >
                            <td className="py-3 px-4 font-semibold text-navy">
                              {item.name}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600">
                              {item.email}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {item.profile?.department || 'Assessment Staff'}
                            </td>
                            <td className="py-3 px-4">{getStatusBadge(item.status)}</td>
                            <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  icon={Eye}
                                  onClick={() => setSelectedUserDetails(item)}
                                >
                                  View
                                </Button>
                                {item.status === 'ACTIVE' ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-rose-600 hover:bg-rose-50 border-rose-200"
                                    onClick={() =>
                                      handleOpenStatusConfirm(item, 'INACTIVE')
                                    }
                                  >
                                    Deactivate
                                  </Button>
                                ) : (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() =>
                                      handleOpenStatusConfirm(item, 'ACTIVE')
                                    }
                                  >
                                    Activate
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  pagination={proctorsPagination}
                  onPageChange={(p) => setProctorsPage(p)}
                  isLoading={proctorsLoading}
                />
              </Card>
            </div>
          )}

          {/* TAB CONTENT: 4. CANDIDATES */}
          {activeTab === 'candidates' && (
            <div className="space-y-4 mt-6">
              <div className="text-xs text-slate-500">
                Registered student and examinee roster for examinations and assessments.
              </div>

              {/* Search & Filter */}
              <Card className="p-4 bg-white">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search candidates by name, email, or Student/Roll ID..."
                      value={candidatesSearch}
                      onChange={(e) => {
                        setCandidatesSearch(e.target.value);
                        setCandidatesPage(1);
                      }}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>

                  <select
                    value={candidatesStatusFilter}
                    onChange={(e) => {
                      setCandidatesStatusFilter(e.target.value);
                      setCandidatesPage(1);
                    }}
                    className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    <option value="">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              </Card>

              {/* Candidates Table */}
              <Card className="overflow-hidden border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Candidate</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Student / Roll ID</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Registered</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {candidatesLoading ? (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-slate-400">
                            Loading candidates...
                          </td>
                        </tr>
                      ) : candidates.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-slate-400">
                            No candidates found matching your criteria.
                          </td>
                        </tr>
                      ) : (
                        candidates.map((item) => (
                          <tr
                            key={item._id}
                            className="hover:bg-slate-50/60 transition-colors"
                          >
                            <td className="py-3 px-4 font-semibold text-navy">
                              {item.name}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600">
                              {item.email}
                            </td>
                            <td className="py-3 px-4 font-mono text-navy font-semibold">
                              {item.profile?.studentId || '—'}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {item.profile?.department || '—'}
                            </td>
                            <td className="py-3 px-4">{getStatusBadge(item.status)}</td>
                            <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  icon={Eye}
                                  onClick={() => setSelectedUserDetails(item)}
                                >
                                  View
                                </Button>
                                {item.status === 'ACTIVE' ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-rose-600 hover:bg-rose-50 border-rose-200"
                                    onClick={() =>
                                      handleOpenStatusConfirm(item, 'INACTIVE')
                                    }
                                  >
                                    Deactivate
                                  </Button>
                                ) : (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() =>
                                      handleOpenStatusConfirm(item, 'ACTIVE')
                                    }
                                  >
                                    Activate
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  pagination={candidatesPagination}
                  onPageChange={(p) => setCandidatesPage(p)}
                  isLoading={candidatesLoading}
                />
              </Card>
            </div>
          )}

          {/* TAB CONTENT: 5. PROFILE & SETTINGS */}
          {activeTab === 'profile' && (
            <div className="space-y-6 mt-6">
              {profileLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Loading organization profile...
                </div>
              ) : profileData ? (
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {/* General Profile Section */}
                  <Card className="p-6 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Building2 className="w-5 h-5 text-brand-primary" />
                      <div>
                        <h3 className="text-sm font-bold text-navy">General Profile</h3>
                        <p className="text-[11px] text-slate-500">
                          Institutional workspace details visible across examination
                          portals.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Organization / Institute Name"
                        value={profileData.name}
                        onChange={(e) =>
                          setProfileData({ ...profileData, name: e.target.value })
                        }
                        required
                      />

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          Institution Type
                        </label>
                        <select
                          value={profileData.type}
                          onChange={(e) =>
                            setProfileData({ ...profileData, type: e.target.value })
                          }
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        >
                          <option value="COLLEGE_UNIVERSITY">College / University</option>
                          <option value="COACHING_INSTITUTE">Coaching Institute</option>
                          <option value="ENTERPRISE_RECRUITER">
                            Enterprise Recruiter
                          </option>
                          <option value="ASSESSMENT_PROVIDER">Assessment Provider</option>
                        </select>
                      </div>

                      <Input
                        label="Contact Email"
                        type="email"
                        value={profileData.contactEmail}
                        onChange={(e) =>
                          setProfileData({ ...profileData, contactEmail: e.target.value })
                        }
                        required
                      />

                      <Input
                        label="Contact Phone"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={profileData.phone}
                        onChange={(e) =>
                          setProfileData({ ...profileData, phone: e.target.value })
                        }
                      />

                      <div className="sm:col-span-2">
                        <Input
                          label="Website URL"
                          type="url"
                          placeholder="https://example.edu"
                          value={profileData.website}
                          onChange={(e) =>
                            setProfileData({ ...profileData, website: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </Card>

                  {/* Physical Address Section */}
                  <Card className="p-6 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <MapPin className="w-5 h-5 text-brand-primary" />
                      <div>
                        <h3 className="text-sm font-bold text-navy">Physical Address</h3>
                        <p className="text-[11px] text-slate-500">
                          Campus or corporate headquarters location.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <Input
                          label="Street Address"
                          value={profileData.address.street}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              address: { ...profileData.address, street: e.target.value },
                            })
                          }
                        />
                      </div>
                      <Input
                        label="City"
                        value={profileData.address.city}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            address: { ...profileData.address, city: e.target.value },
                          })
                        }
                      />
                      <Input
                        label="State / Province"
                        value={profileData.address.state}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            address: { ...profileData.address, state: e.target.value },
                          })
                        }
                      />
                      <Input
                        label="Country"
                        value={profileData.address.country}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            address: { ...profileData.address, country: e.target.value },
                          })
                        }
                      />
                      <Input
                        label="Postal / Zip Code"
                        value={profileData.address.zipCode}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            address: { ...profileData.address, zipCode: e.target.value },
                          })
                        }
                      />
                    </div>
                  </Card>

                  {/* Workspace Policy & Assessment Defaults */}
                  <Card className="p-6 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Sliders className="w-5 h-5 text-brand-primary" />
                      <div>
                        <h3 className="text-sm font-bold text-navy">
                          Assessment Workspace Policies
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Workspace defaults applied across candidates and scheduled
                          exams.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profileData.settings.allowSelfRegistration}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              settings: {
                                ...profileData.settings,
                                allowSelfRegistration: e.target.checked,
                              },
                            })
                          }
                          className="mt-0.5 w-4 h-4 text-brand-primary rounded border-slate-300 focus:ring-brand-primary"
                        />
                        <div>
                          <span className="text-xs font-semibold text-navy block">
                            Allow Candidate Self-Registration
                          </span>
                          <span className="text-[11px] text-slate-500">
                            When enabled, candidates can sign up using your organization
                            code: <strong>{profileData._readonly.code}</strong>.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profileData.settings.requireProctoringDefault}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              settings: {
                                ...profileData.settings,
                                requireProctoringDefault: e.target.checked,
                              },
                            })
                          }
                          className="mt-0.5 w-4 h-4 text-brand-primary rounded border-slate-300 focus:ring-brand-primary"
                        />
                        <div>
                          <span className="text-xs font-semibold text-navy block">
                            Require Proctoring by Default
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Automatically enforce secure proctor monitoring when
                            configuring new assessments.
                          </span>
                        </div>
                      </label>

                      <div className="max-w-xs pt-2">
                        <Input
                          label="Default Exam Duration (minutes)"
                          type="number"
                          min="5"
                          max="360"
                          value={profileData.settings.defaultDurationMinutes}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              settings: {
                                ...profileData.settings,
                                defaultDurationMinutes: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </Card>

                  {/* Readonly Tenant Identifiers */}
                  <Card className="p-6 bg-slate-50 border border-slate-200">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                      Protected Institutional Identifiers (Immutable)
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                      <div>
                        <span className="text-slate-400 text-[10px]">
                          WORKSPACE CODE:
                        </span>
                        <p className="font-bold text-navy">
                          {profileData._readonly.code}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">URL SLUG:</span>
                        <p className="font-bold text-navy">
                          {profileData._readonly.slug}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">
                          ACCOUNT STATUS:
                        </span>
                        <p className="font-bold text-emerald-600">
                          {profileData._readonly.status}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">
                          SUBSCRIPTION PLAN:
                        </span>
                        <p className="font-bold text-navy">
                          {profileData._readonly.plan}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      disabled={profileSaving}
                    >
                      {profileSaving ? 'Saving Changes...' : 'Save Profile & Settings'}
                    </Button>
                  </div>
                </form>
              ) : null}
            </div>
          )}
        </div>
      ) : (
        /* CANDIDATE / PROCTOR VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-brand-primary" />
                <h2 className="text-sm font-bold text-navy">
                  Candidate Workspace Access
                </h2>
              </div>
              <Badge variant={getRoleBadgeVariant(user?.role)} size="sm">
                {user?.role}
              </Badge>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Full Name:</span>
                <span className="font-semibold text-navy">{user?.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Email:</span>
                <span className="font-mono text-slate-700">{user?.email}</span>
              </div>
              {user?.profile?.studentId && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Student / Roll ID:</span>
                  <span className="font-mono text-navy font-semibold">
                    {user.profile.studentId}
                  </span>
                </div>
              )}
              {user?.profile?.department && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Department:</span>
                  <span className="text-slate-700 font-medium">
                    {user.profile.department}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Access Status:</span>
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Enrolled & Active</span>
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4 bg-gradient-to-br from-blue-50/50 to-slate-50 border border-blue-100">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-brand-primary" />
              <h2 className="text-sm font-bold text-navy">Upcoming Examinations</h2>
            </div>
            <p className="text-xs text-slate-600">
              Assessments assigned to your enrollment profile will be published here in
              Phase 4 (Exam Creation & Question Management) and Phase 5 (Exam Scheduling &
              Student Access).
            </p>
            <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span>
                Assessment engine connection verified. Organization:{' '}
                <strong>{organization?.name}</strong>
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUserDetails && (
        <Modal
          isOpen={Boolean(selectedUserDetails)}
          onClose={() => setSelectedUserDetails(null)}
          title={`User Profile: ${selectedUserDetails.name}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Full Name:</span>
                <strong className="text-navy">{selectedUserDetails.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="font-mono text-slate-700">
                  {selectedUserDetails.email}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Role:</span>
                <Badge variant={getRoleBadgeVariant(selectedUserDetails.role)} size="sm">
                  {selectedUserDetails.role}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Account Status:</span>
                {getStatusBadge(selectedUserDetails.status)}
              </div>
              {selectedUserDetails.profile?.studentId && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Student / Roll ID:</span>
                  <span className="font-mono font-semibold text-navy">
                    {selectedUserDetails.profile.studentId}
                  </span>
                </div>
              )}
              {selectedUserDetails.profile?.department && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Department:</span>
                  <span className="text-slate-700">
                    {selectedUserDetails.profile.department}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Account Created:</span>
                <span className="font-mono text-slate-600">
                  {new Date(selectedUserDetails.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedUserDetails(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* User Status Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(statusConfirmUser)}
        onClose={() => setStatusConfirmUser(null)}
        onConfirm={handleExecuteStatusChange}
        title={`Confirm Status Change: ${statusConfirmUser?.name}`}
        message={`Are you sure you want to change the status of ${statusConfirmUser?.name} (${statusConfirmUser?.email}) to ${statusConfirmTargetStatus}? Inactive users are immediately logged out.`}
        confirmText={`Confirm ${statusConfirmTargetStatus}`}
        confirmVariant={statusConfirmTargetStatus === 'ACTIVE' ? 'primary' : 'danger'}
        isLoading={statusConfirmLoading}
      />

      {/* Add Proctor Modal */}
      {addProctorModalOpen && (
        <Modal
          isOpen={addProctorModalOpen}
          onClose={() => {
            setAddProctorModalOpen(false);
            setCreatedProctorCredentials(null);
          }}
          title="Register / Invite Proctor"
          maxWidth="max-w-md"
        >
          {createdProctorCredentials ? (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Proctor Account Successfully Created!</span>
                </div>
                <p className="text-emerald-700">
                  Share these credentials with the invigilator. They can sign in
                  immediately at the login portal.
                </p>

                <div className="p-3 bg-white rounded-lg border border-emerald-300 font-mono space-y-1 text-slate-800">
                  <div>
                    <span className="text-slate-400 text-[10px] block">EMAIL:</span>
                    <strong>{createdProctorCredentials.email}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">
                      TEMPORARY PASSWORD:
                    </span>
                    <strong className="text-brand-primary">
                      {createdProctorCredentials.temporaryPassword}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={copiedCredentials ? Check : Copy}
                  onClick={handleCopyCredentials}
                >
                  {copiedCredentials ? 'Copied to Clipboard!' : 'Copy Credentials'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setAddProctorModalOpen(false);
                    setCreatedProctorCredentials(null);
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateProctorSubmit} className="space-y-4 text-xs">
              <Input
                label="Proctor Full Name"
                placeholder="Dr. Jane Smith"
                value={addProctorForm.name}
                onChange={(e) =>
                  setAddProctorForm({ ...addProctorForm, name: e.target.value })
                }
                required
              />

              <Input
                label="Institutional Email"
                type="email"
                placeholder="jsmith@institution.edu"
                value={addProctorForm.email}
                onChange={(e) =>
                  setAddProctorForm({ ...addProctorForm, email: e.target.value })
                }
                required
              />

              <Input
                label="Department / Designation (optional)"
                placeholder="Computer Science / Senior Lecturer"
                value={addProctorForm.department}
                onChange={(e) =>
                  setAddProctorForm({ ...addProctorForm, department: e.target.value })
                }
              />

              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addProctorForm.autoGeneratePassword}
                    onChange={(e) =>
                      setAddProctorForm({
                        ...addProctorForm,
                        autoGeneratePassword: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-brand-primary rounded border-slate-300 focus:ring-brand-primary"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Auto-generate secure temporary password
                  </span>
                </label>

                {!addProctorForm.autoGeneratePassword && (
                  <Input
                    label="Custom Initial Password"
                    type="password"
                    placeholder="Min 8 chars, 1 uppercase, 1 digit..."
                    value={addProctorForm.password}
                    onChange={(e) =>
                      setAddProctorForm({ ...addProctorForm, password: e.target.value })
                    }
                    required={!addProctorForm.autoGeneratePassword}
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAddProctorModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={addProctorLoading}
                >
                  {addProctorLoading ? 'Creating...' : 'Create Proctor Account'}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
};

export default DashboardPage;
