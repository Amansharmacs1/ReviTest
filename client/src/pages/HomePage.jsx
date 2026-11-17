import React from 'react';
import {
  ArrowRight,
  ShieldCheck,
  Building2,
  Zap,
  RefreshCw,
  ShieldAlert,
  BarChart3,
  Sheet,
  CheckCircle,
  Lock,
  Users,
  Server,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Card from '../components/common/Card';
import SystemHealthCard from '../components/common/SystemHealthCard';
import { APP_CONFIG, FUTURE_CAPABILITIES } from '../constants';

// Dynamic icon mapper for capabilities
const capabilityIcons = {
  Building2,
  Zap,
  RefreshCw,
  ShieldAlert,
  BarChart3,
  Sheet,
};

export const HomePage = () => {
  return (
    <div className="space-y-24 py-8 lg:py-16">
      {/* 1. HERO SECTION */}
      <section id="overview" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2">
            <Badge variant="navy" size="md">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-electric animate-ping" />
              <span>{APP_CONFIG.PHASE}</span>
              <span className="text-slate-400">•</span>
              <span className="text-brand-electric">Production Ready</span>
            </Badge>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-navy tracking-tight leading-[1.12]">
            High-Stakes Online Examination{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-electric">
              Infrastructure
            </span>
          </h1>

          {/* Product Description */}
          <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto">
            REVITEST is an enterprise multi-tenant assessment platform engineered for
            universities, coaching academies, and recruitment teams — built from the
            ground up to reliably deliver high-concurrency exams with zero data loss.
          </p>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              variant="primary"
              size="lg"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => {
                const el = document.getElementById('system-health');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Get Started
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                const el = document.getElementById('capabilities');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Explore Platform
            </Button>
          </div>

          {/* Trust Metric Badges */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto text-left">
            <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-subtle">
              <div className="text-xs text-slate-500 font-medium">Target Concurrency</div>
              <div className="text-base font-bold text-navy">1,000+ Students</div>
            </div>
            <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-subtle">
              <div className="text-xs text-slate-500 font-medium">Multi-Tenancy</div>
              <div className="text-base font-bold text-navy">Org Isolation</div>
            </div>
            <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-subtle">
              <div className="text-xs text-slate-500 font-medium">Auto-Recovery</div>
              <div className="text-base font-bold text-navy">Zero Data Loss</div>
            </div>
            <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-subtle">
              <div className="text-xs text-slate-500 font-medium">Architecture</div>
              <div className="text-base font-bold text-navy">MERN Monolith</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. LIVE TELEMETRY / HEALTH CHECK PANEL */}
      <section id="system-health" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <SystemHealthCard />
      </section>

      {/* 3. FUTURE PLATFORM CAPABILITIES SECTION */}
      <section id="capabilities" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <Badge variant="info" size="sm">
            Platform Capabilities
          </Badge>
          <h2 className="text-3xl font-bold text-navy tracking-tight">
            Engineered for Modern Examination Scale
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            A look into the foundational architecture preparing REVITEST for end-to-end
            online assessment orchestration across diverse educational and corporate
            domains.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FUTURE_CAPABILITIES.map((cap) => {
            const Icon = capabilityIcons[cap.iconName] || ShieldCheck;
            return (
              <Card
                key={cap.id}
                hoverEffect
                className="p-6 flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-brand-primary flex items-center justify-center group-hover:bg-brand-primary group-hover:text-white transition-colors duration-200">
                      <Icon className="w-5 h-5" />
                    </div>
                    <Badge variant="neutral" size="sm">
                      {cap.tag}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-navy group-hover:text-brand-primary transition-colors">
                      {cap.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                      {cap.description}
                    </p>
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span>Architecture Ready</span>
                  <span className="group-hover:translate-x-1 transition-transform text-brand-primary">
                    →
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 4. ARCHITECTURE & MULTI-TENANCY BLUEPRINT */}
      <section id="architecture" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-navy rounded-2xl p-8 lg:p-12 text-white border border-navy-800 shadow-elevated">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-5">
              <Badge variant="navy" size="md">
                Phase 1 Structural Blueprint
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Built with Modular Monolith Discipline
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Rather than introducing premature microservice latency and operational
                overhead, REVITEST establishes a rigorously modularized monolith. Clean
                boundary separation between controllers, models, and services guarantees
                smooth scaling up to 1,000+ concurrent test-takers on standard cloud
                instances.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  'Strict frontend/backend environment variable isolation',
                  'Centralized API error translation and custom HTTP response standards',
                  'Database connection pooling tuned for concurrent exam bursts',
                  'Helmet security headers and IP rate-limiting protection',
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 text-xs text-slate-300"
                  >
                    <CheckCircle className="w-4 h-4 text-brand-electric shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Architecture Flow Diagram */}
            <div className="bg-navy-900 rounded-xl p-6 border border-navy-800 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-navy-800 text-slate-400">
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-electric" />
                  <span>REVITEST Core Architecture</span>
                </span>
                <span className="text-[10px] text-emerald-400">STATUS: INITIALIZED</span>
              </div>

              <div className="space-y-2 text-slate-300">
                <div className="p-2.5 rounded bg-navy-800/80 border border-navy-700/60 flex items-center justify-between">
                  <span>Client Layer (Vite + React + Tailwind)</span>
                  <span className="text-brand-electric">PORT 5173</span>
                </div>
                <div className="text-center text-slate-500 text-[10px]">
                  ▼ Axios REST / Reverse Proxy
                </div>
                <div className="p-2.5 rounded bg-navy-800/80 border border-navy-700/60 flex items-center justify-between">
                  <span>API Layer (Express + Security Middleware)</span>
                  <span className="text-brand-electric">PORT 5000</span>
                </div>
                <div className="text-center text-slate-500 text-[10px]">
                  ▼ Mongoose Driver (Connection Pool: 50)
                </div>
                <div className="p-2.5 rounded bg-navy-800/80 border border-navy-700/60 flex items-center justify-between">
                  <span>Persistence Layer (MongoDB Engine)</span>
                  <span className="text-emerald-400">PORT 27017</span>
                </div>
              </div>

              <div className="pt-3 border-t border-navy-800 text-[11px] text-slate-500">
                Next Stage: Phase 2 will implement multi-tenant schema models and
                JWT-based RBAC.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION BANNER */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-navy">
          Ready to scale your institutional assessments?
        </h2>
        <p className="text-slate-600 text-sm max-w-xl mx-auto">
          Phase 1 provides the battle-tested base. Stay tuned as we release tenant
          organization workspaces, question banks, and live proctoring in upcoming
          milestones.
        </p>
        <div className="pt-2 flex justify-center gap-4">
          <Button
            variant="secondary"
            size="md"
            icon={ArrowUpRight}
            iconPosition="right"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            Back to Top
          </Button>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
