import React, { createContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // D'abord essayer localStorage (pour profs/élèves qui utilisent Firestore)
    const storedUser = localStorage.getItem('user');
    const storedRole = localStorage.getItem('userRole');
    
    
    if (storedUser && storedRole) {
      setUser(JSON.parse(storedUser));
      setUserRole(storedRole);
      setLoading(false);
      return; // Ne pas vérifier Firebase si on a déjà les infos
    }

    // Sinon, écouter les changements Firebase Auth (pour admin)
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Récupérer le rôle utilisateur depuis Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role);
          }
        } catch (error) {
          console.error('AuthContext: Error fetching user role:', error);
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      // Try to sign out from Firebase Auth (for admin users)
      try {
      } catch (authError) {
        // Prof/student don't have Firebase Auth, so this fails - that's OK
      }
      
      // Always clear context state and localStorage
      setUser(null);
      setUserRole(null);
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
    } catch (error) {
      console.error('❌ Error during logout:', error);
      // Still clear everything even if there was an error
      setUser(null);
      setUserRole(null);
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
    }
  };

  const loginUser = (userObj, role) => {
    localStorage.setItem('user', JSON.stringify(userObj));
    localStorage.setItem('userRole', role);
    setUser(userObj);
    setUserRole(role);
  };

  return (
    <AuthContext.Provider value={{ user, userRole, loading, logout, loginUser }}>
      {children}
    </AuthContext.Provider>
  );
};
