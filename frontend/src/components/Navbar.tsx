import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  // Check auth state on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      if (!res.ok) {
        setIsMenuOpen(false);
      }
    } catch (e) {
      setIsMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      localStorage.removeItem('vanny-show-token');
      navigate('/');
    } catch (error) {
      navigate('/auth/login');
    }
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary fixed-top">
      <div className="container-fluid">
        <Link to="/" className="navbar-brand">
          <span className="fw-bold display-6">TicketNest</span>
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          aria-label="Toggle navigation"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="navbarnav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link to="/" className="nav-link">
                <i className="bi bi-house-door-fill me-2"></i>
                Home
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/shows" className="nav-link">
                <i className="bi bi-cinema-fill me-2"></i>
                Shows
              </Link>
            </li>
          </ul>

          {/* Right side: auth controls */}
          <div className="d-flex align-items-center gap-2">
            {window.location.pathname.startsWith('/auth') ? (
              <>
                <button
                  className="btn btn-outline-light btn-sm"
                  onClick={() => navigate('/auth/register')}
                >
                  Register
                </button>
                <button
                  className="btn btn-light ms-2 btn-sm"
                  onClick={() => navigate('/auth/login')}
                >
                  Login
                </button>
              </>
            ) : (
              <>
                <span className="navbar-text me-3">
                  Welcome, {localStorage.getItem('vanny-user-name') || 'User'}
                </span>
                <button
                  className="btn btn-light btn-sm"
                  onClick={handleLogout}
                >
                  <i className="bi bi-box-arrow-right me-1"></i>
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
