import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Shows from './pages/Shows';
import Booking from './pages/Booking';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import { useAuth } from './hooks/useAuth';

const App: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  // If auth state is still loading, show a spinner or protect routes
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // If user is authenticated and tries to access auth pages, redirect to home
  if (isAuthenticated && window.location.pathname.startsWith('/auth')) {
    return <Navigate to="/" replace />;
  }

  // If user is NOT authenticated and tries to access dashboard, redirect to login
  if (!isAuthenticated && window.location.pathname === '/dashboard') {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <Router>
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary fixed-top">
        <div className="container-fluid">
          <Link to="/" className="navbar-brand">
            <span className="fw-bold">TicketNest</span>
          </Link>
          
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
          >
            <span className="navbar-toggler-icon" />
          </button>
          
          <div className="collapse navbar-collapse" id="navbarnav">
            <ul className="navbar-nav me-auto">
              <li className="nav-item">
                <Link to="/" className="nav-link">
                  <i className="bi bi-house-door me-2"></i>
                  Home
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/shows" className="nav-link">
                  <i className="bi bi-cinema me-2"></i>
                  Browse
                </Link>
              </li>
            </ul>

            {/* Auth controls */}
            {isAuthenticated ? (
              <ul className="navbar-nav">
                <li className="nav-item">
                  <a className="nav-link" href="#">
                    <i className="bi bi-person me-2"></i>
                    {user?.name || 'Profile'}
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    className="nav-link text-danger"
                    onClick={() => {
                      // Handle logout
                      fetch('/api/auth/logout', {
                        method: 'POST',
                        credentials: 'include',
                      }).then(() => {
                        localStorage.removeItem('vanny-user-token');
                        navigate('/');
                      });
                    }}
                  >
                    <i className="bi bi-box-arrow-right me-2"></i>
                    Logout
                  </a>
                </li>
              </ul>
            ) : (
              <>
                <li className="nav-item">
                  <Link to="/auth/login" className="nav-link">
                    <i classClass="bi bi-box-login me-2"></i>
                    Login
                  </Link>
                </li>
                <li className="nav-item">
                  <Link to="/auth/register" className="nav-link text-primary">
                    <i className="bi bi-person-plus me-2"></i>
                    Register
                  </Link>
                </li>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-5">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shows" element={<Shows />} />
          <Route path="/booking/:id" element={<Booking />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={<Register />} />
          <Route path="/dashboard" element={user?.role === 'admin' ? <Dashboard /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </Router>
  );
};

export default App;
