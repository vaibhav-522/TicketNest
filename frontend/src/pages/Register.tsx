import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const formSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(20, 'Password must be at most 20 characters'),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof formSchema>>();

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (res.ok) {
        await login(data.email, data.password);
        navigate('/shows');
      } else {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="text-center mb-4">
          <span className="auth-badge" aria-hidden="true">
            <i className="bi bi-person-plus-fill" />
          </span>
          <h1 className="h3 fw-bold mb-1">Create your account</h1>
          <p className="text-muted-2 mb-0">Join TicketNest and book in seconds.</p>
        </div>

        {error && (
          <div className="tn-alert tn-alert-danger mb-3" role="alert">
            <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="mb-3">
            <label htmlFor="name" className="form-label">
              Full name
            </label>
            <div className="input-group">
              <span className="input-group-text" aria-hidden="true">
                <i className="bi bi-person" />
              </span>
              <input
                type="text"
                id="name"
                autoComplete="name"
                className={`form-control${errors.name ? ' is-invalid' : ''}`}
                placeholder="Your name"
                aria-invalid={errors.name ? 'true' : 'false'}
                aria-describedby={errors.name ? 'name-error' : undefined}
                {...register('name', { required: 'Name is required' })}
              />
            </div>
            {errors.name && (
              <p className="field-error mb-0" id="name-error">
                <i className="bi bi-exclamation-circle" aria-hidden="true" />
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Email address
            </label>
            <div className="input-group">
              <span className="input-group-text" aria-hidden="true">
                <i className="bi bi-envelope" />
              </span>
              <input
                type="email"
                id="email"
                autoComplete="email"
                className={`form-control${errors.email ? ' is-invalid' : ''}`}
                placeholder="you@example.com"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
                {...register('email', { required: 'Email is required' })}
              />
            </div>
            {errors.email && (
              <p className="field-error mb-0" id="email-error">
                <i className="bi bi-exclamation-circle" aria-hidden="true" />
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="input-group">
              <span className="input-group-text" aria-hidden="true">
                <i className="bi bi-lock" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="new-password"
                className={`form-control${errors.password ? ' is-invalid' : ''}`}
                placeholder="At least 6 characters"
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : 'password-help'}
                {...register('password', { required: 'Password is required' })}
              />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
              </button>
            </div>
            {errors.password ? (
              <p className="field-error mb-0" id="password-error">
                <i className="bi bi-exclamation-circle" aria-hidden="true" />
                {errors.password.message}
              </p>
            ) : (
              <p className="text-muted-2 small mb-0 mt-1" id="password-help">
                Use 6–20 characters.
              </p>
            )}
          </div>

          <button type="submit" className="btn btn-accent w-100" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Creating account…
              </>
            ) : (
              <>
                <i className="bi bi-person-plus me-2" aria-hidden="true" />
                Create account
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-4 mb-0 small text-muted-2">
          Already have an account? <Link to="/auth/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
