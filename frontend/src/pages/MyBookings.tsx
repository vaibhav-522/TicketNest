import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams, useLocation } from 'react-router-dom';
import BookingReceipt, { Booking } from '../components/BookingReceipt';
import { useAuth } from '../hooks/useAuth';

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

const BookingsSkeleton: React.FC = () => (
  <>
    {Array.from({ length: 3 }).map((_, index) => (
      <div className="col-12" key={index}>
        <div className="panel panel-pad">
          <div className="skeleton mb-3" style={{ height: 18, width: '45%' }} />
          <div className="skeleton mb-2" style={{ height: 12, width: '70%' }} />
          <div className="skeleton" style={{ height: 12, width: '35%' }} />
        </div>
      </div>
    ))}
  </>
);

/**
 * Every booking the signed-in user owns, newest first. The backend endpoint
 * (`GET /api/bookings/user`) previously had no consumer at all — this is it.
 */
const MyBookings: React.FC = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const location = useLocation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return undefined;
    let active = true;

    const fetchBookings = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/bookings/user', { credentials: 'include' });
        if (res.status === 401) {
          if (active) setError('Your session expired. Sign in again to see your bookings.');
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'We could not load your bookings.');
        if (active) setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'We could not load your bookings.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchBookings();
    return () => {
      active = false;
    };
  }, [authLoading, isAuthenticated, reloadKey]);

  if (authLoading) {
    return (
      <div className="d-flex vh-100 align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Carry the return path so the user lands back here after signing in.
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return (
    <section className="section-tight">
      <div className="container">
        <div className="mb-4">
          <span className="eyebrow">Your tickets</span>
          <h1 className="display-6 fw-bold mt-2 mb-2">My bookings</h1>
          <p className="text-muted-2 mb-0">
            Every reservation on your account, with its receipt one tap away.
          </p>
        </div>

        {error && (
          <div className="tn-alert tn-alert-danger mb-4" role="alert">
            <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="row g-3">
            <BookingsSkeleton />
          </div>
        ) : bookings.length === 0 ? (
          <div className="panel panel-pad text-center py-5">
            <i className="bi bi-journal-x display-5 text-primary" aria-hidden="true" />
            <h2 className="h5 mt-3 mb-2">No bookings yet</h2>
            <p className="text-muted-2 mb-4">
              When you book a show, its ticket and receipt will wait for you here.
            </p>
            <Link to="/shows" className="btn btn-accent">
              <i className="bi bi-search me-2" aria-hidden="true" />
              Browse shows
            </Link>
          </div>
        ) : (
          <ul className="list-unstyled row g-3">
            {bookings.map((booking) => {
              const show = booking.show;
              const confirmed = booking.status !== 'cancelled';
              return (
                <li className="col-12" key={booking._id}>
                  <article className="panel panel-pad">
                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                      <div className="min-w-0">
                        <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                          <h2 className="h6 mb-0">
                            {show?.title ? (
                              <Link to={`/bookings/${booking._id}`} className="show-title">
                                {show.title}
                              </Link>
                            ) : (
                              <span className="text-muted-2">Show no longer listed</span>
                            )}
                          </h2>
                          <span
                            className={`badge rounded-pill ${
                              confirmed ? 'text-bg-success' : 'text-bg-danger'
                            }`}
                          >
                            {confirmed ? 'Confirmed' : booking.status}
                          </span>
                        </div>

                        {show?.time && (
                          <div className="meta-row">
                            <i className="bi bi-calendar-event" aria-hidden="true" />
                            <span>{dateFmt.format(new Date(show.time))}</span>
                          </div>
                        )}
                        {show?.theater && (
                          <div className="meta-row">
                            <i className="bi bi-building" aria-hidden="true" />
                            <span className="text-truncate">
                              {show.theater}
                              {show.location ? ` · ${show.location}` : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="text-lg-end">
                        <div className="price-tag">
                          {currency.format(booking.totalPrice)}
                        </div>
                        <small className="text-muted-2">
                          {booking.paymentId ? 'total paid' : 'total'}
                        </small>
                      </div>
                    </div>

                    <hr className="border-secondary my-3" />

                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                      <div className="d-flex flex-wrap align-items-center gap-2 min-w-0">
                        <span className="visually-hidden">Seats:</span>
                        {booking.seats.map((seat) => (
                          <span className="seat-token" key={seat}>
                            {seat}
                          </span>
                        ))}
                        <span className="mono small text-muted-2 text-truncate d-inline-block">
                          {booking._id}
                        </span>
                      </div>
                      <Link
                        to={`/bookings/${booking._id}`}
                        className="btn btn-primary btn-sm flex-shrink-0"
                        aria-label={`View receipt for ${
                          show?.title ? show.title : 'this booking'
                        }`}
                      >
                        <i className="bi bi-receipt me-2" aria-hidden="true" />
                        View receipt
                      </Link>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}

        {!loading && !error && bookings.length > 0 && (
          <div className="text-center mt-4">
            <Link to="/shows" className="btn btn-ghost">
              <i className="bi bi-plus-circle me-2" aria-hidden="true" />
              Book another show
            </Link>
          </div>
        )}

        {!loading && error && (
          <div className="text-center">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              <i className="bi bi-arrow-clockwise me-2" aria-hidden="true" />
              Try again
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

/** /bookings/:id — a single booking, rendered by the shared receipt view. */
export const BookingDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <BookingReceipt bookingId={id ?? null} mode="history" />;
};

export default MyBookings;
