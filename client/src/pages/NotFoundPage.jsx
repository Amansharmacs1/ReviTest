import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';

export const NotFoundPage = () => {
  const location = useLocation();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-card">
        <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
          <FileQuestion className="w-8 h-8 text-brand-primary" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-semibold text-brand-primary uppercase tracking-wider">
            Error 404
          </span>
          <h1 className="text-2xl font-bold text-navy">Page Not Found</h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            The requested route{' '}
            <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono text-xs">
              {location.pathname}
            </code>{' '}
            does not exist on the REVITEST SaaS platform.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/" className="w-full sm:w-auto">
            <Button variant="primary" size="md" icon={Home} className="w-full sm:w-auto">
              Back to Home
            </Button>
          </Link>
          <Button
            variant="outline"
            size="md"
            icon={ArrowLeft}
            onClick={() => window.history.back()}
            className="w-full sm:w-auto"
          >
            Go Back
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default NotFoundPage;
