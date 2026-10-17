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

const dateFmt = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: 'numeric',
  minute: '2-digit',
});

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckout {
  keyId: string;
  amount: number;
  currency: string;
  orderId: string;
  seats: string[];
  show?: { title?: string; theater?: string; location?: string };
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (payload: { error?: { description?: string } }) => void) => void;
    };
  }
}

type Notice = { type: 'danger' | 'info'; message: string } | null;

const Booking: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [show, setShow] = useState<Show | null>(null);
  const [availableSeats, setAvailableSeats] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    let active = true;
    const fetchShow = async () => {
      try {
        const res = await fetch(`/api/shows/${id}`, { credentials: 'include' });
        if (!res.ok) throw new Error('This show is no longer available');
        const data = await res.json();
        if (!active) return;
        setShow(data.show);
        setAvailableSeats(Array.isArray(data.availableSeats) ? data.availableSeats : []);
      } catch (err) {
        if (active) {
          setNotice({
            type: 'danger',
            message: err instanceof Error ? err.message : 'Unable to load this show',
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    if (id) {
      void fetchShow();
    } else {
      setNotice({ type: 'danger', message: 'No show was specified' });
      setLoading(false);
    }
    return () => {
      active = false;
    };
  }, [id]);

  const rowLabels = useMemo(() => {
    const totalSeats = show?.totalSeats ?? 0;
    const rowCount = Math.max(1, Math.ceil(totalSeats / SEATS_PER_ROW));
    return Array.from({ length: rowCount }, (_, index) => String.fromCharCode(65 + index));
  }, [show?.totalSeats]);

  const toggleSeat = (seatId: string) => {
    setNotice(null);
    setSelected((current) => {
      if (current.includes(seatId)) {
        return current.filter((seat) => seat !== seatId);
      }
      if (current.length >= MAX_SEATS) {
        setNotice({ type: 'info', message: `You can select up to ${MAX_SEATS} seats per booking.` });
        return current;
      }
      return [...current, seatId];
    });
  };

  const totalPrice = selected.length * (show?.price ?? 0);

  const bookWithoutPayment = async () => {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ showId: id, seats: selected }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Booking failed');
    }
    navigate(`/payment/success?booking_id=${data.booking._id}`, { replace: true });
  };

  const openRazorpayCheckout = (checkout: RazorpayCheckout) =>
    new Promise<void>((resolve, reject) => {
      const RazorpayCtor = window.Razorpay;
      if (!RazorpayCtor) {
        reject(new Error('The payment library could not load. Please refresh and try again.'));
        return;
      }

      const instance = new RazorpayCtor({
        key: checkout.keyId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: 'TicketNest',
        description: `${checkout.show?.title ?? 'Show'} • Seats ${checkout.seats.join(', ')}`,
        order_id: checkout.orderId,
        theme: { color: '#6d4ae0' },
        handler: async (response: RazorpayResponse) => {
          try {
            const res = await fetch('/api/payment/confirm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(response),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              throw new Error(data.message || 'We could not confirm your payment.');
            }
            navigate(`/payment/success?booking_id=${data.booking._id}`, { replace: true });
            resolve();
          } catch (err) {
            reject(err);
          }
        },
        modal: { ondismiss: () => resolve() },
      });

      instance.on('payment.failed', (payload) => {
        reject(new Error(payload?.error?.description || 'Payment failed. Please try again.'));
      });

      instance.open();
    });

  const proceedToPayment = async () => {
    const parsed = seatSelectionSchema.safeParse({ seats: selected });
    if (!parsed.success) {
      setNotice({ type: 'danger', message: parsed.error.errors[0].message });
      return;
    }

    setSubmitting(true);
    setNotice(null);
    try {
      const res = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ showId: id, seats: selected }),
      });

      if (res.status === 401) {
        setNotice({ type: 'info', message: 'Please sign in to complete your booking.' });
        navigate('/auth/login');
        return;
      }

      // 503 = payments disabled (no Razorpay keys). Book without payment (local dev).
      if (res.status === 503) {
        await bookWithoutPayment();
        return;
      }

      const checkout = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(checkout.message || 'Could not start checkout');
      }

      await openRazorpayCheckout(checkout as RazorpayCheckout);
    } catch (err) {
      setNotice({
        type: 'danger',
        message: err instanceof Error ? err.message : 'Booking failed. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5">
        <div className="skeleton mb-4" style={{ height: 22, width: 220 }} />
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="skeleton" style={{ height: 190 }} />
          </div>
          <div className="col-lg-4">
            <div className="skeleton" style={{ height: 190 }} />
          </div>
        </div>
        <div className="skeleton mt-4" style={{ height: 340 }} />
      </div>
    );
  }

  if (!show) {
    return (
      <div className="container py-5">
        <div className="tn-alert tn-alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
          <span>{notice?.message || 'Show not found'}</span>
        </div>
        <Link to="/shows" className="btn btn-primary mt-3">
          <i className="bi bi-arrow-left me-2" aria-hidden="true" />
          Back to shows
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-4 py-lg-5">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item">
            <Link to="/shows">Shows</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Book seats
          </li>
        </ol>
      </nav>

      {notice && (
        <div
          className={`tn-alert ${notice.type === 'danger' ? 'tn-alert-danger' : 'tn-alert-info'} mb-4`}
          role="alert"
        >
          <i
            className={`bi ${
              notice.type === 'danger' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill'
            }`}
            aria-hidden="true"
          />
          <span>{notice.message}</span>
        </div>
      )}

      <div className="row g-4 align-items-start">
        {/* Show details + seat map */}
        <div className="col-lg-8">
          <div className="panel panel-pad mb-4">
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
              <div>
                <span className="eyebrow">{show.category}</span>
                <h1 className="h3 fw-bold mt-2 mb-1">{show.title}</h1>
                <p className="text-muted-2 mb-0">
                  <i className="bi bi-building me-1" aria-hidden="true" />
                  {show.theater} · {show.location}
                </p>
              </div>
              <div className="text-lg-end">
                <div className="price-tag">{currency.format(show.price)}</div>
                <small className="text-muted-2">per seat</small>
              </div>
            </div>

            <hr className="border-secondary my-3" />

            <div className="row g-3 small">
              <div className="col-sm-6">
                <i className="bi bi-calendar-event me-2 text-primary" aria-hidden="true" />
                <strong>Show time:</strong> {dateFmt.format(new Date(show.time))}
              </div>
              <div className="col-sm-6">
                <i className="bi bi-people me-2 text-primary" aria-hidden="true" />
                <strong>Available:</strong> {availableSeats.length} of {show.totalSeats} seats
              </div>
            </div>
          </div>

          <div className="panel panel-pad">
            <div className="text-center mb-2">
              <h2 className="h5 mb-1">Choose your seats</h2>
              <p className="text-muted-2 small mb-0">
                Select up to {MAX_SEATS} seats · <span className="text-muted-2">grey</span> seats are
                already taken
              </p>
            </div>

            <div className="screen-wrap" aria-hidden="true">
              <div className="screen-bar" />
              <span className="screen-label">Screen</span>
            </div>

            <div className="seat-map">
              {rowLabels.map((row) => (
                <div className="seat-row" key={row}>
                  <span className="seat-row-label">{row}</span>
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
                          aria-pressed={isSelected}
                          aria-label={`Seat ${seatId}${isSelected ? ', selected' : isAvailable ? ', available' : ', taken'}`}
                          onClick={() => toggleSeat(seatId)}
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
                <span className="seat-legend legend-available" aria-hidden="true" />
                Available
              </span>
              <span>
                <span className="seat-legend legend-selected" aria-hidden="true" />
                Selected
              </span>
              <span>
                <span className="seat-legend legend-taken" aria-hidden="true" />
                Taken
              </span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="col-lg-4">
          <div className="panel panel-pad summary-panel">
            <h2 className="h5 mb-3">Your selection</h2>

            {selected.length > 0 ? (
              <>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {selected.map((seat) => (
                    <span className="seat-token" key={seat}>
                      {seat}
                    </span>
                  ))}
                </div>

                <div className="summary-row">
                  <span className="text-muted-2">
                    {selected.length} seat{selected.length > 1 ? 's' : ''} ×{' '}
                    {currency.format(show.price)}
                  </span>
                  <span>{currency.format(totalPrice)}</span>
                </div>
                <div className="summary-row">
                  <span className="fw-semibold">Total</span>
                  <span className="summary-total">{currency.format(totalPrice)}</span>
                </div>
              </>
            ) : (
              <p className="text-muted-2 small mb-3">
                Tap seats on the map to see your total here.
              </p>
            )}

            <button
              type="button"
              className="btn btn-accent w-100 mt-3"
              onClick={proceedToPayment}
              disabled={selected.length === 0 || submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" />
                  Processing…
                </>
              ) : (
                <>
                  <i className="bi bi-lock-fill me-2" aria-hidden="true" />
                  Proceed to payment
                </>
              )}
            </button>

            <p className="text-muted-2 small text-center mb-0 mt-3">
              <i className="bi bi-shield-check me-1" aria-hidden="true" />
              Secure checkout · UPI &amp; cards
            </p>
          </div>
        </div>
      </div>

      <div className="visually-hidden" aria-live="polite">
        {selected.length} seats selected
      </div>
    </div>
  );
};

export default Booking;
