import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Shows from './pages/Shows';
import Booking from './pages/Booking';
import PaymentSuccess from './pages/PaymentSuccess';
import Login from './pages/Login';
import Register from './pages/Register';
import { useAuth } from './hooks/useAuth';

const App: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="d-flex vh-100 align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const isAuthRoute = location.pathname.startsWith('/auth');

  if (isAuthenticated && isAuthRoute) {
    return <Navigate to="/shows" replace />;
  }

  return (
    <div className="app-shell d-flex flex-column min-vh-100">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="app-main flex-grow-1" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shows" element={<Shows />} />
          <Route path="/booking/:id" element={<Booking />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default App;
