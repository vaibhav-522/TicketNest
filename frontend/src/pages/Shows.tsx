import React, { useEffect, useState } from 'react';
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

const Shows: React.FC = () => {
  const [shows, setShows] = useState<Show[]>([]);
  const [filter, setFilter] = useState<{ category?: string; search?: string }>({});
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch shows from backend
    const fetchShows = async () => {
      try {
        const res = await fetch('/api/shows', {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to fetch shows');
        const data = await res.json();
        setShows(data.shows || []);
      } catch (err) {
        console.error('Error fetching shows:', err);
        // Fallback data if API fails
        setShows([
          {
            id: '1',
            title: 'Avatar: The Way of Water',
            theater: 'Grand Cinema Premium',
            location: 'Downtown Theater',
            time: 'Today 5:00 PM',
            price: 250,
            category: 'Action',
            availableSeats: 45,
            totalSeats: 100,
            rating: 8.7,
            image: '/images/avatar.jpg',
          },
          {
            id: '2',
            title: 'Pathaan',
            theater: 'INOX Multiplex',
            location: 'City Center',
            time: 'Today 7:30 PM',
            price: 300,
            category: 'Action',
            availableSeats: 32,
            totalSeats: 80,
            rating: 7.5,
            image: '/images/pathaan.jpg',
          },
          {
            id: '3',
            title: 'The Kashmir Files',
            theater: 'PVR Cinemas',
            location: 'MG Road',
            time: 'Tomorrow 4:00 PM',
            price: 200,
            category: 'Drama',
            availableSeats: 60,
            totalSeats: 120,
            rating: 6.8,
            image: '/images/kashmir.jpg',
          },
          {
            id: '4',
            title: 'Top Gun: Maverick',
            theater: 'IMAX Theatre',
            location: 'Airport Center',
            time: 'Tomorrow 6:00 PM',
            price: 350,
            category: 'Action',
            availableSeats: 28,
            totalSeats: 90,
            rating: 8.3,
            image: '/images/topgun.jpg',
          },
        ]);
      }
    };
    fetchShows();
  }, []);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      setFilter({ category: value });
    } else {
      setFilter({});
    }
  };

  return (
    <section className="py-5">
      <div className="container-fluid">
        {/* Filters & Search Section */}
        <div className="mb-4">
          <nav>
            <div className="nav-tabs" id="showsTabs" role="tablist">
              <button
                className="nav-link active"
                data-bs-toggle="tab"
                data-bs-target="#all-shows"
                aria-controls="all-shows"
                role="tab"
              >
                All Shows
              </button>
              <button
                className="nav-link"
                data-bs-toggle="tab"
                data-bs-target="#action-shows"
                aria-controls="action-shows"
                role="tab"
              >
                Action <span className="badge bg-danger">new</span>
              </button>
              <button
                className="nav-link"
                data-bs-toggle="tab"
                data-bs-target="#drama-shows"
                aria-controls="drama-shows"
                role="tab"
              >
                Drama
              </button>
              <button
                className="nav-link"
                data-bs-toggle="tab"
                data-bs-target="#upcoming-shows"
                aria-controls="upcoming-shows"
                role="tab"
              >
                Upcoming
              </button>
            </div>
          </nav>
        </div>

        {/* Shows Grid */}
        <div className="row g-4">
          {shows.map((show) => (
            <div
              key={show.id}
              className="col-xl-3 col-md-6 col-sm-6"
            >
              <div className="card h-100 border-0 shadow-sm overflow-hidden">
                {/* Show Image */}
                <div className="position-relative">
                  {show.image ? (
                    <img
                      src show.image
                      className="card-img-top"
                      alt={show.title}
                      style={{ height: 200, objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      className="card-img-top bg-secondary d-flex align-items-center justify-content-center"
                      style={{ height: 200 }}
                    >
                      <span className="text-white small me-2">🎬</span>
                      <span className="text-uppercase opacity-75">No Image</span>
                    </div>
                  )}
                  {/* Badge if selling fast */}
                  {show.availableSeats < 20 && (
                    <span
                      className="position-absolute top-2 start-2 bg-danger text-white rounded-pill px-3 py-1 small"
                    >
                      Low Stock
                    </span>
                  )}
                </div>

                {/* Show Details */}
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title truncate">
                    <Link to={`/booking/${show.id}`}>{show.title}</Link>
                  </h5>
                  
                  <p className="card-text text-muted small mb-1">
                    <i className="bi bi-calendar me-1"></i>{show.time}
                  </p>
                  <p className="card-text text-muted small mb-1">
                    <i className="bi bi-building me-1"></i>{show.theater}
                  </p>
                  <p className="card-text text-muted small mb-1">
                    <i className="bi bi-geo-alt me-1"></i>{show.location}
                  </p>

                  {/* Rating & Price */}
                  <div className="mt-auto d-flex justify-content-between">
                    {/* Rating */}
                    <div className="d-flex align-items-center small">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <span
                          key={rating}
                          className={`
                            text-warning me-1 
                            ${rating <= (show.rating || 0) ? 'filled' : ''}
                          `}
                        >
                          <i className="bi bi-star-fill"></i>
                        </span>
                      ))}
                      <span className="ms-2 text-muted">
                        {(show.rating || 0).toFixed(1)}
                        ({((show.rating || 0) / 2).toFixed(0)} votes)
                        </span>
                      )
                    </div>
                    {/* Price */}
                    <span className="text-primary fw-bold">
                      ₹{show.price}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => navigate(`/booking/${show.id}`)}
                  className="btn btn-primary w-100 mt-2 text-white small"
                  style={{ height: 'auto', padding: '8px 12px' }}
                >
                  Book Now
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination or Load More would go here */}
      </div>
    </section>
  );
};

export default Shows;
