import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import SplashScreen from './pages/SplashScreen';
import UnifiedRegister from './pages/UnifiedRegister';
import Dashboard from './pages/Dashboard/Dashboard';
import LoginRegisterOption from './pages/LoginRegisterOption';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ClassroomDetail from './pages/ClassroomDetail';
import MaterialsPage from './pages/MaterialsPage';
import DiscussionPage from './pages/DiscussionPage';
import ClassroomMeeting from './pages/ClassroomMeeting';

import AssignmentsPage from './pages/AssignmentsPage'; 



ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<SplashScreen />} />
      <Route path="/register" element={<UnifiedRegister />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/option" element={<LoginRegisterOption />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/classroom/:id" element={<ClassroomDetail />} />
      <Route path="/classroom/:id/materials" element={<MaterialsPage />} />
      <Route path="/classroom/:id/discussion" element={<DiscussionPage />} />
      <Route path="/classroom/:id/meeting" element={<ClassroomMeeting />} />
    
      <Route path="/classroom/:id/assignments" element={<AssignmentsPage />} /> {/* New route */}
    </Routes>
  </BrowserRouter>
);
