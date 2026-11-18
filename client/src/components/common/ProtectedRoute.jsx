import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import Card from './Card';
import Badge from './Badge';
import Button from './Button';
import { ShieldAlert } from 'lucide-react';

export const ProtectedRoute = ({ children, allowedRoles = null }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role authorization if allowedRoles are specified
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <Card className="max-w-md w-full p-8 text-center space-y-5 shadow-elevated">
          <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <Badge variant="error" size="sm">
              Access Restricted
            </Badge>
            <h2 className="text-xl font-bold text-navy">Insufficient Permissions</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your account role is{' '}
              <span className="font-semibold text-navy">{user.role}</span>. This section
              requires{' '}
              <span className="font-medium text-brand-primary">
                {allowedRoles.join(' or ')}
              </span>{' '}
              permissions.
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <Button variant="outline" size="md" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
