import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface Show {
  id: string;
  title: string;
  theater: string;
  location: string;
  time: string;
  price: number;
  category: string;
  availableSeats: number;
  totalSeats: number;
  rating?: number;
  image?: string;
}

const fallbackShows: Show[] = [
  {
    id: '1',
    title: 'Avatar: The Way of Water',
    theater: 'Grand Cinema Premium',
    location: 'Downtown Theater',
    time: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    price: 250,
    category: 'Action',
    availableSeats: 45,
    totalSeats: 60,
    rating: 8.7,
  },
  {
    id: '2',
    title: 'Pathaan',
    theater: 'INOX Multiplex',
    location: 'City Center',
    time: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
    price: 300,
    category: 'Action',
    availableSeats: 32,
    totalSeats: 60,
    rating: 7.5,
  },
  {
    id: '3',
    title: 'The Kashmir Files',
    theater: 'PVR Cinemas',
    location: 'MG Road',
    time: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString(),
    price: 200,
    category: 'Drama',
    availableSeats: 60,
    totalSeats: 60,
    rating: 6.8,
  },
  {
    id: '4',
    title: 'Top Gun: Maverick',
    theater: 'IMAX Theatre',
    location: 'Airport Center',
    time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    price: 350,
    category: 'Action',
    availableSeats: 28,
    totalSeats: 60,
    rating: 8.3,
  },
];

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const Shows: React.FC = () => {
  const [shows, setShows] = useState<Show[]>([]);
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchShows = async () => {
      try {
        const res = await fetch('/api/shows', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch shows');
        const data = await res.json();
        setShows(Array.isArray(data.shows) && data.shows.length > 0 ? data.shows : fallbackShows);
      } catch (err) {
        console.error('Error fetching shows:', err);
        setShows(fallbackShows);
      } finally {
        setLoading(false);
      }
    };
    fetchShows();
  }, []);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(shows.map((show) => show.category).filter(Boolean)))],
    [shows]
  );

  const visibleShows =
    category === 'All' ? shows : shows.filter((show) => show.category === category);

  return (
    <section className="py-5">
      <div className="container">
        <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
          <div>
            <h1 className="h3 fw-bold mb-1">Now Showing</h1>
            <p className="text-muted mb-0">Pick a show and reserve your seats in seconds.</p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={`btn btn-sm ${item === category ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading shows...</span>
            </div>
          </div>
        ) : visibleShows.length === 0 ? (
          <div className="alert alert-info">No shows are available right now. Please check back soon.</div>
        ) : (
          <div className="row g-4">
            {visibleShows.map((show) => (
              <div key={show.id} className="col-xl-3 col-md-6">
                <article className="card show-card shadow-sm">
                  <div className="position-relative">
                    {show.image ? (
                      <img src={show.image} className="card-img-top" alt={show.title} />
                    ) : (
                      <div className="show-placeholder">
                        <i className="bi bi-film" aria-hidden="true" />
                      </div>
                    )}
                    {show.availableSeats < 20 && (
                      <span className="badge bg-danger position-absolute top-0 start-0 m-2">
                        Filling fast
                      </span>
                    )}
                  </div>

                  <div className="card-body d-flex flex-column">
                    <h5 className="card-title text-truncate mb-2">
                      <Link to={`/booking/${show.id}`} className="text-dark">
                        {show.title}
                      </Link>
                    </h5>

                    <p className="card-text text-muted small mb-1">
                      <i className="bi bi-calendar-event me-1" />
                      {new Date(show.time).toLocaleString()}
                    </p>
                    <p className="card-text text-muted small mb-1">
                      <i className="bi bi-building me-1" />
                      {show.theater}
                    </p>
                    <p className="card-text text-muted small mb-1">
                      <i className="bi bi-geo-alt me-1" />
                      {show.location}
                    </p>

                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <span className="small text-muted">
                        <i className="bi bi-people me-1" />
                        {show.availableSeats} left
                      </span>
                      {show.rating != null && (
                        <span className="small">
                          <i className="bi bi-star-fill text-warning me-1" />
                          {show.rating.toFixed(1)}
                        </span>
                      )}
                    </div>

                    <div className="d-flex justify-content-between align-items-center mt-auto pt-3">
                      <span className="fw-bold text-primary">{currency.format(show.price)}</span>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/booking/${show.id}`)}
                        disabled={show.availableSeats === 0}
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Shows;
