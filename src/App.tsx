import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Modals } from './components/Modals';
import { Toasts } from './components/Toasts';
import { Home } from './pages/Home';
import { Editor } from './pages/Editor';
import { DesignStudio } from './pages/DesignStudio';

const HomeLayout: React.FC = () => {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0c0e14]">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <Home />
      </div>
      <Modals />
      <Toasts />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeLayout />} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
