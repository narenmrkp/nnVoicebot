import React from 'react';
import { User } from '../types';

interface UserProfileProps {
  user: User;
  onUpdateUser: (user: User) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdateUser }) => {

  const handleMfaToggle = () => {
    onUpdateUser({ ...user, mfaEnabled: !user.mfaEnabled });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-20 p-4 animate-fade-in">
        <style>{`
            @keyframes fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .animate-fade-in {
                animation: fade-in 0.3s ease-out;
            }
        `}</style>
      <div className="w-full max-w-lg p-8 space-y-6 bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl">
        <h2 className="text-3xl font-bold text-center text-gray-800">My Profile</h2>
        
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-500">Email</label>
                <p className="mt-1 p-3 w-full bg-gray-100 rounded-md text-gray-700">{user.email}</p>
            </div>

            {user.mobile && user.countryCode && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Mobile Number</label>
                <p className="mt-1 p-3 w-full bg-gray-100 rounded-md text-gray-700">{`${user.countryCode} ${user.mobile}`}</p>
              </div>
            )}
            
            <section>
                <h3 className="text-lg font-semibold text-gray-700 mb-2 border-b pb-2">Security Settings</h3>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                        <p className="font-semibold text-gray-800">Multi-Factor Authentication (MFA)</p>
                        <p className="text-sm text-gray-500">Require a simulated OTP code upon login for extra security.</p>
                    </div>
                    <label htmlFor="mfa-toggle" className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            id="mfa-toggle" 
                            className="sr-only peer" 
                            checked={!!user.mfaEnabled} 
                            onChange={handleMfaToggle}
                        />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-purple-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                </div>
            </section>
        </div>

      </div>
    </div>
  );
};

export default UserProfile;