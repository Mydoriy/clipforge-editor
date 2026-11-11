import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Toasts } from './components/Toasts';
import { ConfirmDialog } from './components/ConfirmDialog';
import { EditPilot } from './components/EditPilot';
import { OnboardingTour } from './components/OnboardingTour';
import { TelemetryConsentBanner } from './components/TelemetryConsentBanner';

// Code-split pages and modals to satisfy initial bundle budget (<300KB gzip)
const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })));
const Editor = lazy(() => import('./pages/Editor').then((m) => ({ default: m.Editor })));
const DesignStudio = lazy(() => import('./pages/DesignStudio').then((m) => ({ default: m.DesignStudio })));
const SectionPage = lazy(() => import('./pages/SectionPage').then((m) => ({ default: m.SectionPage })));
const Privacy = lazy(() => import('./pages/Privacy').then((m) => ({ default: m.Privacy })));
const Help = lazy(() => import('./pages/Help').then((m) => ({ default: m.Help })));
const Welcome = lazy(() => import('./pages/Welcome').then((m) => ({ default: m.Welcome })));
const TelemetryDashboard = lazy(() => import('./pages/TelemetryDashboard').then((m) => ({ default: m.TelemetryDashboard })));
const Lab = lazy(() => import('./pages/Lab').then((m) => ({ default: m.Lab })));
const Modals = lazy(() => import('./components/Modals').then((m) => ({ default: m.Modals })));

const PageLoader: React.FC = () => (
  <div className="flex-1 flex items-center justify-center bg-[#0B0F19] text-[#1FC8DB] text-xs font-medium">
    <div className="w-5 h-5 border-2 border-[#1FC8DB] border-t-transparent rounded-full animate-spin mr-2.5" />
    <span>Đang tải ClipForge...</span>
  </div>
);

const MainLayout: React.FC = () => {
  return (
    <div className="flex flex-col h-screen h-[100dvh] min-h-[100dvh] overflow-hidden bg-[#0B0F19] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
      <Header />
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar />
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </div>
      <EditPilot />
      <Suspense fallback={null}>
        <Modals />
      </Suspense>
      <OnboardingTour />
      <Toasts />
      <TelemetryConsentBanner />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
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
            <Route path="/privacy" element={<Privacy initialTab="privacy" />} />
            <Route path="/terms" element={<Privacy initialTab="terms" />} />
            <Route path="/help" element={<Help />} />
            <Route path="/lab" element={<Lab />} />
          </Route>

          {/* Fullscreen Video Editor */}
          <Route
            path="/editor/:id"
            element={
              <>
                <Editor />
                <Suspense fallback={null}>
                  <Modals />
                </Suspense>
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
                <Suspense fallback={null}>
                  <Modals />
                </Suspense>
                <Toasts />
              </>
            }
          />

          {/* Standalone Landing Page */}
          <Route path="/welcome" element={<Welcome />} />

          {/* Internal Telemetry Dashboard */}
          <Route path="/telemetry" element={<TelemetryDashboard />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <ConfirmDialog />
    </BrowserRouter>
  );
};

export default App;
