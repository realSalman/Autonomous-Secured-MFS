import { useState } from 'react';
import { updateUserName } from '../../api/index';
import type { User } from '../../types/index';
import { formatBDT, initials } from './mfsUtils';
import { BackIcon, ShieldIcon } from './icons';

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
      <button type="button" className="mfs-back" onClick={onBack}>
        <BackIcon size={16} /> Home
      </button>

      <div className="profile-card">
        <div className="mfs-profile-head">
          <span className="mfs-avatar mfs-avatar-lg">{initials(user.name)}</span>
          <div>
            <h2 className="profile-title">{user.name || 'PayFlow User'}</h2>
            <div className="mfs-profile-sub"><ShieldIcon size={13} /> Wallet active · Fraud monitoring on</div>
          </div>
        </div>

        <form className="profile-form" onSubmit={handleSave}>
          <div className="field-group">
            <label className="field-label">Wallet number</label>
            <input className="input" type="text" value={user.phone} disabled />
          </div>

          <div className="field-group">
            <label className="field-label">Available balance</label>
            <input className="input" type="text" value={`৳${formatBDT(user.balance)}`} disabled />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="profile-name">Full name</label>
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
