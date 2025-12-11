import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { CanvaProvider } from './context/CanvaContext';

// Layout components
import Navbar from './components/layout/Navbar';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Auth pages
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ChangePassword from './pages/auth/ChangePassword';
import OAuthCallback from './pages/auth/OAuthCallback';

// Main pages
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import CreateProject from './pages/CreateProject';
import Shelf from './pages/Shelf';
import Calendar from './pages/Calendar';
import Stats from './pages/Stats';
import Users from './pages/Users';
import Feedback from './pages/Feedback';
import Product from './pages/Product';
import Settings from './pages/Settings';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/product/:id" element={<Product />} />

        {/* Protected routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <CanvaProvider>
                <Navbar />
                <div className="container-fluid">
                  <div className="row">
                    <main className="col-12 px-md-4 py-3 main-content">
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/projects" element={<Projects />} />
                        <Route path="/project/:id" element={<ProjectDetail />} />
                        <Route path="/create-project" element={<CreateProject />} />
                        <Route path="/shelf" element={<Shelf />} />
                        <Route path="/calendar" element={<Calendar />} />
                        <Route path="/stats" element={<Stats />} />
                        <Route path="/users" element={<Users />} />
                        <Route path="/feedback" element={<Feedback />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </main>
                  </div>
                </div>
              </CanvaProvider>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
