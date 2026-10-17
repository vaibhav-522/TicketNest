import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { to: '/', label: 'Home', icon: 'bi-house-door-fill', end: true },
  { to: '/shows', label: 'Shows', icon: 'bi-cinema', end: false },
];

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Collapse the mobile menu whenever the route changes.
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setIsOpen(false);
      navigate('/');
    }
  };

  return (
    <nav className="navbar tn-navbar navbar-expand-lg fixed-top" aria-label="Main">
      <div className="container">
        <Link to="/" className="navbar-brand">
          <span className="brand-mark" aria-hidden="true">
            <i className="bi bi-ticket-perforated-fill" />
          </span>
          <span>TicketNest</span>
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={isOpen}
          aria-controls="tn-nav"
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className={`collapse navbar-collapse${isOpen ? ' show' : ''}`} id="tn-nav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-3 gap-lg-1">
            {navItems.map((item) => (
              <li className="nav-item" key={item.to}>
                <NavLink to={item.to} end={item.end} className="nav-link">
                  <i className={`bi ${item.icon} me-2`} aria-hidden="true" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="d-flex flex-column flex-lg-row align-items-stretch align-items-lg-center gap-2">
            {isAuthenticated ? (
              <>
                <span className="tn-user-chip justify-content-center justify-content-lg-start">
                  <i className="bi bi-person-circle" aria-hidden="true" />
                  <span className="u-name">{user?.name || user?.email}</span>
                </span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right me-1" aria-hidden="true" />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/auth/login" className="btn btn-ghost btn-sm">
                  <i className="bi bi-box-arrow-in-right me-1" aria-hidden="true" />
                  Login
                </Link>
                <Link to="/auth/register" className="btn btn-accent btn-sm">
                  <i className="bi bi-person-plus me-1" aria-hidden="true" />
                  Get started
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
