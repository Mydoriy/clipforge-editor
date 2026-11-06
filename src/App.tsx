import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Modals } from './components/Modals';
import { Toasts } from './components/Toasts';
import { Home } from './pages/Home';
import { Editor } from './pages/Editor';
import { DesignStudio } from './pages/DesignStudio';
import { SectionPage } from './pages/SectionPage';
import { EditPilot } from './components/EditPilot';

const MainLayout: React.FC = () => {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0B0F19]">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <Outlet />
      </div>
      <EditPilot />
      <Modals />
      <Toasts />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main Dashboard & Subpages with Sidebar Layout */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/templates" element={<SectionPage />} />
          <Route path="/video-studio" element={<SectionPage />} />
          <Route path="/ai-tools" element={<SectionPage />} />
          <Route path="/marketing" element={<SectionPage />} />
          <Route path="/library" element={<SectionPage />} />
          <Route path="/cloud-storage" element={<SectionPage />} />
        </Route>

        {/* Fullscreen Video Editor */}
        <Route
          path="/editor/:id"
          element={
            <>
              <Editor />
              <Modals />
              <Toasts />
            </>
          }
        />

        {/* Fullscreen Design Studio */}
        <Route
          path="/design"
          element={
            <>
              <DesignStudio />
              <Modals />
              <Toasts />
            </>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
