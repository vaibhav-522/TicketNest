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

type Status = 'loading' | 'success' | 'error' | 'unauthenticated';

const PaymentSuccess: React.FC = () => {
  const [params] = useSearchParams();
  const bookingId = params.get('booking_id');
  const [status, setStatus] = useState<Status>('loading');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) {
        setStatus('error');
        setMessage('The booking reference is missing from this link.');
        return;
      }

      try {
        const res = await fetch(`/api/bookings/${bookingId}`, { credentials: 'include' });

        if (res.status === 401) {
          setStatus('unauthenticated');
          return;
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || 'We could not load this booking.');
        }

        setBooking(data.booking);
        setStatus('success');
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Something went wrong.');
      }
    };

    fetchBooking();
  }, [bookingId]);

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body text-center p-5">
              {status === 'loading' && (
                <>
                  <span className="spinner-border text-primary mb-3" role="status" />
                  <h4>Loading your booking…</h4>
                </>
              )}

              {status === 'success' && (
                <>
                  <i className="bi bi-check-circle-fill text-success display-4" />
                  <h3 className="mt-3">Payment successful</h3>
                  <p className="text-muted">Your tickets are booked. See you at the show!</p>
                  {booking && (
                    <ul className="list-group list-group-flush text-start my-3">
                      {booking.show?.title && (
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Show</span>
                          <strong>{booking.show.title}</strong>
                        </li>
                      )}
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Booking reference</span>
                        <strong>{booking._id}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Seats</span>
                        <strong>{booking.seats.join(', ')}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Total paid</span>
                        <strong>{currency.format(booking.totalPrice)}</strong>
                      </li>
                    </ul>
                  )}
                  <Link to="/shows" className="btn btn-primary">
                    Browse more shows
                  </Link>
                </>
              )}

              {status === 'unauthenticated' && (
                <>
                  <i className="bi bi-shield-lock text-warning display-4" />
                  <h3 className="mt-3">Sign in to view your booking</h3>
                  <p className="text-muted">
                    Your session expired. Sign in again to see this booking on your account.
                  </p>
                  <Link to="/auth/login" className="btn btn-primary">
                    Sign in
                  </Link>
                </>
              )}

              {status === 'error' && (
                <>
                  <i className="bi bi-x-circle text-danger display-4" />
                  <h3 className="mt-3">We couldn&apos;t load the booking</h3>
                  <p className="text-muted">{message}</p>
                  <Link to="/shows" className="btn btn-outline-primary">
                    Back to shows
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
