import React from 'react';
import { useSearchParams } from 'react-router-dom';
import BookingReceipt from '../components/BookingReceipt';

/**
 * Post-booking landing page (fresh booking). The receipt itself — including
 * loading, errors and the expired-session state — lives in BookingReceipt so
 * this route and /bookings/:id always render the same ticket.
 */
const PaymentSuccess: React.FC = () => {
  const [params] = useSearchParams();
  return <BookingReceipt bookingId={params.get('booking_id')} mode="fresh" />;
};

export default PaymentSuccess;
