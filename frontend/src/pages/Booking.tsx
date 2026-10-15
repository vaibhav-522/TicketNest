import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

interface Show {
  id: string;
  title: string;
  theater: string;
  location: string;
  time: string;
  price: number;
  availableSeats: string[];
  totalSeats: number;
  category: string;
}

const SEATS_PER_ROW = 10;
const MAX_SEATS = 8;

const seatSelectionSchema = z.object({
  seats: z
    .array(z.string())
    .min(1, 'Select at least one seat')
    .max(MAX_SEATS, `You can book at most ${MAX_SEATS} seats`),
});

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const Booking: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [show, setShow] = useState<Show | null>(null);
  const [availableSeats, setAvailableSeats] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShow = async () => {
      try {
        const res = await fetch(`/api/shows/${id}`, { credentials: 'include' });
        if (!res.ok) throw new Error('This show is no longer available');
        const data = await res.json();
        setShow(data.show);
        setAvailableSeats(Array.isArray(data.availableSeats) ? data.availableSeats : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load this show');
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchShow();
    } else {
      setError('No show was specified');
      setLoading(false);
    }
  }, [id]);

  const rowLabels = useMemo(() => {
    const totalSeats = show?.totalSeats ?? 0;
    const rowCount = Math.max(1, Math.ceil(totalSeats / SEATS_PER_ROW));
    return Array.from({ length: rowCount }, (_, index) => String.fromCharCode(65 + index));
  }, [show?.totalSeats]);

  const toggleSeat = (seatId: string) => {
    setSelected((current) => {
      if (current.includes(seatId)) {
        return current.filter((seat) => seat !== seatId);
      }
      if (current.length >= MAX_SEATS) {
        alert(`You can select up to ${MAX_SEATS} seats per booking`);
        return current;
      }
      return [...current, seatId];
    });
  };

  const totalPrice = selected.length * (show?.price ?? 0);

  const proceedToPayment = async () => {
    const parsed = seatSelectionSchema.safeParse({ seats: selected });
    if (!parsed.success) {
      alert(parsed.error.errors[0].message);
      return;
    }

    setSubmitting(true);
    try {
      // If Stripe is configured, create a PaymentIntent first. Otherwise continue without one.
      let paymentId: string | undefined;
      try {
        const intentRes = await fetch('/api/payment/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ amount: totalPrice, currency: 'inr' }),
        });
        if (intentRes.ok) {
          const intent = await intentRes.json();
          paymentId = intent.id;
        }
      } catch {
        // Payments are optional; booking can still be completed.
      }

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ showId: id, seats: selected, paymentId }),
      });

      if (res.status === 401) {
        alert('Please sign in to complete your booking.');
        navigate('/auth/login');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Booking failed');
      }

      alert(`Booking confirmed!\nSeats: ${selected.join(', ')}\nTotal: ${currency.format(totalPrice)}`);
      navigate('/shows');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading show details...</span>
        </div>
      </div>
    );
  }

  if (error || !show) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">{error || 'Show not found'}</div>
        <Link to="/shows" className="btn btn-primary">
          <i className="bi bi-arrow-left me-2" />
          Back to shows
        </Link>
      </div>
    );
  }

  return (
    <div className="booking-page container py-5">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/shows">Shows</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Book Ticket
          </li>
        </ol>
      </nav>

      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h1 className="h4 card-title mb-3">{show.title}</h1>
              <ul className="list-unstyled mb-0">
                <li className="mb-2">
                  <i className="bi bi-building me-2 text-primary" />
                  <strong>Theater:</strong> {show.theater}
                </li>
                <li className="mb-2">
                  <i className="bi bi-geo-alt me-2 text-primary" />
                  <strong>Location:</strong> {show.location}
                </li>
                <li className="mb-2">
                  <i className="bi bi-calendar-event me-2 text-primary" />
                  <strong>Show time:</strong> {new Date(show.time).toLocaleString()}
                </li>
                <li className="mb-2">
                  <i className="bi bi-tag me-2 text-primary" />
                  <strong>Price per seat:</strong> {currency.format(show.price)}
                </li>
                <li>
                  <i className="bi bi-people me-2 text-primary" />
                  <strong>Available seats:</strong> {availableSeats.length} of {show.totalSeats}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card shadow-sm h-100">
            <div className="card-body d-flex flex-column">
              <h2 className="h5 card-title">Your selection</h2>
              {selected.length > 0 ? (
                <>
                  <p className="mb-1 small text-muted">
                    <strong>{selected.length}</strong> seat{selected.length > 1 ? 's' : ''} selected
                  </p>
                  <p className="fw-bold text-primary">{currency.format(totalPrice)}</p>
                  <p className="small mb-3">{selected.join(', ')}</p>
                </>
              ) : (
                <p className="text-muted small mb-3">Select seats on the map to see your total.</p>
              )}
              <button
                type="button"
                className="btn btn-primary w-100 mt-auto"
                onClick={proceedToPayment}
                disabled={selected.length === 0 || submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Processing...
                  </>
                ) : (
                  'Proceed to Payment'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="text-center mb-3">
            <h2 className="h5 mb-1">Choose your seats</h2>
            <p className="text-muted small mb-0">
              You can select up to {MAX_SEATS} seats. Grey seats are already taken.
            </p>
          </div>

          <div className="seat-map">
            {rowLabels.map((row) => (
              <div className="seat-row" key={row}>
                <span className="seat-row-label" style={{ width: 24, fontWeight: 700, alignSelf: 'center' }}>
                  {row}
                </span>
                {Array.from({ length: SEATS_PER_ROW }, (_, index) => `${row}${index + 1}`).map(
                  (seatId) => {
                    const isAvailable = availableSeats.includes(seatId);
                    const isSelected = selected.includes(seatId);
                    const state = isSelected ? 'selected' : isAvailable ? 'available' : 'unavailable';
                    return (
                      <button
                        key={seatId}
                        type="button"
                        className={`seat ${state}`}
                        disabled={!isAvailable || submitting}
                        onClick={() => toggleSeat(seatId)}
                        title={seatId}
                      >
                        {seatId}
                      </button>
                    );
                  }
                )}
              </div>
            ))}
          </div>

          <div className="d-flex justify-content-center flex-wrap gap-4 mt-3 small">
            <span>
              <span className="seat-legend" style={{ background: '#e6e9ee' }} />
              Available
            </span>
            <span>
              <span className="seat-legend" style={{ background: 'var(--ticketnest-accent)' }} />
              Selected
            </span>
            <span>
              <span className="seat-legend" style={{ background: '#aab3bd' }} />
              Taken
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;
