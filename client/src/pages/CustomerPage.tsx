import { useState } from 'react';
import type { User } from '../types/index';
import { LoginScreen } from '../components/customer/LoginScreen';
import { Dashboard } from '../components/customer/Dashboard';

export function CustomerPage() {
  const [user, setUser] = useState<User | null>(null);

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}
