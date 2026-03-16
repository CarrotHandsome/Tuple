import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (!/\S+@\S+\.\S+/.test(form.email)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }
    try {
      const res = await axios.post('http://localhost:3000/auth/login', form);
      login(res.data.user, res.data.token);
      navigate('/groups');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.logo} className="mono">TUPLE</span>
          <p style={styles.subtitle}>sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>email</label>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>password</label>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'signing in...' : 'sign_in()'}
          </button>
        </form>

        <p style={styles.footer}>
          no account? <Link to="/register">register</Link>
        </p>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg)',
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '48px',
    width: '100%',
    maxWidth: '420px',
  },
  header: {
    marginBottom: '36px',
  },
  logo: {
    fontSize: '28px',
    fontWeight: '600',
    color: 'var(--accent)',
    letterSpacing: '0.1em',
  },
  subtitle: {
    color: 'var(--text-dim)',
    fontSize: '13px',
    marginTop: '6px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    color: 'var(--text-dim)',
    fontFamily: 'IBM Plex Mono, monospace',
    letterSpacing: '0.05em',
  },
  btn: {
    background: 'var(--accent)',
    color: '#0f0f0f',
    padding: '12px',
    fontWeight: '600',
    marginTop: '8px',
  },
  footer: {
    marginTop: '24px',
    fontSize: '13px',
    color: 'var(--text-dim)',
    textAlign: 'center',
  },
};

export default Login;
