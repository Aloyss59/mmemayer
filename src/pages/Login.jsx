import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../config/firebase';
import { query, collection, where, getDocs } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { getTranslation } from '../config/translations';
import '../styles/Auth.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { userRole, loginUser } = useContext(AuthContext);
  const { language } = useContext(LanguageContext);

  const t = (section, key) => getTranslation(language, section, key);

  const navigateByRole = (targetRole) => {
    if (targetRole === 'admin') navigate('/admin');
    else if (targetRole === 'professor') navigate('/professor');
    else navigate('/student');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      
      // Si c'est un email réel (contient @), essayer Firebase Auth d'abord
      if (username.includes('@')) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, username, password);
          
          const userObj = {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
          };
          
          try {
            const userDoc = await getDocs(query(collection(db, 'users'), where('email', '==', username)));
            if (!userDoc.empty) {
              const role = userDoc.docs[0].data().role || 'admin';
              loginUser(userObj, role);
              navigateByRole(role);
              return;
            }
          } catch (err) {
            loginUser(userObj, 'admin');
            navigateByRole('admin');
            return;
          }
        } catch (firebaseErr) {
          setError(t('login', 'error_wrong_password'));
          setLoading(false);
          return;
        }
      }
      
      // Sinon c'est un username (prenom.nom) - chercher dans Firestore
      let userData = null;
      
      let q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()));
      let snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        userData = snapshot.docs[0].data();
      }
      
      if (!userData) {
        setError(t('login', 'error_account_not_found'));
        setLoading(false);
        return;
      }
      
      // Vérifier le password en clair
      if (userData.password !== password) {
        setError(t('login', 'error_wrong_password'));
        setLoading(false);
        return;
      }
      
      
      const userObj = {
        uid: snapshot.docs[0].id,
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
      };
      
      loginUser(userObj, userData.role);
      navigateByRole(userData.role);
      
    } catch (err) {
      console.error('❌ Login error:', err);
      setError(t('login', 'error_wrong_password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">{t('login', 'username')}</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('login', 'username')}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('login', 'password')}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? t('login', 'loading_button') : t('login', 'login_button')}
          </button>
        </form>

        <p className="auth-info">
          {t('login', 'info_text')}
        </p>
      </div>
    </div>
  );
}

export default Login;
