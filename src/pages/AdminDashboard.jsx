import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { db, auth } from '../config/firebase';
import { collection, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { getTranslation } from '../config/translations';
import { generateUsername } from '../utils/authUtils';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';
import LanguageSwitcher from '../components/LanguageSwitcher';
import '../styles/Dashboard.css';

function AdminDashboard() {
  const { user, userRole, loading, logout } = useContext(AuthContext);
  const { language } = useContext(LanguageContext);
  const navigate = useNavigate();
  const [professors, setProfessors] = useState([]);
  const [classes, setClasses] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  
  // Navigation & Vues
  const [currentView, setCurrentView] = useState('PROFESSORS'); // 'PROFESSORS' | 'CLASSES'
  const [searchTerm, setSearchTerm] = useState('');

  // Formulaires
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', password: '', passwordConfirm: '' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  
  // Edition MDP
  const [editingPasswordId, setEditingPasswordId] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // Modales
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: '', id: null, title: '', message: '' });
  const [toast, setToast] = useState(null);

  const t = (key) => getTranslation(language, 'admin', key);

  useEffect(() => {
    if (loading) return;
    if (userRole !== 'admin') {
      navigate('/');
      return;
    }
    fetchData();
  }, [userRole, loading, navigate]);

  const fetchData = async () => {
    try {
      const profSnapshot = await getDocs(collection(db, 'users'));
      const professorList = profSnapshot.docs
        .filter(doc => doc.data().role === 'professor')
        .map(doc => ({ id: doc.id, ...doc.data() }));
      setProfessors(professorList);

      const classSnapshot = await getDocs(collection(db, 'classes'));
      const classList = classSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClasses(classList);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleCreateProfessor = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      if (!formData.firstName || !formData.lastName || !formData.password) throw new Error(t('form_fill_all'));
      if (formData.password !== formData.passwordConfirm) throw new Error(t('form_password_mismatch'));
      if (formData.password.length < 6) throw new Error(t('form_password_too_short'));

      let username = generateUsername(formData.firstName, formData.lastName);
      let uniqueUsername = username;
      if (professors.some(p => p.username === username)) uniqueUsername = `${username}${Math.floor(Math.random()*100)}`;

      const profId = doc(collection(db, 'users')).id;
      const profData = {
        username: uniqueUsername,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: `${uniqueUsername}@system.local`,
        password: formData.password,
        role: 'professor',
        createdAt: new Date(),
      };

      await setDoc(doc(db, 'users', profId), profData);
      setProfessors([...professors, { id: profId, ...profData }]);
      setFormData({ firstName: '', lastName: '', password: '', passwordConfirm: '' });
      setShowCreateForm(false);
      setToast({ message: t('success_created'), type: 'success' });
    } catch (error) {
      setFormError(error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setToast({ message: t('form_password_too_short'), type: 'error' });
      return;
    }
    try {
      const userRef = doc(db, 'users', editingPasswordId);
      await setDoc(userRef, { password: newPassword }, { merge: true });
      setProfessors(professors.map(p => p.id === editingPasswordId ? { ...p, password: newPassword } : p));
      setEditingPasswordId(null);
      setNewPassword('');
      setToast({ message: t('success_points_updated'), type: 'success' });
    } catch (error) {
      setToast({ message: t('error'), type: 'error' });
    }
  };

  const confirmDeleteAction = async () => {
    try {
      const { id, type } = confirmModal;

      if (type === 'PROFESSOR') {
        // 1. Supprimer le document utilisateur
        await deleteDoc(doc(db, 'users', id));
        setProfessors(professors.filter(p => p.id !== id));
      } else {
        // 1. Supprimer le document de la Classe
        await deleteDoc(doc(db, 'classes', id));
        
        // 2. Supprimer tous les élèves de cette classe (Suppression en cascade)
        const { query, where, getDocs, collection, deleteDoc: fireDelete } = await import('firebase/firestore');
        
        const studentQuery = query(collection(db, 'students'), where('classId', '==', id));
        const studentSnapshot = await getDocs(studentQuery);
        const studentDeletes = studentSnapshot.docs.map(d => fireDelete(d.ref));
        
        // 3. Supprimer l'historique des points de cette classe
        const historyQuery = query(collection(db, 'point_history'), where('classId', '==', id));
        const historySnapshot = await getDocs(historyQuery);
        const historyDeletes = historySnapshot.docs.map(d => fireDelete(d.ref));
        
        // Exécuter toutes les suppressions en parallèle
        await Promise.all([...studentDeletes, ...historyDeletes]);

        setClasses(classes.filter(c => c.id !== id));
      }
      
      setConfirmModal({ isOpen: false, type: '', id: null });
      setToast({ message: t('success_deleted'), type: 'success' });
    } catch (error) {
      console.error("Erreur suppression cascade:", error);
      setToast({ message: t('error_deleted'), type: 'error' });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Filtrage par recherche
  const filteredProfessors = professors.filter(p => 
    `${p.firstName} ${p.lastName} ${p.username}`.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || dashboardLoading) return <div className="dashboard loading" style={{textAlign: 'center', padding: '10rem'}}>{t('loading')}</div>;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-logo">
          <span className="header-page-title">{getTranslation(language, 'professor', 'home')}</span>
        </div>
        <div className="header-actions">
          <LanguageSwitcher />
          <span className="user-email-text">{user?.firstName ? `${user.firstName} ${user.lastName}` : user?.email}</span>
          <button onClick={handleLogout} className="btn-header btn-logout-vintage">{t('logout')}</button>
        </div>
      </header>

      <main className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        <div className="rectorat-nav-tabs">
          <button 
            className={`tab-btn ${currentView === 'PROFESSORS' ? 'active' : ''}`}
            onClick={() => { setCurrentView('PROFESSORS'); setSearchTerm(''); }}
          >
            {t('professors_title')}
          </button>
          <button 
            className={`tab-btn ${currentView === 'CLASSES' ? 'active' : ''}`}
            onClick={() => { setCurrentView('CLASSES'); setSearchTerm(''); }}
          >
            {getTranslation(language, 'professor', 'my_classes')}
          </button>
        </div>

        {/* Global Stats bar */}
        <div className="rectorat-stats-bar">
          <div className="stat-pill"><strong>{professors.length}</strong> {t('professors_count')}</div>
          <div className="stat-pill"><strong>{classes.length}</strong> {t('classes_count')}</div>
        </div>

        {/* Barre de recherche unifiée */}
        <div className="rectorat-search-container">
          <input 
            type="text" 
            placeholder={currentView === 'PROFESSORS' ? t('no_professors') : getTranslation(language, 'professor', 'class_name')}
            className="registry-search-bar"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {currentView === 'PROFESSORS' ? (
          <section className="academic-registry-card">
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 className="section-title-handwritten">{t('professors_title')}</h2>
              <button onClick={() => setShowCreateForm(true)} className="btn-primary">{t('create_professor')}</button>
            </div>

            <table className="table-registry">
              <thead>
                <tr>
                  <th>{getTranslation(language, 'professor', 'house_label')}</th>
                  <th>{getTranslation(language, 'professor', 'username_label')}</th>
                  <th>{getTranslation(language, 'login', 'password')}</th>
                  <th style={{ textAlign: 'right' }}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfessors.map(prof => (
                  <tr key={prof.id}>
                    <td>
                      <div style={{ fontWeight: '800' }}>{prof.firstName} {prof.lastName}</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{t('created_date')} {new Date(prof.createdAt?.toDate?.() || prof.createdAt).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}</div>
                    </td>
                    <td><code style={{ background: '#EEE', padding: '2px 6px', borderRadius: '4px' }}>{prof.username}</code></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontStyle: 'italic', opacity: 0.7 }}>{editingPasswordId === prof.id ? <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{width:'100px'}} /> : '••••••••'}</span>
                        {editingPasswordId === prof.id ? (
                          <>
                            <button onClick={handleChangePassword} style={{fontSize:'0.7rem', color:'green'}}>V</button>
                            <button onClick={() => setEditingPasswordId(null)} style={{fontSize:'0.7rem', color:'red'}}>X</button>
                          </>
                        ) : (
                          <button 
                            onClick={() => setEditingPasswordId(prof.id)}
                            className="btn-header" 
                            style={{ fontSize: '0.7rem', padding: '4px 8px', background: 'var(--sable-header)' }}
                          >
                            {getTranslation(language, 'professor', 'custom')}
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        onClick={() => setConfirmModal({ 
                          isOpen: true, 
                          type: 'PROFESSOR', 
                          id: prof.id,
                          title: t('delete_professor'),
                          message: t('delete_professor_message')
                        })} 
                        className="btn-inline-x" 
                        style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        {t('delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : (
          <div className="classes-admin-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
            {filteredClasses.map(cls => (
              <div key={cls.id} className="academic-registry-card" style={{ padding: '2rem', position: 'relative' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--primary-sepia)' }}>{cls.name}</h3>
                    <button 
                      onClick={() => setConfirmModal({ 
                        isOpen: true, 
                        type: 'CLASS', 
                        id: cls.id,
                        title: getTranslation(language, 'professor', 'delete_class_confirm'),
                        message: getTranslation(language, 'professor', 'delete_class_message')
                      })} 
                      className="btn-inline-x" 
                      style={{ padding: '5px 10px', background: 'none', color: 'var(--accent-red-brick)', border: '1px solid transparent' }}
                    >
                      {t('delete')}
                    </button>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#888' }}>{cls.houseNames?.length || 0} {getTranslation(language, 'professor', 'houses_label')}</div>
                </div>

                <div className="house-summary-mini" style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  {cls.houseNames?.map((hn, i) => (
                    <div key={i} style={{ 
                      background: cls.houseColors[i], 
                      color: 'white', 
                      padding: '4px 10px', 
                      borderRadius: '20px', 
                      fontSize: '0.75rem',
                      fontWeight: '800',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      {hn}: {cls.housePoints[i]}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => navigate(`/professor?adminClassId=${cls.id}`)} 
                    className="btn-header" 
                    style={{ flex: 1, background: 'var(--sable-header)', fontSize: '0.85rem' }}
                  >
                    {getTranslation(language, 'professor', 'leaderboard')} →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      {/* MODALE : NOMINATION (Création Prof) */}
      {showCreateForm && (
        <div className="modal-letter-overlay" style={{ zIndex: 3000 }}>
          <div className="registration-fiche-vintage" style={{ maxWidth: '500px', width: '95%' }}>
            <div className="fiche-header-academic">
              <span>{t('create_professor')}</span>
            </div>
            <form onSubmit={handleCreateProfessor} className="fiche-body-academic" style={{ padding: '2.5rem' }}>
              <div className="flex-column">
                <div className="input-field-buvard">
                  <label>{t('form_first_name')}</label>
                  <input type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required />
                </div>
                <div className="input-field-buvard">
                  <label>{t('form_last_name')}</label>
                  <input type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} required />
                </div>
                <div className="input-field-buvard">
                  <label>{t('form_password')}</label>
                  <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
                </div>
                <div className="input-field-buvard">
                  <label>{t('form_password_confirm')}</label>
                  <input type="password" value={formData.passwordConfirm} onChange={e => setFormData({...formData, passwordConfirm: e.target.value})} required />
                </div>
              </div>
              {formError && <p style={{ color: 'var(--accent-red-brick)', marginTop: '1rem', fontSize: '0.9rem' }}>{formError}</p>}
              <div className="fiche-actions-vintage" style={{ marginTop: '2.5rem' }}>
                <button type="button" onClick={() => setShowCreateForm(false)} className="btn-cancel-neutral">{t('cancel')}</button>
                <button type="submit" className="btn-confirm-gold" disabled={formLoading}>{t('create_button')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE : CONFIRMATION SUPPRESSION */}
      {confirmModal.isOpen && (
        <div className="modal-letter-overlay" style={{ zIndex: 4000 }}>
          <div className="modal-letter modal-delete-warning">
            <h2 className="modal-title-serious">{confirmModal.title}</h2>
            <p style={{ textAlign: 'center', fontSize: '1.1rem', marginBottom: '2.5rem' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <button 
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} 
                className="btn-cancel-neutral" 
                style={{ flex: 1 }}
              >
                {t('cancel')}
              </button>
              <button 
                onClick={confirmDeleteAction} 
                className="btn-delete-confirmed" 
                style={{ flex: 1 }}
              >
                {t('delete_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default AdminDashboard;
