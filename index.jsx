import React, { Suspense } from "react";
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import Layout from "./Layout.jsx";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import AuthPage from "./AuthPage.jsx";

// Lazy load all page components for code splitting
const Dashboard = React.lazy(() => import("./Dashboard"));
const Documents = React.lazy(() => import("./Documents"));
const Users = React.lazy(() => import("./Users"));
const Chat = React.lazy(() => import("./Chat"));
const Tasks = React.lazy(() => import("./Tasks"));
const Research = React.lazy(() => import("./Research"));
const Generate = React.lazy(() => import("./Generate"));
const Assignments = React.lazy(() => import("./Assignments"));
const AskAI = React.lazy(() => import("./AskAI"));
const Preferences = React.lazy(() => import("./Preferences"));
const DocumentCreator = React.lazy(() => import("./DocumentCreator"));
const Projects = React.lazy(() => import("./Projects"));
const Workspaces = React.lazy(() => import("./Workspaces"));
const Documentation = React.lazy(() => import("./Documentation"));
const DocumentStudio = React.lazy(() => import("./DocumentStudio"));
const DocumentWorkshop = React.lazy(() => import("./DocumentWorkshop"));

const PAGES = {
    Dashboard,
    Documents,
    Users,
    Chat,
    Tasks,
    Research,
    Generate,
    Assignments,
    AskAI,
    Preferences,
    DocumentCreator,
    Projects,
    Workspaces,
    Documentation,
    DocumentStudio,
    DocumentWorkshop,
};

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
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
                    <Route path="/Documents" element={<Documents />} />
                    <Route path="/Users" element={<Users />} />
                    <Route path="/Chat" element={<Chat />} />
                    <Route path="/Tasks" element={<Tasks />} />
                    <Route path="/Research" element={<Research />} />
                    <Route path="/Generate" element={<Generate />} />
                    <Route path="/Assignments" element={<Assignments />} />
                    <Route path="/AskAI" element={<AskAI />} />
                    <Route path="/Preferences" element={<Preferences />} />
                    <Route path="/DocumentCreator" element={<DocumentCreator />} />
                    <Route path="/Projects" element={<Projects />} />
                    <Route path="/Workspaces" element={<Workspaces />} />
                    <Route path="/Documentation" element={<Documentation />} />
                    <Route path="/DocumentStudio" element={<DocumentStudio />} />
                    <Route path="/DocumentWorkshop" element={<DocumentWorkshop />} />
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
