import React, { useState } from 'react';
import { User } from '../types';
import { Logo } from './icons/Logo';
import { GoogleIcon } from './icons/GoogleIcon';
import { GithubIcon } from './icons/GithubIcon';

interface AuthPageProps {
  onLogin: (email: string, password: string) => { status: "SUCCESS" | "ERROR", message: string, user?: User };
  onSignup: (email: string, password: string, isAdmin: boolean, mobile: string, countryCode: string) => { status: "SUCCESS" | "ERROR", message: string, user?: User };
  onSocialLogin: {
    google: () => void;
    github: () => void;
  };
  onCompleteLogin: (user: User) => void;
}


const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onSignup, onSocialLogin, onCompleteLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [userForOtp, setUserForOtp] = useState<User | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (isOtpStep) { // --- Step 2: Handle OTP verification ---
      if (otp.trim().length >= 4 && userForOtp) {
        onCompleteLogin(userForOtp);
      } else {
        setError('Please enter a valid OTP.');
      }
      return;
    }

    // --- Step 1: Handle initial login or signup ---
    if (isLogin) {
      const result = onLogin(email, password);
      if (result.status === "SUCCESS" && result.user) {
        // Credentials are valid. Check if MFA is enabled for this user.
        if (result.user.mfaEnabled) {
            setUserForOtp(result.user);
            setIsOtpStep(true); // MFA is on, so move to OTP step
        } else {
            onCompleteLogin(result.user); // MFA is off, log in directly
        }
      } else {
        setError(result.message);
      }
    } else { // Handle Signup
      if (mobile.length < 10) {
        setError("Please enter a valid 10-digit mobile number.");
        return;
      }
      const result = onSignup(email, password, role === 'admin', mobile, countryCode);
      if (result.status === "SUCCESS") {
        setSuccessMessage('Account created successfully! Please sign in.');
        // Reset fields and switch to login form
        setEmail('');
        setPassword('');
        setMobile('');
        setIsLogin(true);
      } else {
        setError(result.message);
      }
    }
  };

  const handleSocialLogin = (provider: 'google' | 'github') => {
    setError('');
    setSuccessMessage('');
    if (provider === 'google') {
      onSocialLogin.google();
    } else {
      onSocialLogin.github();
    }
  };

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccessMessage('');
    setIsOtpStep(false);
    setEmail('');
    setPassword('');
    setOtp('');
    setUserForOtp(null);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-100 via-orange-200 to-yellow-200 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white/70 backdrop-blur-md rounded-2xl shadow-lg">
        <div className="flex flex-col items-center">
          <Logo className="w-16 h-16" />
          <h2 className="mt-4 text-3xl font-bold text-center text-gray-800">
            Naren Service Centre
          </h2>
          <p className="text-gray-600">
            {isOtpStep ? 'Enter OTP to continue' : isLogin ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>
        
        {isLogin && !isOtpStep && (
             <div className="space-y-4">
                 <button onClick={() => handleSocialLogin('google')} className="w-full flex items-center justify-center gap-3 py-3 text-lg font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                     <GoogleIcon className="w-6 h-6" />
                     Sign in with Google
                 </button>
                 <button onClick={() => handleSocialLogin('github')} className="w-full flex items-center justify-center gap-3 py-3 text-lg font-semibold text-white bg-[#333] border border-gray-600 rounded-lg hover:bg-[#444] transition-colors">
                     <GithubIcon className="w-6 h-6" />
                     Sign in with GitHub
                 </button>
                 <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink mx-4 text-gray-500">OR</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>
             </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          {isOtpStep ? (
            <>
              <p className="text-sm text-center text-gray-700">A simulated OTP has been sent to your registered mobile/email.</p>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter OTP"
                required
                className="w-full px-4 py-3 text-lg border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                autoFocus
              />
            </>
          ) : (
            <>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="w-full px-4 py-3 text-lg border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full px-4 py-3 text-lg border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
              />
              {!isLogin && (
                <>
                  <div className="flex gap-2">
                     <select 
                        value={countryCode} 
                        onChange={e => setCountryCode(e.target.value)}
                        className="px-3 py-3 text-lg bg-gray-100 border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                     >
                        <option>+91</option>
                        <option>+1</option>
                        <option>+44</option>
                        <option>+61</option>
                     </select>
                     <input
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="Mobile for OTP (simulated)"
                        required
                        className="flex-1 w-full px-4 py-3 text-lg border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                      />
                  </div>
                  <fieldset className="p-4 border border-gray-300 rounded-lg">
                    <legend className="px-2 text-sm font-medium text-gray-600">Select Role</legend>
                    <div className="flex items-center justify-around">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="role" value="user" checked={role === 'user'} onChange={() => setRole('user')} className="w-5 h-5 text-purple-600 focus:ring-purple-500" />
                            <span className="text-lg">User</span>
                        </label>
                         <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="role" value="admin" checked={role === 'admin'} onChange={() => setRole('admin')} className="w-5 h-5 text-purple-600 focus:ring-purple-500" />
                             <span className="text-lg">Admin</span>
                        </label>
                    </div>
                  </fieldset>
                </>
              )}
            </>
          )}

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          {successMessage && <p className="text-sm text-green-600 text-center">{successMessage}</p>}

          <button
            type="submit"
            className="w-full py-3 text-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:opacity-90 transition-opacity"
          >
            {isOtpStep ? 'Verify & Login' : isLogin ? 'Continue' : 'Sign Up'}
          </button>
        </form>

        <p className="text-sm text-center text-gray-600">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button onClick={toggleForm} className="ml-2 font-semibold text-purple-600 hover:underline">
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;