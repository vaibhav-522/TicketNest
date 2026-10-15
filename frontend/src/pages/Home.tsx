import React from 'react';
import { Link } from 'react-router-dom';

const features = [
  {
    icon: 'bi-shield-check',
    title: 'Secure & Private',
    description:
      'Your data is protected with bank-grade encryption. We never share your information with third parties.',
  },
  {
    icon: 'bi-broadcast',
    title: 'Real-time Updates',
    description:
      'Live seat availability keeps everyone in sync so you never double-book the same seat.',
  },
  {
    icon: 'bi-lightning-charge',
    title: 'Fast & Reliable',
    description:
      'Book in seconds with an optimized platform. Instant confirmations and e-tickets.',
  },
];

const Home: React.FC = () => {
  return (
    <>
      <section className="hero-section text-white">
        <div className="container py-5">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <h1 className="display-4 fw-bold mb-3">Watch. Book. Enjoy.</h1>
              <p className="lead mb-4">
                Your premier destination for movies, shows, and live events.
              </p>
              <div className="d-flex flex-wrap gap-3">
                <Link to="/shows" className="btn btn-light btn-lg">
                  <i className="bi bi-search me-2" />
                  Browse Shows
                </Link>
                <Link to="/auth/register" className="btn btn-outline-light btn-lg">
                  <i className="bi bi-person-plus me-2" />
                  Create Account
                </Link>
              </div>
            </div>
            <div className="col-lg-6 d-none d-lg-flex justify-content-center">
              <i
                className="bi bi-ticket-perforated opacity-25"
                style={{ fontSize: '15rem', lineHeight: 1 }}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-5">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="display-5 fw-bold mb-3">Why TicketNest?</h2>
            <p className="lead text-muted">
              We&apos;ve reimagined the ticket booking experience with features designed for
              today&apos;s audience.
            </p>
          </div>

          <div className="row g-4">
            {features.map((feature) => (
              <div className="col-md-4" key={feature.title}>
                <div className="card feature-card h-100">
                  <div className="card-body d-flex flex-column">
                    <div className="card-title text-primary fw-bold mb-3">
                      <i className={`bi ${feature.icon} me-2`} />
                      {feature.title}
                    </div>
                    <p className="card-text text-muted mb-0">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-dark py-5">
        <div className="container">
          <div className="row align-items-center g-4">
            <div className="col-lg-6">
              <h2 className="display-5 fw-bold text-white mb-3">
                Start Your TicketNest Journey
              </h2>
              <p className="lead text-white-50 mb-0">
                Join thousands of users who&apos;ve discovered a better way to book tickets.
              </p>
            </div>
            <div className="col-lg-6 d-flex flex-wrap gap-3 justify-content-lg-end">
              <Link to="/auth/register" className="btn btn-light btn-lg px-4">
                <i className="bi bi-person-plus me-2" />
                Create Account Free
              </Link>
              <Link to="/shows" className="btn btn-outline-light btn-lg px-4">
                <i className="bi bi-ticket-detailed me-2" />
                See What&apos;s On
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
