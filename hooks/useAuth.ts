import { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { getUsers, saveUsers } from '../services/dbService';

const SESSION_KEY = 'currentUser';

const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // On initial load, check for a saved session
    try {
      const savedUserJson = localStorage.getItem(SESSION_KEY);
      if (savedUserJson) {
        const savedUser = JSON.parse(savedUserJson);
        // For social logins, user might not be in DB, so we accept any saved user
        if (savedUser.isSocial) {
            setUser(savedUser);
        } else {
             const users = getUsers();
            // Verify the user still exists in our "DB"
            if (users.some(u => u.email === savedUser.email)) {
              setUser(savedUser);
            } else {
              localStorage.removeItem(SESSION_KEY);
            }
        }
      }
    } catch (error) {
      console.error("Failed to parse user from session storage", error);
      localStorage.removeItem(SESSION_KEY);
    }
    // Seed with admin user if no users exist
    if (getUsers().length === 0) {
        saveUsers([{ email: 'admin@example.com', password: 'admin123', isAdmin: true, mfaEnabled: false }]);
    }
  }, []);

  const login = useCallback((email: string, password: string): { status: "SUCCESS" | "ERROR", message: string, user?: User } => {
    const users = getUsers();
    const foundUser = users.find(u => u.email === email && u.password === password);
    if (foundUser) {
      return { status: "SUCCESS", message: "Credentials valid.", user: foundUser };
    }
    return { status: "ERROR", message: "Invalid email or password." };
  }, []);
  
  const completeLogin = useCallback((userToLogin: User) => {
      const { password, ...userToSave } = userToLogin;
      setUser(userToSave);
      localStorage.setItem(SESSION_KEY, JSON.stringify(userToSave));
  }, []);

  const signup = useCallback((email: string, password: string, isAdmin: boolean, mobile: string, countryCode: string): { status: "SUCCESS" | "ERROR", message: string, user?: User } => {
    const users = getUsers();
    if (users.some(u => u.email === email)) {
      return { status: "ERROR", message: "An account with this email already exists." };
    }
    if (users.some(u => u.mobile === mobile && u.countryCode === countryCode)) {
      return { status: "ERROR", message: "An account with this mobile number already exists." };
    }
    const newUser: User = { email, password, isAdmin, mfaEnabled: false, mobile, countryCode };
    const updatedUsers = [...users, newUser];
    saveUsers(updatedUsers);
    
    return { status: "SUCCESS", message: "Account created successfully!", user: newUser };
  }, []);
  
  const updateUser = useCallback((updatedUser: User) => {
      const users = getUsers();
      const userIndex = users.findIndex(u => u.email === updatedUser.email);
      if(userIndex !== -1) {
          users[userIndex] = { ...users[userIndex], ...updatedUser };
          saveUsers(users);
          // Also update the currently logged-in user state if it matches
          if(user?.email === updatedUser.email) {
              const { password, ...userToSave } = users[userIndex];
              setUser(userToSave);
              localStorage.setItem(SESSION_KEY, JSON.stringify(userToSave));
          }
      }
  }, [user]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  }, []);
  
  const socialLogin = (mockUser: User) => {
      const userToSave: User = { ...mockUser, isSocial: true, mfaEnabled: false };
      setUser(userToSave);
      localStorage.setItem(SESSION_KEY, JSON.stringify(userToSave));
  };

  const loginWithGoogle = useCallback(() => {
      socialLogin({ email: 'google.user@example.com', isAdmin: false });
  }, []);

  const loginWithGitHub = useCallback(() => {
      socialLogin({ email: 'github.user@example.com', isAdmin: false });
  }, []);


  return { user, login, logout, signup, loginWithGoogle, loginWithGitHub, completeLogin, updateUser };
};

export default useAuth;