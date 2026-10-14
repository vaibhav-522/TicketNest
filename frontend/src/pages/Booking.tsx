import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';

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

// Schema for seat selection validation
const seatSelectionSchema = z.object({
  seats: z.array(z.string()).min(1, 'Select at least one seat'),
});

const SeatMap: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [seats, setSeats] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [show, setShow] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentIntent, setPaymentIntent] = useState<string | null>(null);

  // Fetch show details from backend
  useEffect(() => {
    const fetchShow = async () => {
      try {
        const res = await fetch(`/api/shows/${id}`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Show not found');
        const data = await res.json();
        setShow(data.show);
        setSeats(data.availableSeats || []);
      } catch (err) {
        console.error('Error fetching show:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchShow();
  }, [id]);

  useEffect(() => {
    if (show && selected.length > 0) {
      // Update price based on selected seats
      const total = selected.length * show?.price || 0;
      // Could update UI state here
    }
  }, [show, selected]);

  const handleSeatClick = (seatId: string) => {
    if (selected.includes(seatId)) {
      setSelected(selected.filter((s) => s !== seatId));
    } else {
      // Max 4 seats per booking for standard, 8 for premium
      const maxSeats = selected.length >= 4 ? 8 : 4;
      if (selected.length >= maxSeats) {
        alert(`Maximum ${maxSeats} seats can be selected at once`);
        return;
      }
      // Check if seat is available
      if (show?.availableSeats.includes(seatId)) {
        setSelected([...selected, seatId]);
      }
    }
  };

  const proceedToPayment = async () => {
    if (selected.length === 0) {
      alert('Please select at least one seat');
      return;
    }

    // Validate with Zod
    const result = seatSelectionSchema.safeParse({ seats: selected });
    if (!result.success) {
      alert(result.error.errors[0].message);
      return;
    }

    try {
      // Create payment intent
      const res = await fetch('/api/payment/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: selected.length * (show?.price || 250),
          currency: 'inr',
        }),
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setPaymentIntent(data.clientSecret);
        // In a real implementation, redirect to Stripe Checkout
        // window.location.href = `/checkout?session_id=${data.id}`;
        alert(`Booking confirmed!\nSeats: ${selected.join(', ')}\nTotal: ₹${selected.length * (show?.price || 250)}`);
        navigate('/');
      } else {
        const errorData = await res.json();
        alert('Booking failed: ' + (errorData.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Booking error:', error);
      alert('An error occurred while booking. Please try again.');
    }
  };

  if (loading) {
    return <div>Loading show details...</div>;
  }

  if (!show) {
    return <div>Show not found</div>;
  }

  return (
    <div className="booking-page py-5">
      <div className="container-fluid">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/shows">Shows</Link></li>
            <li className="breadcrumb-item active" aria-current="page">
              Book Ticket
            </li>
          </ol>
        </div>

        <div className="row mb-4">
          <div className="col-md-8">
            {/* Show Details Card */}
            <div className="card shadow-sm">
              <div className="card-body">
                <h4 className="card-title">Select Your Seats</h4>
                <p className="card-text">
                  <strong>Show:</strong> {show?.title}
                </p>
                <p className="card-text">
                  <strong>Theater:</strong> {show?.theater}
                </p>
                <p className="card-text">
                  <strong>Location:</strong> {show?.location}
                </p>
                <p className="card-text">
                  <strong>Show Time:</strong> {new Date(show?.time).toLocaleString()}
                </p>
                <p className="card-text">
                  <strong>Price per seat:</strong> ₹{show?.price}
                </p>
                <p className="card-text">
                  <strong>Available seats:</strong> {show?.availableSeats.length} of {show?.totalSeats}
                </p>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            {/* Selected Seats Summary Card */}
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="card-title">Summary</h5>
                {selected.length > 0 ? (
                  <>
                    <p className="card-text small">
                      <span className="fw-bold">Seats selected:</span> {selected.length}
                    </p>
                    <p className="card-text small">
                      <span className="fw-bold">Total Price:</span> ₹{
                        selected.length * (show?.price || 250)
                      }
                    </p>
                    <button
                      onClick={proceedToPayment}
                      className="btn btn-primary w-100 mt-3"
                      disabled={!show?.availableSeats || show?.availableSeats.length === 0}
                    >
                      {selected.length > 0 ? 'Proceed to Payment' : 'Select Seats'}
                    </button>
                  </>
                ) : (
                  <p className="card-text small text-muted">
                    Select seats to see summary
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Seat Map Section */}
        {show && !loading && (
          <div className="row justify-content-center">
            <div className="col-12 col-lg-6">
              <div className="text-center mb-4">
                <h5>Seat Map</h5>
                <p className="text-muted small">
                  Click on available seats to select/deselect (Max 4 seats)
                </p>
              </div>
              <div className="seat-container">
                <div className="row seat-row mb-2" style={{ height: '20px' }}>
                  {/* Row numbers */}
                  <span className="col-1 seat-label fw-bold">.</span>
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <span key={num} className="col-1 seat-label">
                      {num}
                    </span>
                  ))}
                </div>
                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map(
                  (row, rowIndex) => (
                    <div
                      key={row}
                      className="row seat-row mb-1"
                      style={{ height: '20px' }}
                    >
                      <span className="col-1 seat-label fw-bold">
                        {row}
                      </span>
                      {[1, 2, 3, 4, 5, 6].map((col) => {
                        const seatId = `${row}${col}`;
                        const isSelected = selected.includes(seatId);
                        const isAvailable = show?.availableSeats.includes(seatId);
                        return (
                          <span
                            key={seatId}
                            className={`col-1 seat ${
                              isSelected ? 'selected' : ''
                            } ${isAvailable ? 'available' : 'unavailable'}`}
                            onClick={isAvailable && handleSeatClick}
                            title={seatId}
                          >
                            {seatId}
                          </span>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeatMap;
