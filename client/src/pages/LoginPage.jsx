import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Mail,
  Building2,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/app/dashboard';

  const { login, isLoading, error, clearError } = useAuthStore();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    organizationIdentifier: '',
  });

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
      await login(formData);
      navigate(from, { replace: true });
    } catch {
      // Error handled by store
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-navy text-white shadow-sm mb-2">
            <ShieldCheck className="w-6 h-6 text-brand-electric" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
            Sign in to REVITEST
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Access your institutional assessment workspace
          </p>
        </div>

        {/* Card Form */}
        <Card className="p-6 sm:p-8 bg-white shadow-elevated">
          {error && (
            <div className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Organization Identifier (Optional / Scoping) */}
            <div className="space-y-1.5">
              <label
                htmlFor="organizationIdentifier"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Organization Slug or Code{' '}
                <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="organizationIdentifier"
                  name="organizationIdentifier"
                  type="text"
                  placeholder="e.g. stanford or STAN01"
                  value={formData.organizationIdentifier}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Institutional Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="name@institution.edu"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Submit Button */}
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
                {isLoading ? 'Authenticating...' : 'Sign In to Workspace'}
              </Button>
            </div>
          </form>

          {/* Quick Links */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-2.5 text-center text-xs text-slate-600">
            <div>
              <span>New institutional client? </span>
              <Link
                to="/register-org"
                className="font-semibold text-brand-primary hover:underline"
              >
                Register an Organization
              </Link>
            </div>
            <div>
              <span>Student / Candidate? </span>
              <Link
                to="/register"
                className="font-semibold text-brand-primary hover:underline"
              >
                Join Organization Workspace
              </Link>
            </div>
          </div>
        </Card>

        {/* Security Assurance Badge */}
        <div className="text-center">
          <Badge variant="neutral" size="sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
            <span>End-to-End Multi-Tenant Isolation & JWT Security</span>
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
