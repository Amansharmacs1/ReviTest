import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Activity,
  Layers,
  GraduationCap,
  Shield,
  Eye,
} from 'lucide-react';
import { platformService } from '../services/platformService';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Pagination from '../components/common/Pagination';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';

export const PlatformDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Selected Org for Details Modal
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Status Change Dialog
  const [statusModalOrg, setStatusModalOrg] = useState(null);
  const [targetStatus, setTargetStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Toast feedback
  const [feedback, setFeedback] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, orgsRes] = await Promise.all([
        platformService.getDashboardStats(),
        platformService.getOrganizations({
          page: currentPage,
          limit: 10,
          search: search || undefined,
          status: statusFilter || undefined,
          type: typeFilter || undefined,
        }),
      ]);

      setStats(statsRes.data);
      setOrganizations(orgsRes.data.organizations);
      setPagination(orgsRes.data.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load platform data.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, statusFilter, typeFilter]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // View Org Details
  const handleViewOrgDetails = async (orgId) => {
    setDetailsLoading(true);
    try {
      const res = await platformService.getOrganizationById(orgId);
      setSelectedOrg(res.data);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setDetailsLoading(false);
    }
  };

  // Open Status Change Dialog
  const handleOpenStatusModal = (org, newStatus) => {
    setStatusModalOrg(org);
    setTargetStatus(newStatus);
    setStatusReason('');
  };

  // Execute Status Change
  const handleConfirmStatusChange = async () => {
    if (!statusModalOrg || !targetStatus) return;
    setStatusUpdating(true);
    try {
      await platformService.updateOrganizationStatus(
        statusModalOrg._id,
        targetStatus,
        statusReason
      );
      setFeedback({
        type: 'success',
        message: `Organization '${statusModalOrg.name}' status updated to ${targetStatus}.`,
      });
      setStatusModalOrg(null);
      fetchDashboardData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setStatusUpdating(false);
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
      case 'SUSPENDED':
        return (
          <Badge variant="error" size="sm" dot>
            Suspended
          </Badge>
        );
      case 'PENDING_VERIFICATION':
        return (
          <Badge variant="warning" size="sm" dot>
            Pending
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Platform Header */}
      <div className="bg-navy rounded-2xl p-6 sm:p-8 text-white border border-navy-800 shadow-elevated">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-primary flex items-center justify-center text-white shrink-0">
              <Shield className="w-6 h-6 text-brand-electric" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  Platform Administration Console
                </h1>
                <Badge variant="navy" size="sm">
                  Super Admin
                </Badge>
              </div>
              <p className="text-xs text-slate-300">
                Global multi-tenant governance, organization management, and platform
                analytics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/app/dashboard">
              <Button
                variant="outline"
                size="sm"
                icon={ArrowLeft}
                className="bg-navy-800 text-slate-200 border-navy-700 hover:bg-navy-700"
              >
                Workspace Dashboard
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={fetchDashboardData}
              disabled={loading}
              className="bg-navy-800 text-slate-200 border-navy-700 hover:bg-navy-700"
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg border bg-rose-50 border-rose-200 text-rose-800 text-xs font-medium">
          {error}
        </div>
      )}

      {feedback && (
        <div
          className={`p-3.5 rounded-lg border flex items-center justify-between text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Real Platform Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-5 space-y-2 border-l-4 border-l-brand-primary">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Total Organizations</span>
              <Building2 className="w-4 h-4 text-brand-primary" />
            </div>
            <div className="text-2xl font-black text-navy">
              {stats.organizations.total}
            </div>
            <div className="text-[11px] text-slate-400">
              <span className="text-emerald-600 font-semibold">
                {stats.organizations.active}
              </span>{' '}
              active •{' '}
              <span className="text-rose-600 font-semibold">
                {stats.organizations.suspended}
              </span>{' '}
              suspended
            </div>
          </Card>

          <Card className="p-5 space-y-2 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Total Candidates</span>
              <GraduationCap className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-navy">{stats.users.candidates}</div>
            <div className="text-[11px] text-slate-400">Platform-wide examinees</div>
          </Card>

          <Card className="p-5 space-y-2 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Total Proctors</span>
              <ShieldAlert className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-navy">{stats.users.proctors}</div>
            <div className="text-[11px] text-slate-400">Assigned invigilators</div>
          </Card>

          <Card className="p-5 space-y-2 border-l-4 border-l-indigo-500">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Total Registered Users</span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-navy">{stats.users.total}</div>
            <div className="text-[11px] text-slate-400">
              {stats.users.orgAdmins} organization administrators
            </div>
          </Card>
        </div>
      )}

      {/* Search & Filter Controls */}
      <Card className="p-4 bg-white space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by organization name, slug, code, or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="PENDING_VERIFICATION">Pending Verification</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="">All Types</option>
              <option value="COLLEGE_UNIVERSITY">College / University</option>
              <option value="COACHING_INSTITUTE">Coaching Institute</option>
              <option value="ENTERPRISE_RECRUITER">Enterprise Recruiter</option>
              <option value="ASSESSMENT_PROVIDER">Assessment Provider</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Organizations Management Table */}
      <Card className="overflow-hidden border border-slate-200 shadow-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Organization</th>
                <th className="py-3 px-4">Code / Slug</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Users</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Registered</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    Loading registered organizations...
                  </td>
                </tr>
              ) : organizations.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No organizations match your criteria.
                  </td>
                </tr>
              ) : (
                organizations.map((org) => (
                  <tr key={org._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-navy">{org.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {org.contactEmail}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      <div>
                        Code: <strong className="text-navy">{org.code}</strong>
                      </div>
                      <div className="text-slate-400">{org.slug}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 capitalize">
                      {org.type?.toLowerCase().replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 font-semibold text-navy">
                      {org.userCount || 0}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(org.status)}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Eye}
                          disabled={detailsLoading}
                          onClick={() => handleViewOrgDetails(org._id)}
                        >
                          View
                        </Button>
                        {org.status === 'ACTIVE' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-rose-600 hover:bg-rose-50 border-rose-200"
                            onClick={() => handleOpenStatusModal(org, 'SUSPENDED')}
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenStatusModal(org, 'ACTIVE')}
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
          pagination={pagination}
          onPageChange={(newPage) => setCurrentPage(newPage)}
          isLoading={loading}
        />
      </Card>

      {/* Organization Details Modal */}
      {selectedOrg && (
        <Modal
          isOpen={Boolean(selectedOrg)}
          onClose={() => setSelectedOrg(null)}
          title={`Organization: ${selectedOrg.name}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <span className="text-slate-400">Workspace Slug:</span>
                <p className="font-mono font-semibold text-navy">{selectedOrg.slug}</p>
              </div>
              <div>
                <span className="text-slate-400">Access Code:</span>
                <p className="font-mono font-semibold text-navy">{selectedOrg.code}</p>
              </div>
              <div>
                <span className="text-slate-400">Type:</span>
                <p className="font-semibold text-navy">{selectedOrg.type}</p>
              </div>
              <div>
                <span className="text-slate-400">Status:</span>
                <p>{getStatusBadge(selectedOrg.status)}</p>
              </div>
              <div>
                <span className="text-slate-400">Contact Email:</span>
                <p className="font-mono text-navy">{selectedOrg.contactEmail}</p>
              </div>
              <div>
                <span className="text-slate-400">Created:</span>
                <p className="font-mono text-navy">
                  {new Date(selectedOrg.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {selectedOrg.metrics && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded bg-blue-50 border border-blue-100">
                  <div className="text-lg font-bold text-brand-primary">
                    {selectedOrg.metrics.candidatesCount}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Candidates
                  </span>
                </div>
                <div className="p-2.5 rounded bg-amber-50 border border-amber-100">
                  <div className="text-lg font-bold text-amber-700">
                    {selectedOrg.metrics.proctorsCount}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">Proctors</span>
                </div>
                <div className="p-2.5 rounded bg-slate-100 border border-slate-200">
                  <div className="text-lg font-bold text-navy">
                    {selectedOrg.metrics.adminsCount}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Org Admins
                  </span>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedOrg(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Status Change Confirmation Modal */}
      {statusModalOrg && (
        <Modal
          isOpen={Boolean(statusModalOrg)}
          onClose={() => setStatusModalOrg(null)}
          title={`Confirm Status Change: ${statusModalOrg.name}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              You are about to set <strong>{statusModalOrg.name}</strong> to{' '}
              <strong
                className={
                  targetStatus === 'SUSPENDED' ? 'text-rose-600' : 'text-emerald-600'
                }
              >
                {targetStatus}
              </strong>
              .
              {targetStatus === 'SUSPENDED' && (
                <span className="block mt-1 text-rose-600 font-medium">
                  Warning: All members of this organization will be immediately blocked
                  from accessing the platform.
                </span>
              )}
            </p>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Reason for Audit Log (optional)
              </label>
              <textarea
                rows="2"
                placeholder="e.g. Terms of service violation, account review..."
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusModalOrg(null)}
                disabled={statusUpdating}
              >
                Cancel
              </Button>
              <Button
                variant={targetStatus === 'SUSPENDED' ? 'secondary' : 'primary'}
                size="sm"
                onClick={handleConfirmStatusChange}
                disabled={statusUpdating}
              >
                {statusUpdating ? 'Updating...' : `Confirm ${targetStatus}`}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PlatformDashboardPage;
