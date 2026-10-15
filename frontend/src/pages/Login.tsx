import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // Schema validation
  const formSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof formSchema>>();

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      await login(data.email, data.password);
      navigate('/shows');
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred. Please try again.');
    }
  };

  return (
    <div className="auth-page min-vh-100 d-flex align-items-center justify-content-center">
      <div className="container col-xxl-4 col-lg-5">
        <div className="card shadow-lg border-primary">
          <div className="card-body p-5">
            <h3 className="text-center mb-4">Welcome Back</h3>
            
            {/* Error display */}
            {error && (
              <div className="alert alert-danger alert-dismissible fade show mb-3">
                <span>{error}</span>
                <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
              </div>
            )}

            {/* Form display */}
            {errors.email && <p className="text-danger small">{errors.email.message}</p>}
            {errors.password && <p className="text-danger small">{errors.password.message}</p>}

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="mb-3">
                <label htmlFor="email" className="form-label">
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  className="form-control"
                  placeholder="enter email"
                  {...register('email', { required: 'Email required' })}
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  className="form-control"
                  placeholder="enter password"
                  {...register('password', { required: 'Password required' })}
                  required
                />
              </div>
              <button type="submit" className="btn w-100 btn-primary">
                Sign In
              </button>
            </form>

            <p className="text-center mt-3 small">
              Don&apos;t have an account? <Link to="/auth/register">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
