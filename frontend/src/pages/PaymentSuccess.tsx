import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

interface Booking {
  _id: string;
  seats: string[];
  totalPrice: number;
  paymentId?: string;
  show?: { title?: string; theater?: string; location?: string; time?: string; price?: number };
}

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

type Status = 'loading' | 'success' | 'error' | 'unauthenticated';

const PaymentSuccess: React.FC = () => {
  const [params] = useSearchParams();
  const bookingId = params.get('booking_id');
  const [status, setStatus] = useState<Status>('loading');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchBooking = async () => {
      if (!bookingId) {
        setStatus('error');
        setMessage('The booking reference is missing from this link.');
        return;
      }

      try {
        const res = await fetch(`/api/bookings/${bookingId}`, { credentials: 'include' });

        if (res.status === 401) {
          if (active) setStatus('unauthenticated');
          return;
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || 'We could not load this booking.');
        }

        if (active) {
          setBooking(data.booking);
          setStatus('success');
        }
      } catch (err) {
        if (active) {
          setStatus('error');
          setMessage(err instanceof Error ? err.message : 'Something went wrong.');
        }
      }
    };

    void fetchBooking();
    return () => {
      active = false;
    };
  }, [bookingId]);

  const copyReference = async () => {
    if (!booking?._id) return;
    try {
      await navigator.clipboard.writeText(booking._id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard may be blocked; the reference is visible anyway. */
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-7 col-xl-6">
          {status === 'loading' && (
            <div className="receipt">
              <div className="receipt-head text-center">
                <span className="spinner-border text-primary" role="status" />
                <h1 className="h4 mt-3 mb-0">Loading your booking…</h1>
              </div>
              <div className="panel-pad">
                <div className="skeleton mb-3" style={{ height: 16, width: '60%' }} />
                <div className="skeleton mb-3" style={{ height: 16, width: '80%' }} />
                <div className="skeleton" style={{ height: 16, width: '45%' }} />
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="receipt">
              <div className="receipt-head text-center">
                <span className="success-ring" aria-hidden="true">
                  <i className="bi bi-check-lg" />
                </span>
                <h1 className="h3 fw-bold mt-3 mb-1">You&apos;re all set!</h1>
                <p className="text-muted-2 mb-0">Your tickets are booked. See you at the show.</p>
              </div>

              {booking && (
                <div className="panel-pad">
                  <div className="receipt-row">
                    <span className="receipt-label">Show</span>
                    <span className="receipt-value">{booking.show?.title ?? '—'}</span>
                  </div>
                  {booking.show?.theater && (
                    <div className="receipt-row">
                      <span className="receipt-label">Venue</span>
                      <span className="receipt-value">
                        {booking.show.theater}
                        {booking.show.location ? ` · ${booking.show.location}` : ''}
                      </span>
                    </div>
                  )}
                  {booking.show?.time && (
                    <div className="receipt-row">
                      <span className="receipt-label">Show time</span>
                      <span className="receipt-value">{dateFmt.format(new Date(booking.show.time))}</span>
                    </div>
                  )}
                  <div className="receipt-row">
                    <span className="receipt-label">Seats</span>
                    <span className="receipt-value">{booking.seats.join(', ')}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="receipt-label">Total paid</span>
                    <span className="receipt-value">{currency.format(booking.totalPrice)}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="receipt-label">Booking reference</span>
                    <span className="receipt-value d-flex align-items-center gap-2 justify-content-end">
                      <span className="mono">{booking._id}</span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm py-0 px-2"
                        onClick={copyReference}
                        aria-label="Copy booking reference"
                      >
                        <i
                          className={`bi ${copied ? 'bi-check2' : 'bi-clipboard'}`}
                          aria-hidden="true"
                        />
                      </button>
                    </span>
                  </div>
                  <span className="visually-hidden" aria-live="polite">
                    {copied ? 'Booking reference copied' : ''}
                  </span>

                  <div className="d-flex flex-wrap gap-3 mt-4">
                    <Link to="/shows" className="btn btn-accent flex-grow-1">
                      <i className="bi bi-ticket-detailed me-2" aria-hidden="true" />
                      Browse more shows
                    </Link>
                    <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
                      <i className="bi bi-printer me-2" aria-hidden="true" />
                      Print
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {status === 'unauthenticated' && (
            <div className="receipt">
              <div className="receipt-head text-center">
                <span className="auth-badge" aria-hidden="true">
                  <i className="bi bi-shield-lock-fill" />
                </span>
                <h1 className="h3 fw-bold mt-3 mb-1">Sign in to view your booking</h1>
                <p className="text-muted-2 mb-0">
                  Your session expired. Sign in again to see this booking on your account.
                </p>
              </div>
              <div className="panel-pad text-center">
                <Link to="/auth/login" className="btn btn-accent">
                  <i className="bi bi-box-arrow-in-right me-2" aria-hidden="true" />
                  Sign in
                </Link>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="receipt">
              <div className="receipt-head text-center">
                <span
                  className="auth-badge"
                  style={{ background: 'rgba(248,113,113,0.15)', color: '#fecaca' }}
                  aria-hidden="true"
                >
                  <i className="bi bi-x-lg" />
                </span>
                <h1 className="h3 fw-bold mt-3 mb-1">We couldn&apos;t load the booking</h1>
                <p className="text-muted-2 mb-0">{message}</p>
              </div>
              <div className="panel-pad text-center">
                <Link to="/shows" className="btn btn-primary">
                  <i className="bi bi-arrow-left me-2" aria-hidden="true" />
                  Back to shows
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
