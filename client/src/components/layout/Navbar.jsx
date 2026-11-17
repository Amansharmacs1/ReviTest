import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Menu, X, ArrowUpRight, Activity } from 'lucide-react';
import { useSystemStore } from '../../store/systemStore';
import Badge from '../common/Badge';
import Button from '../common/Button';

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { apiStatus, dbStatus, checkSystemHealth } = useSystemStore();

  useEffect(() => {
    checkSystemHealth();
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [checkSystemHealth]);

  const isSystemOnline = apiStatus === 'healthy' && dbStatus === 'connected';

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
            <a
              href="#overview"
              className="hover:text-brand-primary transition-colors py-1"
            >
              Overview
            </a>
            <a
              href="#capabilities"
              className="hover:text-brand-primary transition-colors py-1"
            >
              Capabilities
            </a>
            <a
              href="#architecture"
              className="hover:text-brand-primary transition-colors py-1"
            >
              Architecture
            </a>
            <a
              href="#system-health"
              className="hover:text-brand-primary transition-colors py-1 flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5 text-slate-400" />
              <span>Telemetry</span>
            </a>
          </nav>

          {/* Right Header Controls */}
          <div className="hidden md:flex items-center gap-4">
            {/* Live System Status Pill */}
            <a href="#system-health" title="Click to view live infrastructure telemetry">
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

            {/* CTAs (Placeholder per Phase 1 requirements) */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const el = document.getElementById('capabilities');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Explore Platform
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={ArrowUpRight}
              iconPosition="right"
              onClick={() => {
                const el = document.getElementById('overview');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Get Started
            </Button>
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
          <a
            href="#overview"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Overview
          </a>
          <a
            href="#capabilities"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Capabilities
          </a>
          <a
            href="#architecture"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Architecture
          </a>
          <a
            href="#system-health"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            System Telemetry
          </a>
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <Button
              variant="outline"
              size="md"
              className="w-full"
              onClick={() => setMobileMenuOpen(false)}
            >
              Explore Platform
            </Button>
            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => setMobileMenuOpen(false)}
            >
              Get Started
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
