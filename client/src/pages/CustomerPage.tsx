import { useState, useEffect } from 'react';
import type { User } from '../types/index';
import { LoginScreen } from '../components/customer/LoginScreen';
import { Dashboard } from '../components/customer/Dashboard';

export function CustomerPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    document.title = 'PayFlow — Secured MFS Wallet';
  }, []);

  return (
    <div className="mfs">
      {user ? (
        <Dashboard user={user} onLogout={() => setUser(null)} />
      ) : (
        <LoginScreen onLogin={setUser} />
      )}
    </div>
  );
}
