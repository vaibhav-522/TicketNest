import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { safeReturnPath } from '../utils/navigation';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof formSchema>>();

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setError(null);

    // Run the Zod schema for real: its messages are what the user sees.
    const parsed = formSchema.safeParse(data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setFieldError(issue.path[0] as 'email' | 'password', {
          type: 'zod',
          message: issue.message,
        });
      }
      return;
    }

    try {
      await login(parsed.data.email, parsed.data.password);
      // Back to the seat map / page the user was bounced from.
      navigate(safeReturnPath(location.state), { replace: true });
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
                At least 6 characters.
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
          Don&apos;t have an account?{' '}
          <Link to="/auth/register" state={location.state}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
