import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  Building2,
  ArrowRight,
  AlertCircle,
  GraduationCap,
  CheckCircle2,
  Search,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';

export const RegisterCandidatePage = () => {
  const navigate = useNavigate();
  const { registerCandidate, isLoading, error, clearError } = useAuthStore();

  const [formData, setFormData] = useState({
    organizationIdentifier: '',
    name: '',
    email: '',
    password: '',
    studentId: '',
    department: '',
  });

  const [verifiedOrg, setVerifiedOrg] = useState(null);
  const [verifyingOrg, setVerifyingOrg] = useState(false);
  const [orgLookupError, setOrgLookupError] = useState(null);

  const handleVerifyOrg = async () => {
    if (!formData.organizationIdentifier) {
      setOrgLookupError('Please enter an organization code or workspace slug.');
      return;
    }

    setVerifyingOrg(true);
    setOrgLookupError(null);

    try {
      const res = await authService.getPublicTenant(formData.organizationIdentifier);
      setVerifiedOrg(res.data);
    } catch (err) {
      setVerifiedOrg(null);
      setOrgLookupError(err.message || 'Organization not found.');
    } finally {
      setVerifyingOrg(false);
    }
  };

  const handleChange = (e) => {
    if (error) clearError();
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await registerCandidate(formData);
      navigate('/app/dashboard');
    } catch {
      // Handled by store
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="info" size="md">
            <GraduationCap className="w-3.5 h-3.5 mr-1" />
            <span>Candidate Portal</span>
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
            Join Examination Workspace
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Register as a student or candidate under your institution
          </p>
        </div>

        <Card className="p-6 sm:p-8 bg-white shadow-elevated">
          {error && (
            <div className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Organization Identifier with Lookup */}
            <div className="space-y-1.5">
              <label
                htmlFor="organizationIdentifier"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Organization Code or Slug *
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="organizationIdentifier"
                    name="organizationIdentifier"
                    type="text"
                    required
                    placeholder="e.g. APEX26 or apex-institute"
                    value={formData.organizationIdentifier}
                    onChange={(e) => {
                      setVerifiedOrg(null);
                      setOrgLookupError(null);
                      handleChange(e);
                    }}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all placeholder:text-slate-400 font-mono text-xs uppercase"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleVerifyOrg}
                  disabled={verifyingOrg}
                  icon={Search}
                >
                  {verifyingOrg ? '...' : 'Verify'}
                </Button>
              </div>

              {/* Verified Organization Card / Badge */}
              {verifiedOrg && (
                <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{verifiedOrg.name}</span>
                  </span>
                  <Badge variant="success" size="sm">
                    Verified Org
                  </Badge>
                </div>
              )}

              {orgLookupError && (
                <p className="text-[11px] text-rose-600 font-medium pt-1">
                  {orgLookupError}
                </p>
              )}
            </div>

            {/* Candidate Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="name"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Aman Sharma"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="student@institution.edu"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Password (min 8 chars) *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Student ID & Department */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="studentId"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  Roll / Student ID
                </label>
                <input
                  id="studentId"
                  name="studentId"
                  type="text"
                  placeholder="CS-2026-042"
                  value={formData.studentId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all placeholder:text-slate-400 font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="department"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  Department / Branch
                </label>
                <input
                  id="department"
                  name="department"
                  type="text"
                  placeholder="Computer Science"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                disabled={isLoading}
                icon={ArrowRight}
                iconPosition="right"
              >
                {isLoading ? 'Registering...' : 'Create Candidate Account'}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-600">
            <span>Already registered? </span>
            <Link
              to="/login"
              className="font-semibold text-brand-primary hover:underline"
            >
              Sign In
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RegisterCandidatePage;

