import React, { useState } from 'react';
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
import { usePortalDashboard } from '@/api/devHub.api';
import { Loader2, LayoutDashboard, Ticket, Plus, BarChart3, MoreHorizontal, User, Lock } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

export default function DevPortalLayout() {
  const { token } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading, error } = usePortalDashboard(token as string);

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [vendorEmail, setVendorEmail] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="w-12 h-12 bg-[#081B3A] rounded-xl flex items-center justify-center">
          <span className="text-white font-black text-xs">SVV</span>
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <p className="text-sm text-gray-500">Loading Developer Portal...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 px-6 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <span className="text-3xl">⚠️</span>
        </div>
        <h2 className="font-bold text-[#081B3A] text-xl">Invalid Developer Token</h2>
        <p className="text-sm text-gray-500">This link may be expired or invalid.<br />Please contact SVV Pay admin for a new link.</p>
      </div>
    );
  }

  const teamName = data.team?.name || 'Developer Team';
  const authorizedEmailsStr = data.team?.contactEmail || '';
  const authorizedEmails = authorizedEmailsStr.split(',').map((e: string) => e.trim().toLowerCase());

  React.useEffect(() => {
    const storedEmail = localStorage.getItem('vendor_auth_email');
    if (storedEmail) {
      if (authorizedEmails.includes(storedEmail.toLowerCase())) {
        setIsAuthenticated(true);
        setVendorEmail(storedEmail.toLowerCase());
      } else {
        localStorage.removeItem('vendor_auth_email');
      }
    }
  }, [authorizedEmailsStr]);

  const handleGoogleSuccess = (credentialResponse: any) => {
    try {
      const decoded: any = jwtDecode(credentialResponse.credential);
      const email = decoded.email?.toLowerCase();
      
      if (authorizedEmails.includes(email)) {
        setIsAuthenticated(true);
        setVendorEmail(email);
        setAuthError(null);
        localStorage.setItem('vendor_auth_email', email);
      } else {
        setAuthError(`Email ${email} is not authorized for ${teamName}.`);
      }
    } catch (err) {
      setAuthError("Failed to decode login response.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('vendor_auth_email');
    setIsAuthenticated(false);
    setVendorEmail(null);
  };

  // Auth Gateway
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border overflow-hidden text-center">
          <div className="bg-[#081B3A] py-6 px-4">
            <Lock className="w-8 h-8 text-blue-300 mx-auto mb-2" />
            <h1 className="text-xl font-bold text-white">Vendor Portal</h1>
            <p className="text-sm text-blue-200 mt-1">{teamName}</p>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-600 mb-6">
              Please sign in with your authorized Google account to access your dashboard.
            </p>
            {authError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200 text-left">
                {authError}
              </div>
            )}
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setAuthError("Google Login Failed.")}
                useOneTap
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const issues = data.issues || [];
  const now = new Date().getTime();
  const stats = {
    total: issues.length,
    pending: issues.filter((i: any) => !['CLOSED', 'VERIFIED_BY_SVV', 'COMPLETED_BY_DEV'].includes(i.status)).length,
    completed: issues.filter((i: any) => ['CLOSED', 'COMPLETED_BY_DEV', 'VERIFIED_BY_SVV'].includes(i.status)).length,
    overdue: issues.filter((i: any) => {
      if (['CLOSED', 'VERIFIED_BY_SVV', 'COMPLETED_BY_DEV'].includes(i.status)) return false;
      const ageDays = (now - new Date(i.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return ageDays > 7;
    }).length,
  };

  const isDetailPage = location.pathname.includes('/issues/');

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col max-w-md mx-auto">
      {/* Top Header */}
      <header className="bg-[#081B3A] text-white px-4 pt-10 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-white rounded-md px-2 py-0.5">
              <span className="text-[#081B3A] font-black text-sm">SVV</span>
              <span className="text-blue-600 font-black text-sm">'PAY</span>
            </div>
            <div>
              <div className="text-[10px] text-blue-300 leading-tight">Vendor Portal</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-xs font-bold text-white truncate max-w-[120px]">{teamName}</div>
              <div className="text-[9px] text-blue-300 flex items-center justify-end gap-1">
                <User className="w-2.5 h-2.5" /> {vendorEmail}
              </div>
              <button onClick={handleLogout} className="text-[9px] text-red-300 hover:text-red-200 underline mt-0.5">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        <Outlet context={{ token, teamName, stats, issues, vendorEmail }} />
      </main>

      {/* Bottom Navigation */}
      {!isDetailPage && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t shadow-lg z-10">
          <div className="grid grid-cols-5 h-16">
            {[
              { icon: LayoutDashboard, label: 'Dashboard', path: `/dev-portal/${token}` },
              { icon: Ticket, label: 'Tickets', path: `/dev-portal/${token}` },
              { icon: Plus, label: 'Create', path: '#', highlight: true },
              { icon: BarChart3, label: 'Reports', path: '#' },
              { icon: MoreHorizontal, label: 'More', path: '#' },
            ].map(({ icon: Icon, label, path, highlight }) => {
              const isActive = location.pathname === path && path !== '#';
              return (
                <button
                  key={label}
                  onClick={() => path !== '#' && navigate(path)}
                  className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    highlight ? 'text-blue-600' : isActive ? 'text-[#081B3A]' : 'text-gray-400'
                  }`}
                >
                  {highlight ? (
                    <div className="w-10 h-10 bg-[#0D6EFD] rounded-full flex items-center justify-center -mt-4 shadow-lg">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                  <span className="text-[10px] font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
