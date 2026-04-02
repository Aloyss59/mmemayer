import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { LanguageProvider, LanguageContext } from './context/LanguageContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import ProfessorDashboard from './pages/ProfessorDashboard';
import StudentDashboard from './pages/StudentDashboard';
import './styles/global.css';
import { useContext } from 'react';
import { getTranslation } from './config/translations';
import { AnimatePresence, motion } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

const PageWrapper = ({ children }) => (
  <motion.div
    initial="initial"
    animate="animate"
    exit="exit"
    variants={pageVariants}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

function ProtectedRoute({ children, requiredRole }) {
  const { user, userRole, loading } = useContext(AuthContext);
  const { language } = useContext(LanguageContext);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        fontSize: '1.2rem'
      }}>
        {getTranslation(language, 'admin', 'loading')}
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(userRole)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

function App() {
  return (
    <LanguageProvider>
      <Router>
        <AuthProvider>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<PageWrapper><Login /></PageWrapper>} />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <PageWrapper><AdminDashboard /></PageWrapper>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/professor" 
                element={
                  <ProtectedRoute requiredRole={['professor', 'admin']}>
                    <PageWrapper><ProfessorDashboard /></PageWrapper>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/student" 
                element={
                  <ProtectedRoute requiredRole="student">
                    <PageWrapper><StudentDashboard /></PageWrapper>
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </AnimatePresence>
        </AuthProvider>
      </Router>
    </LanguageProvider>
  );
}

export default App;
