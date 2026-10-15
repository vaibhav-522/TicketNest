import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setIsOpen(false);
      navigate('/');
    }
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary fixed-top">
      <div className="container-fluid">
        <Link to="/" className="navbar-brand d-flex align-items-center gap-2">
          <i className="bi bi-ticket-perforated-fill" />
          <span className="fw-bold">TicketNest</span>
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className={`collapse navbar-collapse${isOpen ? ' show' : ''}`}>
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <NavLink to="/" end className="nav-link">
                <i className="bi bi-house-door-fill me-2" />
                Home
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/shows" className="nav-link">
                <i className="bi bi-cinema me-2" />
                Shows
              </NavLink>
            </li>
          </ul>

          <div className="d-flex align-items-center gap-2">
            {isAuthenticated ? (
              <>
                <span className="navbar-text text-white">
                  <i className="bi bi-person-circle me-2" />
                  {user?.name || user?.email}
                </span>
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm"
                  onClick={handleLogout}
                >
                  <i className="bi bi-box-arrow-right me-1" />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/auth/login" className="btn btn-outline-light btn-sm">
                  <i className="bi bi-box-arrow-in-right me-1" />
                  Login
                </Link>
                <Link to="/auth/register" className="btn btn-light btn-sm">
                  <i className="bi bi-person-plus me-1" />
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
