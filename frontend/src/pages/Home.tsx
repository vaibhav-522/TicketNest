import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface TrendingShow {
  id: string;
  title: string;
  category?: string;
  price: number;
  availableSeats?: number | string[];
  totalSeats?: number;
}

const steps = [
  {
    icon: 'bi-search',
    title: 'Find your show',
    description: 'Browse movies, concerts and live events with filters that get you there in seconds.',
  },
  {
    icon: 'bi-grid-3x3-gap-fill',
    title: 'Pick your seats',
    description: 'A real-time seat map shows exactly what is open — no double booking, ever.',
  },
  {
    icon: 'bi-lightning-charge-fill',
    title: 'Pay & get your ticket',
    description: 'Check out securely with UPI or card and land on an instant e-ticket receipt.',
  },
];

const features = [
  {
    icon: 'bi-shield-lock-fill',
    title: 'Secure by design',
    description: 'Encrypted sessions and signature-verified payments keep every booking safe.',
  },
  {
    icon: 'bi-broadcast-pin',
    title: 'Real-time seats',
    description: 'Live availability stays in sync so the seat you choose is the seat you get.',
  },
  {
    icon: 'bi-ticket-perforated-fill',
    title: 'Instant e-tickets',
    description: 'Confirmations and a clean receipt the moment your payment goes through.',
  },
];

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const Home: React.FC = () => {
  const [trending, setTrending] = useState<TrendingShow[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch('/api/shows', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (active && Array.isArray(data.shows)) {
          setTrending(data.shows.slice(0, 3));
        }
      } catch {
        /* Home stays useful without the trending strip. */
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="hero-section">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <span className="eyebrow mb-3">
                <i className="bi bi-stars" aria-hidden="true" />
                Movies • Shows • Live events
              </span>
              <h1 className="hero-title">
                Watch. Book. <span className="grad">Enjoy.</span>
              </h1>
              <p className="hero-sub lead">
                Your premier destination for movies, shows and live events. Pick your seats in
                real time and get your ticket instantly.
              </p>
              <div className="d-flex flex-wrap gap-3 mt-4">
                <Link to="/shows" className="btn btn-accent btn-lg">
                  <i className="bi bi-search me-2" aria-hidden="true" />
                  Browse shows
                </Link>
                <Link to="/auth/register" className="btn btn-ghost btn-lg">
                  <i className="bi bi-person-plus me-2" aria-hidden="true" />
                  Create account
                </Link>
              </div>

              <div className="hero-stats">
                <div>
                  <div className="stat-num">Instant</div>
                  <div className="stat-label">e-ticket delivery</div>
                </div>
                <div>
                  <div className="stat-num">UPI + Cards</div>
                  <div className="stat-label">secure checkout</div>
                </div>
                <div>
                  <div className="stat-num">Live</div>
                  <div className="stat-label">seat availability</div>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="hero-art" aria-hidden="true">
                <span className="hero-glow" />
                <i className="bi bi-ticket-perforated hero-ticket" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works — 3-step conversion funnel */}
      <section className="section">
        <div className="container">
          <div className="text-center mb-5">
            <span className="eyebrow">How it works</span>
            <h2 className="display-6 fw-bold mt-2 mb-3">Booked in three simple steps</h2>
            <p className="text-muted-2 mb-0 mx-auto" style={{ maxWidth: '40rem' }}>
              From discovery to a confirmed ticket in under a minute.
            </p>
          </div>

          <div className="row g-4">
            {steps.map((step, index) => (
              <div className="col-md-4" key={step.title}>
                <div className="step-card">
                  <span className="step-num">{index + 1}</span>
                  <h3 className="h5 mb-2">
                    <i className={`bi ${step.icon} me-2 text-primary`} aria-hidden="true" />
                    {step.title}
                  </h3>
                  <p className="text-muted-2 mb-0">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending */}
      {trending.length > 0 && (
        <section className="section-tight">
          <div className="container">
            <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
              <div>
                <span className="eyebrow">Trending now</span>
                <h2 className="h3 fw-bold mt-2 mb-0">Freshly added to the nest</h2>
              </div>
              <Link to="/shows" className="btn btn-ghost btn-sm">
                View all
                <i className="bi bi-arrow-right ms-2" aria-hidden="true" />
              </Link>
            </div>

            <div className="row g-4">
              {trending.map((show) => {
                const seatsLeft = Array.isArray(show.availableSeats)
                  ? show.availableSeats.length
                  : show.availableSeats;
                return (
                  <div className="col-md-4" key={show.id}>
                    <Link
                      to={`/booking/${show.id}`}
                      className="panel panel-pad d-block h-100 text-reset"
                    >
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <h3 className="h6 mb-1 show-title">{show.title}</h3>
                        {show.category && <span className="pill pill-genre">{show.category}</span>}
                      </div>
                      <div className="d-flex justify-content-between align-items-center mt-3">
                        <span className="price-tag">{currency.format(show.price)}</span>
                        {typeof seatsLeft === 'number' && (
                          <span className="small text-muted-2">
                            <i className="bi bi-people me-1" aria-hidden="true" />
                            {seatsLeft} left
                          </span>
                        )}
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="section-tight">
        <div className="container">
          <div className="row g-4">
            {features.map((feature) => (
              <div className="col-md-4" key={feature.title}>
                <div className="panel panel-pad h-100">
                  <span className="feature-icon mb-3">
                    <i className={`bi ${feature.icon}`} aria-hidden="true" />
                  </span>
                  <h3 className="h5 mb-2">{feature.title}</h3>
                  <p className="text-muted-2 mb-0">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section">
        <div className="container">
          <div className="panel panel-pad text-center text-lg-start">
            <div className="row align-items-center g-4">
              <div className="col-lg-7">
                <h2 className="display-6 fw-bold mb-2">Start your TicketNest journey</h2>
                <p className="text-muted-2 mb-0">
                  Join thousands of guests who discovered a better way to book tickets.
                </p>
              </div>
              <div className="col-lg-5 d-flex flex-wrap gap-3 justify-content-lg-end">
                <Link to="/auth/register" className="btn btn-accent btn-lg">
                  <i className="bi bi-person-plus me-2" aria-hidden="true" />
                  Create account
                </Link>
                <Link to="/shows" className="btn btn-ghost btn-lg">
                  <i className="bi bi-ticket-detailed me-2" aria-hidden="true" />
                  See what&apos;s on
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
