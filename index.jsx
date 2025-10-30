import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Documents from "./Documents";

import Users from "./Users";

import Chat from "./Chat";

import Tasks from "./Tasks";

import Research from "./Research";

import Generate from "./Generate";

import Assignments from "./Assignments";

import AskAI from "./AskAI";

import Preferences from "./Preferences";

import DocumentCreator from "./DocumentCreator";

import Projects from "./Projects";

import Workspaces from "./Workspaces";

import Documentation from "./Documentation";

import DocumentStudio from "./DocumentStudio";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Documents: Documents,
    
    Users: Users,
    
    Chat: Chat,
    
    Tasks: Tasks,
    
    Research: Research,
    
    Generate: Generate,
    
    Assignments: Assignments,
    
    AskAI: AskAI,
    
    Preferences: Preferences,
    
    DocumentCreator: DocumentCreator,
    
    Projects: Projects,
    
    Workspaces: Workspaces,
    
    Documentation: Documentation,
    
    DocumentStudio: DocumentStudio,
    
}

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

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
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
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}