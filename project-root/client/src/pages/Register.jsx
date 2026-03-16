import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Register = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    firstname: '',
    lastname: '',
  });
  const [error, setError]     = useState('');
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
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }
    if (form.username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      setLoading(false);
      return;
    }
    
    try {
      const payload = {
        username: form.username,
        email:    form.email,
        password: form.password,
      };
      if (form.firstname) payload.firstname = form.firstname;
      if (form.lastname)  payload.lastname  = form.lastname;

      await axios.post('http://localhost:3000/auth/register', payload);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.logo} className="mono">TUPLE</span>
          <p style={styles.subtitle}>create an account</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>firstname <span style={styles.optional}>(optional)</span></label>
              <input
                name="firstname"
                type="text"
                placeholder="Alice"
                value={form.firstname}
                onChange={handleChange}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>lastname <span style={styles.optional}>(optional)</span></label>
              <input
                name="lastname"
                type="text"
                placeholder="Smith"
                value={form.lastname}
                onChange={handleChange}
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>username</label>
            <input
              name="username"
              type="text"
              placeholder="alice"
              value={form.username}
              onChange={handleChange}
              required
            />
          </div>

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
            {loading ? 'creating...' : 'create_account()'}
          </button>
        </form>

        <p style={styles.footer}>
          already have an account? <Link to="/login">sign in</Link>
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
    maxWidth: '460px',
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
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
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
  optional: {
    color: '#555',
    fontSize: '11px',
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

export default Register;
