import React from 'react';
import { ShieldCheck, Server, Database, GitBranch, Layers } from 'lucide-react';
import { APP_CONFIG } from '../../constants';

export const Footer = () => {
  return (
    <footer className="bg-navy text-slate-400 border-t border-navy-800 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Column 1: Brand & Mission */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center text-white">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white">
                REVI<span className="text-brand-electric">TEST</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enterprise-grade multi-tenant examination and assessment management SaaS
              platform designed for high concurrency, proctored integrity, and seamless
              organizational isolation.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-navy-800 text-slate-300 text-xs border border-navy-700">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Phase 1: Foundation Ready</span>
              </span>
            </div>
          </div>

          {/* Column 2: Architectural Pillars */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Architecture Pillars
            </h3>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2 text-slate-400">
                <Layers className="w-3.5 h-3.5 text-brand-electric" />
                <span>Multi-Tenant Schema Isolation</span>
              </li>
              <li className="flex items-center gap-2 text-slate-400">
                <Server className="w-3.5 h-3.5 text-brand-electric" />
                <span>Stateless Node/Express API</span>
              </li>
              <li className="flex items-center gap-2 text-slate-400">
                <Database className="w-3.5 h-3.5 text-brand-electric" />
                <span>Mongoose Connection Pooling</span>
              </li>
              <li className="flex items-center gap-2 text-slate-400">
                <GitBranch className="w-3.5 h-3.5 text-brand-electric" />
                <span>1,000+ Concurrent Scale Target</span>
              </li>
            </ul>
          </div>

          {/* Column 3: Platform Roadmap */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Roadmap Milestones
            </h3>
            <ul className="space-y-2 text-xs">
              <li className="text-slate-300 font-medium">
                Phase 1: Project Foundation (Current)
              </li>
              <li className="text-slate-500">Phase 2: Tenant & RBAC Auth Engine</li>
              <li className="text-slate-500">Phase 3: Assessment & Question Bank</li>
              <li className="text-slate-500">Phase 4: Examination Engine & Recovery</li>
              <li className="text-slate-500">Phase 5: Auto-Grading & Sheets Sync</li>
            </ul>
          </div>

          {/* Column 4: Technology Stack */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Technology Stack
            </h3>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {[
                'React.js',
                'Vite',
                'Tailwind CSS',
                'Node.js',
                'Express.js',
                'MongoDB',
                'Mongoose',
                'Zustand',
                'Axios',
                'Helmet',
              ].map((tech) => (
                <span
                  key={tech}
                  className="px-2 py-0.5 rounded bg-navy-800 text-slate-300 border border-navy-700"
                >
                  {tech}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 pt-2">
              Strict frontend-backend decoupling with centralized environment
              configurations.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-navy-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} {APP_CONFIG.NAME}. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span>Production Foundation</span>
            <span>•</span>
            <span>Single Repository Monorepo</span>
            <span>•</span>
            <span>REST API v1</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
