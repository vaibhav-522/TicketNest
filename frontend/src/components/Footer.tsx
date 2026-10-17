import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => (
  <footer className="tn-footer">
    <div className="container">
      <div className="row gy-4 align-items-center">
        <div className="col-md-6">
          <div className="d-flex align-items-center gap-2 mb-2">
            <span className="brand-mark" aria-hidden="true">
              <i className="bi bi-ticket-perforated-fill" />
            </span>
            <span className="fw-bold text-white">TicketNest</span>
          </div>
          <p className="mb-0 small">
            Movies, shows and live events — booked in seconds with real-time seats and instant
            e-tickets.
          </p>
        </div>
        <div className="col-md-6">
          <div className="d-flex flex-wrap gap-3 justify-content-md-end small">
            <Link to="/">Home</Link>
            <Link to="/shows">Shows</Link>
            <Link to="/auth/login">Login</Link>
            <Link to="/auth/register">Register</Link>
          </div>
          <p className="mb-0 mt-2 small text-md-end">
            &copy; {new Date().getFullYear()} TicketNest. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
