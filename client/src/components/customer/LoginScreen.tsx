import { useState } from 'react';
import { login } from '../../api/index';
import type { User } from '../../types/index';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setLoading(true);
    setError('');

    try {
      const user = await login(phone.trim());
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">PayFlow</h1>
        <p className="login-subtitle">Enter your phone number to continue</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <input
            id="login-phone-input"
            className="input input-lg"
            type="text"
            placeholder="01XXXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoFocus
          />

          {error && (
            <div className="alert alert-error">{error}</div>
          )}

          <button
            id="login-submit-btn"
            className="btn btn-primary btn-lg"
            type="submit"
            disabled={loading || !phone.trim()}
            style={{ width: '100%' }}
          >
            {loading ? 'Connecting...' : 'Enter'}
          </button>
        </form>

        <p style={{
          marginTop: 24,
          fontSize: 11,
          color: 'var(--color-text-tertiary)',
          textAlign: 'center',
        }}>
          Demo accounts: 01712345678, 01812345678, 01912345678
        </p>
      </div>
    </div>
  );
}
