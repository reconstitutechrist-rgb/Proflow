import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router';
import Layout from '@/components/common/Layout';
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider';
import AuthPage from '@/pages/AuthPage';

// Eagerly load core pages for instant navigation
import Dashboard from '@/pages/Dashboard';
import Projects from '@/pages/Projects';
import Assignments from '@/pages/Assignments';
import Tasks from '@/pages/Tasks';
import DocumentsHub from '@/pages/DocumentsHub';

// Lazy load less frequently used pages
const Users = React.lazy(() => import('@/pages/Users'));
const Chat = React.lazy(() => import('@/pages/Chat'));
// const Generate = React.lazy(() => import("@/pages/Generate")); // Deprecated
const AskAI = React.lazy(() => import('@/pages/AskAI'));
const AIHub = React.lazy(() => import('@/pages/AIHub'));
const Preferences = React.lazy(() => import('@/pages/Preferences'));
const Workspaces = React.lazy(() => import('@/pages/Workspaces'));
const Documentation = React.lazy(() => import('@/pages/Documentation'));

// Preload other pages after initial render for faster subsequent navigation
const preloadPages = () => {
  import('@/pages/Users');
  import('@/pages/Chat');
  import('@/pages/AIHub');
};

const PAGES = {
  Dashboard,
  Documents: DocumentsHub,
  DocumentsHub,
  Users,
  Chat,
  Tasks,
  Generate: DocumentsHub, // Redirected
  Assignments,
  AskAI,
  AIHub,
  Preferences,
  Projects,
  Workspaces,
  Documentation,
  // Redirect old routes to consolidated pages
  Research: AIHub, // Research is now part of AIHub
  DocumentCreator: DocumentsHub,
  DocumentStudio: DocumentsHub,
  DocumentWorkshop: DocumentsHub,
};

function _getCurrentPage(url) {
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  let urlLastPart = url.split('/').pop();
  if (urlLastPart.includes('?')) {
    urlLastPart = urlLastPart.split('?')[0];
  }

  const pageName = Object.keys(PAGES).find(
    (page) => page.toLowerCase() === urlLastPart.toLowerCase()
  );
  return pageName || Object.keys(PAGES)[0];
}

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Auth loading screen
function AuthLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Protected routes wrapper
function ProtectedContent() {
  const location = useLocation();
  const currentPage = _getCurrentPage(location.pathname);
  const { isAuthenticated, loading, initialized } = useAuth();

  // Preload lazy pages after initial render
  useEffect(() => {
    if (isAuthenticated) {
      // Delay preloading to not block initial render
      const timer = setTimeout(preloadPages, 1000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  // Show loading while checking auth
  if (!initialized || loading) {
    return <AuthLoader />;
  }

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={() => window.location.reload()} />;
  }

  // Show main app if authenticated
  return (
    <Layout currentPageName={currentPage}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/Dashboard" element={<Dashboard />} />
          <Route path="/Documents" element={<DocumentsHub />} />
          <Route path="/DocumentsHub" element={<DocumentsHub />} />
          <Route path="/Users" element={<Users />} />
          <Route path="/Chat" element={<Chat />} />
          <Route path="/Tasks" element={<Tasks />} />
          {/* Redirect Generate to DocumentsHub templates */}
          <Route path="/Generate" element={<Navigate to="/DocumentsHub?tab=templates" replace />} />
          {/* Redirect old Research route to AIHub research tab */}
          <Route path="/Research" element={<Navigate to="/AIHub?tab=research" replace />} />
          <Route path="/Assignments" element={<Assignments />} />
          <Route path="/AskAI" element={<AskAI />} />
          <Route path="/AIHub" element={<AIHub />} />
          <Route path="/Preferences" element={<Preferences />} />
          <Route path="/Projects" element={<Projects />} />
          <Route path="/Workspaces" element={<Workspaces />} />
          <Route path="/Documentation" element={<Documentation />} />
          {/* Redirect old document routes to unified DocumentsHub */}
          <Route path="/DocumentCreator" element={<DocumentsHub />} />
          <Route path="/DocumentStudio" element={<DocumentsHub />} />
          <Route path="/DocumentWorkshop" element={<DocumentsHub />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default function Pages() {
  return (
    <AuthProvider>
      <Router>
        <ProtectedContent />
      </Router>
    </AuthProvider>
  );
}
