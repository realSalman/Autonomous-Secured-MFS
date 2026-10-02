import { useState } from 'react';
import { updateUserName } from '../../api/index';
import type { User } from '../../types/index';

interface ProfileProps {
  user: User;
  onUpdate: (user: User) => void;
  onBack: () => void;
}

export function Profile({ user, onUpdate, onBack }: ProfileProps) {
  const [name, setName] = useState(user.name);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setSuccess('');
    setError('');

    try {
      const updated = await updateUserName(user.phone, name.trim());
      onUpdate(updated);
      setSuccess('Name updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-section">
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 16 }}>
        ← Back
      </button>

      <div className="profile-card">
        <h2 className="profile-title">Profile</h2>

        <form className="profile-form" onSubmit={handleSave}>
          <div className="field-group">
            <label className="field-label">Phone Number</label>
            <input className="input" type="text" value={user.phone} disabled />
          </div>

          <div className="field-group">
            <label className="field-label">Balance</label>
            <input className="input" type="text" value={`৳${user.balance.toLocaleString()}`} disabled />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="profile-name">Name</label>
            <input
              id="profile-name"
              className="input"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <button
            id="profile-save-btn"
            className="btn btn-primary"
            type="submit"
            disabled={loading || !name.trim() || name.trim() === user.name}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
