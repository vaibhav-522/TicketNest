import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const formSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof formSchema>>();

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setError(null);
    try {
      await login(data.email, data.password);
      navigate('/shows');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="text-center mb-4">
          <span className="auth-badge" aria-hidden="true">
            <i className="bi bi-ticket-perforated-fill" />
          </span>
          <h1 className="h3 fw-bold mb-1">Welcome back</h1>
          <p className="text-muted-2 mb-0">Sign in to book seats and view your tickets.</p>
        </div>

        {error && (
          <div className="tn-alert tn-alert-danger mb-3" role="alert">
            <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
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
                autoComplete="current-password"
                className={`form-control${errors.password ? ' is-invalid' : ''}`}
                placeholder="Your password"
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : undefined}
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
            {errors.password && (
              <p className="field-error mb-0" id="password-error">
                <i className="bi bi-exclamation-circle" aria-hidden="true" />
                {errors.password.message}
              </p>
            )}
          </div>

          <button type="submit" className="btn btn-accent w-100" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Signing in…
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-in-right me-2" aria-hidden="true" />
                Sign in
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-4 mb-0 small text-muted-2">
          Don&apos;t have an account? <Link to="/auth/register">Create one</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
