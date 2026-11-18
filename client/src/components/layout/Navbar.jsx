import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Menu,
  X,
  ArrowUpRight,
  Activity,
  User,
  LogOut,
  LayoutDashboard,
} from 'lucide-react';
import { useSystemStore } from '../../store/systemStore';
import { useAuthStore } from '../../store/authStore';
import Badge from '../common/Badge';
import Button from '../common/Button';

export const Navbar = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { apiStatus, dbStatus, checkSystemHealth } = useSystemStore();
  const { isAuthenticated, user, organization, logout } = useAuthStore();

  useEffect(() => {
    checkSystemHealth();
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [checkSystemHealth]);

  const isSystemOnline = apiStatus === 'healthy' && dbStatus === 'connected';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-subtle'
          : 'bg-white border-b border-slate-200'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo / Wordmark */}
          <Link to="/" className="flex items-center gap-3 group focus:outline-none">
            <div className="w-9 h-9 rounded-lg bg-navy flex items-center justify-center text-white shadow-sm group-hover:bg-brand-primary transition-colors">
              <ShieldCheck className="w-5 h-5 text-brand-electric group-hover:text-white transition-colors" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-navy">
                  REVI<span className="text-brand-primary">TEST</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  SaaS
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium tracking-wide">
                Assessment Engine
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link to="/" className="hover:text-brand-primary transition-colors py-1">
              Overview
            </Link>
            <a
              href="/#capabilities"
              className="hover:text-brand-primary transition-colors py-1"
            >
              Capabilities
            </a>
            <a
              href="/#architecture"
              className="hover:text-brand-primary transition-colors py-1"
            >
              Architecture
            </a>
            <a
              href="/#system-health"
              className="hover:text-brand-primary transition-colors py-1 flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5 text-slate-400" />
              <span>Telemetry</span>
            </a>
          </nav>

          {/* Right Header Controls */}
          <div className="hidden md:flex items-center gap-4">
            {/* Live System Status Pill */}
            <a href="/#system-health" title="Click to view live infrastructure telemetry">
              <Badge
                variant={
                  isSystemOnline
                    ? 'success'
                    : apiStatus === 'checking'
                      ? 'info'
                      : 'warning'
                }
                size="sm"
                dot
              >
                {isSystemOnline
                  ? 'System Operational'
                  : apiStatus === 'checking'
                    ? 'Connecting...'
                    : 'Degraded State'}
              </Badge>
            </a>

            <div className="h-4 w-px bg-slate-200" />

            {isAuthenticated ? (
              /* Authenticated Controls */
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-semibold text-xs">
                    {user?.name?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-navy leading-none">
                      {user?.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {organization?.name || user?.role}
                    </span>
                  </div>
                </div>

                <Link to="/app/dashboard">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={LayoutDashboard}
                    iconPosition="left"
                  >
                    Dashboard
                  </Button>
                </Link>

                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Unauthenticated Controls */
              <div className="flex items-center gap-2.5">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register-org">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={ArrowUpRight}
                    iconPosition="right"
                  >
                    Register Org
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex md:hidden items-center gap-2">
            <Badge variant={isSystemOnline ? 'success' : 'warning'} size="sm" dot>
              {isSystemOnline ? 'Live' : 'Check'}
            </Badge>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-navy hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-6 space-y-3 shadow-lg">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Overview
          </Link>
          <a
            href="/#capabilities"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Capabilities
          </a>
          <a
            href="/#architecture"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Architecture
          </a>

          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <Link to="/app/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="md" className="w-full">
                    Go to Dashboard
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="md" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register-org" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="md" className="w-full">
                    Register Organization
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
