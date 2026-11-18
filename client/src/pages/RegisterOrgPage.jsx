import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  User,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Globe,
  KeyRound,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';

export const RegisterOrgPage = () => {
  const navigate = useNavigate();
  const { registerOrg, isLoading, error, clearError } = useAuthStore();

  const [formData, setFormData] = useState({
    organizationName: '',
    organizationSlug: '',
    organizationCode: '',
    organizationType: 'COLLEGE_UNIVERSITY',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  const slugify = (text) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleOrgNameChange = (e) => {
    const name = e.target.value;
    const generatedSlug = slugify(name);
    const generatedCode = name
      .replace(/[^a-zA-Z]/g, '')
      .substring(0, 4)
      .toUpperCase();

    setFormData((prev) => ({
      ...prev,
      organizationName: name,
      // Only auto-fill if user hasn't typed custom values yet
      organizationSlug:
        prev.organizationSlug === '' ||
        prev.organizationSlug === slugify(prev.organizationName)
          ? generatedSlug
          : prev.organizationSlug,
      organizationCode:
        prev.organizationCode === '' ? generatedCode : prev.organizationCode,
    }));
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
      await registerOrg(formData);
      navigate('/app/dashboard');
    } catch {
      // Handled by store
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="navy" size="md">
            <Sparkles className="w-3.5 h-3.5 text-brand-electric mr-1" />
            <span>Multi-Tenant Onboarding</span>
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
            Register Institutional Workspace
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Provision an isolated assessment workspace for your university, coaching
            academy, or recruitment team.
          </p>
        </div>

        <Card className="p-6 sm:p-8 bg-white shadow-elevated">
          {error && (
            <div className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* SECTION 1: ORGANIZATION DETAILS */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Building2 className="w-4 h-4 text-brand-primary" />
                <span>1. Organization Workspace Details</span>
              </div>

              {/* Name */}
              <div className="space-y-1">
                <label
                  htmlFor="organizationName"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Organization Name *
                </label>
                <input
                  id="organizationName"
                  name="organizationName"
                  type="text"
                  required
                  placeholder="e.g. Apex Institute of Technology"
                  value={formData.organizationName}
                  onChange={handleOrgNameChange}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Slug & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="organizationSlug"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Workspace Slug *
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="organizationSlug"
                      name="organizationSlug"
                      type="text"
                      required
                      placeholder="e.g. apex-institute"
                      value={formData.organizationSlug}
                      onChange={handleChange}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all placeholder:text-slate-400 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="organizationCode"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Access Code (3-16 chars) *
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="organizationCode"
                      name="organizationCode"
                      type="text"
                      required
                      placeholder="e.g. APEX26"
                      value={formData.organizationCode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          organizationCode: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all placeholder:text-slate-400 font-mono text-xs uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Type Selection */}
              <div className="space-y-1">
                <label
                  htmlFor="organizationType"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Organization Type
                </label>
                <select
                  id="organizationType"
                  name="organizationType"
                  value={formData.organizationType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                >
                  <option value="COLLEGE_UNIVERSITY">College or University</option>
                  <option value="COACHING_INSTITUTE">Coaching Academy / Test Prep</option>
                  <option value="ENTERPRISE_RECRUITER">
                    Enterprise / Corporate Hiring
                  </option>
                  <option value="ASSESSMENT_PROVIDER">
                    Independent Certification Body
                  </option>
                  <option value="OTHER">Other Organization</option>
                </select>
              </div>

              {/* Live Workspace URL Preview */}
              {formData.organizationSlug && (
                <div className="p-2.5 rounded bg-blue-50 border border-blue-100 flex items-center justify-between text-[11px] text-blue-900 font-mono">
                  <span>Workspace Domain:</span>
                  <span className="font-semibold text-brand-primary">
                    revitest.com/{formData.organizationSlug}
                  </span>
                </div>
              )}
            </div>

            {/* SECTION 2: ORG ADMINISTRATOR ACCOUNT */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <User className="w-4 h-4 text-brand-primary" />
                <span>2. Master Administrator Account</span>
              </div>

              {/* Admin Name */}
              <div className="space-y-1">
                <label
                  htmlFor="adminName"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Admin Full Name *
                </label>
                <input
                  id="adminName"
                  name="adminName"
                  type="text"
                  required
                  placeholder="Dr. Jane Doe"
                  value={formData.adminName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Admin Email */}
              <div className="space-y-1">
                <label
                  htmlFor="adminEmail"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Official Admin Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="adminEmail"
                    name="adminEmail"
                    type="email"
                    required
                    placeholder="admin@institution.edu"
                    value={formData.adminEmail}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Admin Password */}
              <div className="space-y-1">
                <label
                  htmlFor="adminPassword"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Master Password (min 8 chars) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="adminPassword"
                    name="adminPassword"
                    type="password"
                    required
                    minLength={8}
                    placeholder="••••••••"
                    value={formData.adminPassword}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-3">
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                disabled={isLoading}
                icon={ArrowRight}
                iconPosition="right"
              >
                {isLoading
                  ? 'Provisioning Workspace...'
                  : 'Provision Organization Workspace'}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-600">
            <span>Already have an active workspace? </span>
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

export default RegisterOrgPage;
