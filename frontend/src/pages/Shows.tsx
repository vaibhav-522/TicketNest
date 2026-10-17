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

const dateFmt = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

const ShowCardSkeleton: React.FC = () => (
  <div className="col-xl-3 col-md-6">
    <div className="card show-card">
      <div className="skeleton skeleton-media" />
      <div className="card-body">
        <div className="skeleton mb-2" style={{ height: 18, width: '80%' }} />
        <div className="skeleton mb-2" style={{ height: 12, width: '60%' }} />
        <div className="skeleton mb-2" style={{ height: 12, width: '70%' }} />
        <div className="skeleton mt-3" style={{ height: 32, width: '100%' }} />
      </div>
    </div>
  </div>
);

const Shows: React.FC = () => {
  const [shows, setShows] = useState<Show[]>([]);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const fetchShows = async () => {
      try {
        const res = await fetch('/api/shows', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch shows');
        const data = await res.json();
        if (!active) return;
        setShows(Array.isArray(data.shows) && data.shows.length > 0 ? data.shows : fallbackShows);
      } catch (err) {
        console.error('Error fetching shows:', err);
        if (active) setShows(fallbackShows);
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchShows();
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(shows.map((show) => show.category).filter(Boolean)))],
    [shows]
  );

  const visibleShows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shows.filter((show) => {
      const matchesCategory = category === 'All' || show.category === category;
      const matchesQuery =
        q.length === 0 ||
        [show.title, show.theater, show.location].some((field) =>
          String(field ?? '').toLowerCase().includes(q)
        );
      return matchesCategory && matchesQuery;
    });
  }, [shows, category, query]);

  const resetFilters = () => {
    setCategory('All');
    setQuery('');
  };

  return (
    <section className="section-tight">
      <div className="container">
        <div className="mb-4">
          <span className="eyebrow">Now showing</span>
          <h1 className="display-6 fw-bold mt-2 mb-2">Pick your next show</h1>
          <p className="text-muted-2 mb-0">Reserve your seats in seconds, pay securely, enjoy.</p>
        </div>

        <div className="panel panel-pad mb-4">
          <div className="row g-3 align-items-center">
            <div className="col-lg-5">
              <label htmlFor="show-search" className="visually-hidden">
                Search shows
              </label>
              <div className="input-group">
                <span className="input-group-text" aria-hidden="true">
                  <i className="bi bi-search" />
                </span>
                <input
                  id="show-search"
                  type="search"
                  className="form-control"
                  placeholder="Search by title, theater or location"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>
            <div className="col-lg-7">
              <div
                className="d-flex flex-wrap gap-2 justify-content-lg-end"
                role="group"
                aria-label="Filter by category"
              >
                {categories.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`btn filter-chip${item === category ? ' is-on' : ''}`}
                    aria-pressed={item === category}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {!loading && (
          <p className="small text-muted-2 mb-3" aria-live="polite">
            {visibleShows.length} {visibleShows.length === 1 ? 'show' : 'shows'} available
          </p>
        )}

        {loading ? (
          <div className="row g-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <ShowCardSkeleton key={index} />
            ))}
          </div>
        ) : visibleShows.length === 0 ? (
          <div className="panel panel-pad text-center py-5">
            <i className="bi bi-search display-5 text-primary" aria-hidden="true" />
            <h2 className="h5 mt-3 mb-2">No shows match your filters</h2>
            <p className="text-muted-2 mb-4">Try a different search or clear the filters.</p>
            <button type="button" className="btn btn-primary" onClick={resetFilters}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="row g-4">
            {visibleShows.map((show) => {
              const soldOut = show.availableSeats === 0;
              const fillingFast = show.availableSeats > 0 && show.availableSeats < 20;
              const pct = show.totalSeats
                ? Math.round((show.availableSeats / show.totalSeats) * 100)
                : 0;

              return (
                <div key={show.id} className="col-xl-3 col-md-6">
                  <article className="card show-card">
                    <div className="show-media">
                      {show.image ? (
                        <img src={show.image} alt={show.title} loading="lazy" />
                      ) : (
                        <div className="show-placeholder">
                          <i className="bi bi-film" aria-hidden="true" />
                        </div>
                      )}
                      <div className="show-badges">
                        <span className="pill pill-genre">{show.category}</span>
                        {show.rating != null && (
                          <span className="pill pill-rating">
                            <i className="bi bi-star-fill" aria-hidden="true" />
                            {show.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                      {fillingFast && (
                        <span className="pill pill-hot position-absolute" style={{ bottom: '0.7rem', left: '0.7rem' }}>
                          <i className="bi bi-fire" aria-hidden="true" />
                          Filling fast
                        </span>
                      )}
                    </div>

                    <div className="card-body d-flex flex-column">
                      <h2 className="h6 mb-2">
                        <Link to={`/booking/${show.id}`} className="show-title text-truncate">
                          {show.title}
                        </Link>
                      </h2>

                      <div className="meta-row">
                        <i className="bi bi-calendar-event" aria-hidden="true" />
                        <span>{dateFmt.format(new Date(show.time))}</span>
                      </div>
                      <div className="meta-row">
                        <i className="bi bi-building" aria-hidden="true" />
                        <span className="text-truncate">{show.theater}</span>
                      </div>
                      <div className="meta-row">
                        <i className="bi bi-geo-alt" aria-hidden="true" />
                        <span className="text-truncate">{show.location}</span>
                      </div>

                      <div className="mt-3">
                        <div className="d-flex justify-content-between small text-muted-2 mb-1">
                          <span>
                            <i className="bi bi-people me-1" aria-hidden="true" />
                            {show.availableSeats} of {show.totalSeats} seats left
                          </span>
                          <span>{pct}%</span>
                        </div>
                        <div className={`seat-meter${fillingFast ? ' is-low' : ''}`}>
                          <span style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      <div className="d-flex justify-content-between align-items-center mt-auto pt-3">
                        <div>
                          <div className="price-tag">{currency.format(show.price)}</div>
                          <small className="text-muted-2">per seat</small>
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(`/booking/${show.id}`)}
                          disabled={soldOut}
                          aria-label={soldOut ? `${show.title} is sold out` : `Book ${show.title}`}
                        >
                          {soldOut ? 'Sold out' : 'Book now'}
                        </button>
                      </div>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default Shows;
