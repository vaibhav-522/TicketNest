import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="vh-100 bg-gradient-primary bg-img" 
      style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url("/images/hero-bg.jpg") }}>
      <div className="container py-5 h-100">
        <div className="row d-flex align-items-center h-100">
          <div className="col-lg-6 d-flex align-self-center">
            <div className="mx-auto text-center">
              <h1 className="display-4 fw-bold text-white mb-3">
                Watch. Book. Enjoy.
              </h1>
              <p className="lead text-white mb-4">
                Your premier destination for movies, shows, and live events.
              </p>
              <div className="mt-4">
                <Link to="/shows" className="btn btn-light btn-lg me-3">
                  <i className="bi bi-search me-2"></i>
                  Browse Shows
                </Link>
                <Link to="/auth/login" className="btn btn-outline-light btn-lg">
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  Log In
                </Link>
              </div>
            </div>
          </div>

          {/* Floating illustration or abstract shape */}
          <div className="col-lg-6 d-none d-lg-block">
            <div className="absolute-bottom-0 end-0">
              <svg className="w-75 h-75 text-white opacity-25" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
                <path d="M160 32C71.77 32 0 111.77 0 240s71.77 208 160 208 160-71.77 160-208S250.23 32 160 32Zm0-8C61.23 24 0 85.27 0 192s61.23 168 136 168 136-85.27 136-168S202.77 24 160 24ZM160 256A96 96 0 1 0 160 96 96.23 96.23 0 0 0 160 256Zm-16-40c-22.09 0-40-17.91-40-40s17.91-40 40-40 40 17.91 40 40-17.91 40-40 40Z" fill="currentColor" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Features Section */}
    <section className="py-5">
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="display-5 fw-bold mb-3">Why TicketNest?</h2>
          <p className="lead text-muted">
            We've reimagined the ticket booking experience with features designed for
            today's audience.
          </p>
        </div>

        <div className="row g-4">
          {/* Feature 1 */}
          <div className="col-md-4">
            <div className="card h-100 border-primary">
              <div className="card-body d-flex flex-column">
                <div className="card-title text-primary fw-bold small mb-3">
                  <i className="bi bi-shield-check me-2"></i>
                  Secure & Private
                </div>
                <h6 className="card-subtitle mb-2 opacity-75">Your data is protected with bank-grade encryption. We never share your information with third parties.</h6>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="col-md-4">
            <div className="card h-100 border-primary">
              <div className="card-body d-flex flex-column">
                <div className="card-title text-primary fw-bold small mb-3">
                  <i className="bi bi-heart-pulse me-2"></i>
                  Real-time Updates
                </div>
                <h6 className="card-subtitle mb-2 opacity-75">Live seat availability and show updates. Never miss out on your favorite events again.</h6>
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="col-md-4">
            <div className="card h-100 border-primary">
              <div className="card-body d-flex flex-column">
                <div className="card-title text-primary fw-bold small mb-3">
                  <i className="bi bi-speedometer me-2"></i>
                  Fast & Reliable
                </div>
                <h6 className="card-subtitle mb-2 opacity-75">Book in seconds with our optimized platform. Instant confirmations and e-tickets.</h6>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* CTA Section */}
    <section className="bg-secondary py-5">
      <div className="container">
        <div className="row align-items-center">
          <div className="col-lg-6">
            <h2 className="display-4 fw-bold text-white mb-3">
              Start Your TicketNest Journey
            </h2>
            <p className="lead text-white-50 mb-4">
              Join millions of satisfied users who've discovered a better way to book tickets.
            </p>
          </div>
          <div className="col-lg-6">
            <Link to="/auth/register" className="btn btn-light btn-lg px-5">
              <i className="bi bi-person-plus me-2"></i>
              Create Account Free
            </Link>
            <Link to="/auth/login" className="btn btn-outline-light btn-lg px-5 ms-3">
              <i className="bi bi-box-arrow-in-right me-2"></i>
              Already have an account?
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Home;
