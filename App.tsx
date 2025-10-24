import React, { useState } from 'react';
import useAuth from './hooks/useAuth';
import CustomerSupportBot from './components/CustomerSupportBot';
import AuthPage from './components/AuthPage';
import AdminDashboard from './components/AdminPanel'; // Renamed component, file path is the same
import UserProfile from './components/UserProfile';
import { PowerIcon } from './components/icons/PowerIcon';
import { UserCircleIcon } from './components/icons/UserCircleIcon';

const App: React.FC = () => {
  const { user, login, signup, logout, loginWithGoogle, loginWithGitHub, completeLogin, updateUser } = useAuth();
  const [view, setView] = useState<'chat' | 'dashboard'>('chat');
  const [isProfileVisible, setProfileVisible] = useState(false);

  if (!user) {
    return <AuthPage 
      onLogin={login}
      onSignup={signup}
      onSocialLogin={{ google: loginWithGoogle, github: loginWithGitHub }}
      onCompleteLogin={completeLogin}
    />;
  }
  
  const handleViewToggle = (targetView: 'dashboard' | 'profile') => {
    if (targetView === 'dashboard') {
        setView(current => current === 'dashboard' ? 'chat' : 'dashboard');
    } else if (targetView === 'profile') {
        // Close dashboard if profile is opened
        if (!isProfileVisible) setView('chat'); 
        setProfileVisible(current => !current);
    }
  }

  const getButtonText = (buttonType: 'admin' | 'profile') => {
      if (buttonType === 'admin') {
          return view === 'dashboard' ? 'Back to Chat' : 'Admin Dashboard';
      }
      return isProfileVisible ? 'Close Profile' : 'My Profile';
  }

  return (
    <div className="bg-gradient-to-br from-amber-100 via-orange-200 to-yellow-200 min-h-screen font-sans relative">
      <header className="absolute top-4 right-4 flex items-center gap-4 z-30">
        {!user.isSocial && (
            <button
              onClick={() => handleViewToggle('profile')}
              className="w-12 h-12 bg-white/80 text-gray-700 font-semibold rounded-full shadow-md hover:bg-white hover:text-purple-600 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-purple-500"
              aria-label={getButtonText('profile')}
            >
              <UserCircleIcon className="w-7 h-7" />
            </button>
        )}
        {user.isAdmin && (
          <button
            onClick={() => handleViewToggle('dashboard')}
            className="px-4 py-2 bg-white/80 text-purple-700 font-semibold rounded-lg shadow-md hover:bg-white transition-all focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {getButtonText('admin')}
          </button>
        )}
        <button
          onClick={logout}
          className="w-12 h-12 bg-white/80 text-red-500 font-semibold rounded-full shadow-md hover:bg-white hover:text-red-600 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-500"
          aria-label="Logout"
        >
          <PowerIcon className="w-6 h-6" />
        </button>
      </header>

      <main>
        {view === 'chat' && <CustomerSupportBot user={user} />}
        {view === 'dashboard' && user.isAdmin && <AdminDashboard />}
      </main>

      {isProfileVisible && <UserProfile user={user} onUpdateUser={updateUser} />}
    </div>
  );
};

export default App;
