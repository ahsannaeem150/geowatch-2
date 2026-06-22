import React, { createContext, useContext, useState, useCallback } from 'react';
import SignInModal from '../components/SignInModal/SignInModal.jsx';

const SignInModalContext = createContext(null);

export function useSignInModal() {
  const context = useContext(SignInModalContext);
  if (!context) {
    throw new Error('useSignInModal must be used within SignInModalProvider');
  }
  return context;
}

export function SignInModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const openSignInModal = useCallback(() => setIsOpen(true), []);
  const closeSignInModal = useCallback(() => setIsOpen(false), []);

  return (
    <SignInModalContext.Provider value={{ isOpen, openSignInModal, closeSignInModal }}>
      {children}
      {isOpen && <SignInModal onClose={closeSignInModal} />}
    </SignInModalContext.Provider>
  );
}
