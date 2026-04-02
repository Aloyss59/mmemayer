import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { getTranslation } from '../config/translations';
import { generateUsername, generateRandomPassword } from '../utils/authUtils';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { generatePDF } from '../utils/pdfGenerator';
import '../styles/Dashboard.css';

function ProfessorDashboard() {
  const { user, userRole, loading, logout } = useContext(AuthContext);
  const { language } = useContext(LanguageContext);
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  
  const t = (key) => getTranslation(language, 'professor', key);
  
  const [showNewClassForm, setShowNewClassForm] = useState(false);
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [className, setClassName] = useState('');
  const [houseCount, setHouseCount] = useState(4);
  const [houses, setHouses] = useState([
    { name: 'Maison 1', color: '#D4A574' },
    { name: 'Maison 2', color: '#8B6F47' },
    { name: 'Maison 3', color: '#C9AE7C' },
    { name: 'Maison 4', color: '#A68B5B' }
  ]);
  
  const [studentName, setStudentName] = useState('');
  const [studentFirstName, setStudentFirstName] = useState('');
  const [studentHouse, setStudentHouse] = useState(0);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, classId: null });
  const [toast, setToast] = useState(null);
  const [pointModal, setPointModal] = useState({ isOpen: false, houseIndex: null, points: 0, justification: '' });
  
  // Inline customization state
  const [activeInlineCustom, setActiveInlineCustom] = useState(null);
  const [inlinePoints, setInlinePoints] = useState({});
  const [inlineOp, setInlineOp] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (userRole !== 'professor' && userRole !== 'admin') {
      navigate('/');
      return;
    }
    fetchClasses();
  }, [userRole, loading, navigate]);

  const fetchClasses = async () => {
    if (!user?.uid) return;
    try {
      let q;
      if (userRole === 'admin') {
        q = query(collection(db, 'classes'));
      } else {
        q = query(collection(db, 'classes'), where('professorId', '==', user.uid));
      }
      const snapshot = await getDocs(q);
      const classList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClasses(classList);
      if (classList.length > 0) selectClass(classList[0]);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setDashboardLoading(false);
    }
  };

  const selectClass = async (cls) => {
    setSelectedClass(cls);
    const studentsRef = collection(db, 'students');
    const q = query(studentsRef, where('classId', '==', cls.id));
    const snapshot = await getDocs(q);
    setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!className.trim()) return;
    
    // Sécurité Anti-Doublon (Scope Professeur)
    const isDuplicate = classes.some(c => c.name.toLowerCase() === className.toLowerCase() && c.professorId === user.uid);
    if (isDuplicate) {
      setToast({ message: 'Une classe porte déjà ce nom dans votre registre', type: 'error' });
      return;
    }

    try {
      const newClass = {
        name: className,
        professorId: user.uid,
        houseCount,
        houseNames: houses.map(h => h.name),
        houseColors: houses.map(h => h.color),
        housePoints: Array(houseCount).fill(0),
        createdAt: new Date(),
      };
      const docRef = await addDoc(collection(db, 'classes'), newClass);
      const createdClass = { id: docRef.id, ...newClass };
      setClasses([...classes, createdClass]);
      setClassName('');
      setShowNewClassForm(false);
      selectClass(createdClass); // Sélectionner la nouvelle classe immédiatement
      setToast({ message: 'Nouvelle classe scellée !', type: 'success' });
    } catch (err) { setToast({ message: 'Erreur lors de la création', type: 'error' }); }
  };

  const updateHouseCount = (count) => {
    const val = parseInt(count);
    setHouseCount(val);
    const newHouses = [...houses];
    if (val > houses.length) {
      for (let i = houses.length; i < val; i++) {
        newHouses.push({ name: `Maison ${i + 1}`, color: '#D4A574' });
      }
    } else {
      newHouses.splice(val);
    }
    setHouses(newHouses);
  };

  const updateHouseDetail = (index, field, value) => {
    const newHouses = [...houses];
    newHouses[index] = { ...newHouses[index], [field]: value };
    setHouses(newHouses);
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!selectedClass) return;
    try {
      const username = generateUsername(studentFirstName, studentName);
      const password = generateRandomPassword();
      const studentId = doc(collection(db, 'users')).id;

      const studentData = {
        username,
        firstName: studentFirstName,
        lastName: studentName,
        email: `${username}@students.local`,
        password,
        role: 'student',
        classId: selectedClass.id,
        house: parseInt(studentHouse),
        createdAt: new Date(),
      };

      await setDoc(doc(db, 'users', studentId), studentData);
      await setDoc(doc(db, 'students', studentId), studentData);
      
      const newStudent = { id: studentId, firstName: studentFirstName, lastName: studentName, ...studentData };
      setStudents([...students, newStudent]);
      setToast({ message: 'Élève ajouté', type: 'success' });
      setStudentName('');
      setStudentFirstName('');
    } catch (error) {
      setToast({ message: 'Erreur: ' + error.message, type: 'error' });
    }
  };

  const handleDeleteStudent = async (studentId) => {
    try {
      await deleteDoc(doc(db, 'students', studentId));
      await deleteDoc(doc(db, 'users', studentId));
      setStudents(students.filter(s => s.id !== studentId));
      setToast({ message: 'Dossier supprimé', type: 'success' });
    } catch (error) {
      setToast({ message: 'Erreur', type: 'error' });
    }
  };

  const confirmDeleteClass = async () => {
    try {
      const classId = selectedClass.id;
      
      // 1. Supprimer le document de la Classe
      await deleteDoc(doc(db, 'classes', classId));
      
      // 2. Supprimer tous les élèves (dans 'students' ET 'users')
      const studentQuery = query(collection(db, 'students'), where('classId', '==', classId));
      const studentSnapshot = await getDocs(studentQuery);
      
      const studentDeletes = [];
      studentSnapshot.docs.forEach(d => {
        studentDeletes.push(deleteDoc(d.ref)); // Supprimer de 'students'
        studentDeletes.push(deleteDoc(doc(db, 'users', d.id))); // Supprimer de 'users'
      });
      
      // 3. Supprimer l'historique des points
      const historyQuery = query(collection(db, 'point_history'), where('classId', '==', classId));
      const historySnapshot = await getDocs(historyQuery);
      const historyDeletes = historySnapshot.docs.map(d => deleteDoc(d.ref));
      
      // Exécuter toutes les suppressions
      await Promise.all([...studentDeletes, ...historyDeletes]);

      setClasses(classes.filter(c => c.id !== classId));
      setSelectedClass(null);
      setShowDeleteConfirm(false);
      setToast({ message: 'La promotion et tous ses dossiers ont été dissous', type: 'success' });
    } catch (error) {
      console.error("Erreur suppression cascade prof:", error);
      setToast({ message: 'Erreur lors de la dissolution complète', type: 'error' });
    }
  };

  const handleDeleteClass = () => confirmDeleteClass();

  const openPointModal = (houseIndex, points) => {
    setPointModal({ isOpen: true, houseIndex, points, justification: '' });
  };

  const confirmAddPoints = async (e) => {
    if (e) e.preventDefault();
    if (!selectedClass || pointModal.houseIndex === null) return;
    try {
      const { houseIndex, points, justification } = pointModal;
      const newPoints = [...selectedClass.housePoints];
      newPoints[houseIndex] = Math.max(0, (newPoints[houseIndex] || 0) + points);
      
      await updateDoc(doc(db, 'classes', selectedClass.id), { housePoints: newPoints });
      await addDoc(collection(db, 'point_history'), {
        classId: selectedClass.id,
        houseIndex,
        houseName: selectedClass.houseNames[houseIndex],
        points,
        justification: justification || (points > 0 ? "Bonus" : "Sanction"),
        timestamp: new Date(),
        professorId: user.uid
      });
      
      setSelectedClass({ ...selectedClass, housePoints: newPoints });
      setToast({ message: 'Grimoire mis à jour', type: 'success' });
      setPointModal({ isOpen: false, houseIndex: null, points: 0, justification: '' });
    } catch (error) {
      setToast({ message: 'Erreur', type: 'error' });
    }
  };

  const handleInlineConfirm = (idx) => {
    const val = parseInt(inlinePoints[idx] || 0, 10);
    const op = inlineOp[idx] || '+';
    const finalPoints = op === '+' ? val : -val;
    openPointModal(idx, finalPoints);
    setActiveInlineCustom(null);
    setInlinePoints({ ...inlinePoints, [idx]: '' });
  };

  const handleGeneratePDF = () => generatePDF(selectedClass, students);
  const handleLogout = async () => { await logout(); navigate('/'); };

  const getGridCols = (count) => {
    if (!count) return 3;
    if (count <= 4) return count;
    if (count === 5 || count === 6) return 3;
    if (count === 7 || count === 8) return 4;
    return 4;
  };

  if (loading || dashboardLoading) return <div className="loading" style={{ textAlign: 'center', padding: '10rem' }}>Chargement...</div>;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-logo">
          <span className="header-page-title">Page d'accueil</span>
        </div>
        <div className="header-actions">
          <LanguageSwitcher />
          <span className="user-email-text">{user?.firstName ? `${user.firstName} ${user.lastName}` : user?.email}</span>
          <button onClick={handleLogout} className="btn-header btn-logout-vintage">{t('logout')}</button>
        </div>
      </header>

      <main className="dashboard-content">
        <aside className="sidebar-original">
          <div className="academic-card">
            <div className="sidebar-header">
              <h3>Mes Classes</h3>
            </div>
            <div className="flex-column">
              {classes.map(cls => (
                <button
                  key={cls.id}
                  className={`class-btn-original ${selectedClass?.id === cls.id ? 'active' : ''}`}
                  onClick={() => selectClass(cls)}
                >
                  {cls.name}
                </button>
              ))}
              <button onClick={() => setShowNewClassForm(true)} className="btn-new-class">+ Nouvelle Classe</button>
            </div>
          </div>
        </aside>

        <section className="main-view-original">
          {selectedClass ? (
            <>
              <div className="class-title-row">
                <h2>{selectedClass.name}</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button onClick={handleGeneratePDF} className="btn-action-vintage btn-beige">Télécharger PDF Logins</button>
                  <button onClick={() => setShowDeleteConfirm(true)} className="btn-action-vintage btn-red">Supprimer Classe</button>
                </div>
              </div>

              <section>
                <h3 style={{ fontFamily: 'var(--font-serif)', marginBottom: '1.5rem' }}>Leaderboard</h3>
                <div 
                  className="leaderboard-grid"
                  style={{ gridTemplateColumns: `repeat(${getGridCols(selectedClass.houseNames?.length)}, 1fr)` }}
                >
                  {selectedClass.houseNames?.map((house, idx) => (
                    <div key={idx} className="house-tile-original">
                      <div className="house-name-box">{house}</div>
                      <div className="score-display-box">
                        <p className="score-num" style={{ 
                            color: selectedClass.houseColors?.[idx], 
                            fontFamily: "var(--font-serif)"
                        }}>
                          {selectedClass.housePoints?.[idx] || 0}
                        </p>
                        <span className="score-tag">points</span>
                      </div>
                      <div className="house-footer-actions">
                        <div className="point-btns-row">
                          <button onClick={() => openPointModal(idx, 1)} className="point-btn-vintage">+1</button>
                          <button onClick={() => openPointModal(idx, 5)} className="point-btn-vintage">+5</button>
                          <button onClick={() => openPointModal(idx, 10)} className="point-btn-vintage">+10</button>
                        </div>
                        
                        {activeInlineCustom === idx ? (
                          <div className="custom-inline-box">
                            <button
                              className="op-toggle"
                              onClick={() => setInlineOp({ ...inlineOp, [idx]: inlineOp[idx] === '-' ? '+' : '-' })}
                            >
                              {inlineOp[idx] || '+'}
                            </button>
                            <input
                              type="text"
                              className="inline-num-input"
                              value={inlinePoints[idx] || ''}
                              placeholder="0"
                              onChange={(e) => setInlinePoints({ ...inlinePoints, [idx]: e.target.value.replace(/\D/g, '') })}
                              autoFocus
                            />
                            <button onClick={() => handleInlineConfirm(idx)} className="inline-action-btn btn-inline-v">✓</button>
                            <button onClick={() => setActiveInlineCustom(null)} className="inline-action-btn btn-inline-x">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => setActiveInlineCustom(idx)} className="btn-custom-inline">⚙ Personnalisé</button>
                        )}
                        
                        <button onClick={() => openPointModal(idx, -1)} className="btn-minus-one">-1</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)' }}>Élèves ({students.length})</h3>
                  <button
                    onClick={() => setShowAddStudentForm(!showAddStudentForm)}
                    className="btn-action-vintage btn-red"
                    style={{ padding: '0.6rem 1.5rem' }}
                  >
                    {showAddStudentForm ? '✕' : '+'} Ajouter Élève
                  </button>
                </div>

                {showAddStudentForm && (
                  <div className="registration-fiche-vintage">
                    <div className="fiche-header-academic">
                      <span>Nouvelle Inscription</span>
                    </div>
                    <form onSubmit={handleAddStudent} className="fiche-body-academic">
                      <div className="fiche-inputs-row">
                        <div className="input-field-buvard">
                          <label>Prénom</label>
                          <input type="text" placeholder="..." value={studentFirstName} onChange={(e) => setStudentFirstName(e.target.value)} required />
                        </div>
                        <div className="input-field-buvard">
                          <label>Nom</label>
                          <input type="text" placeholder="..." value={studentName} onChange={(e) => setStudentName(e.target.value)} required />
                        </div>
                        <div className="input-field-buvard">
                          <label>Maison</label>
                          <select value={studentHouse} onChange={(e) => setStudentHouse(Number(e.target.value))}>
                            {selectedClass.houseNames?.map((name, i) => (
                              <option key={i} value={i}>{name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="fiche-actions-vintage">
                        <button type="submit" className="btn-confirm-gold">Inscrire l'élève</button>
                        <button type="button" onClick={() => setShowAddStudentForm(false)} className="btn-cancel-neutral">Annuler</button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="academic-registry-card">
                  <div style={{ marginBottom: '1.5rem' }}>
                    <input
                      type="text"
                      placeholder="Rechercher un élève dans le registre..."
                      className="registry-search-bar"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table-registry">
                      <thead>
                        <tr>
                          <th>Identité</th>
                          <th>Identifiant</th>
                          <th>Maison</th>
                          <th className="text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.filter(s => (s.firstName + ' ' + s.lastName).toLowerCase().includes(searchQuery.toLowerCase())).map(student => (
                          <tr key={student.id}>
                            <td><strong>{student.firstName} {student.lastName}</strong></td>
                            <td><code style={{ background: '#f5f5f5', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>{student.username}</code></td>
                            <td>{selectedClass.houseNames[student.house]}</td>
                            <td className="text-right">
                              <button onClick={() => handleDeleteStudent(student.id)} className="btn-action-vintage btn-red" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>Supprimer</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <div className="academic-card" style={{ textAlign: 'center', padding: '5rem' }}>
              Sélectionnez une promotion pour ouvrir le registre.
            </div>
          )}
        </section>
      </main>

      {pointModal.isOpen && (
        <div className="modal-letter-overlay">
          <div className="modal-letter">
            <h2>Justification</h2>
            <p>Maison : <strong>{selectedClass?.houseNames[pointModal.houseIndex]}</strong></p>
            <form onSubmit={confirmAddPoints} className="flex-column">
              <input 
                type="text" 
                placeholder="Motif de la récompense ou sanction..." 
                className="input-paper-buvard" 
                value={pointModal.justification} 
                onChange={(e) => setPointModal({ ...pointModal, justification: e.target.value })} 
                autoFocus 
              />
              <div className="stack-buttons-modal">
                <button type="submit" className="btn-confirm-gold">Confirmer</button>
                <button type="button" onClick={() => setPointModal({ isOpen: false, houseIndex: null, points: 0, justification: '' })} className="btn-cancel-neutral">Fermer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNewClassForm && (
        <div className="modal-letter-overlay">
          <div className="modal-letter modal-config-large">
            <h2>Nouvelle Classe</h2>
            <form onSubmit={handleCreateClass} className="flex-column" style={{ marginTop: '1.5rem' }}>
              <div className="form-section-vintage">
                <label>Nom de la Classe</label>
                <input 
                  type="text" 
                  value={className} 
                  onChange={(e) => setClassName(e.target.value)} 
                  required 
                  placeholder="Ex: 1ère LLCE" 
                  className="input-paper-buvard" 
                />
              </div>

              <div className="form-section-vintage">
                <label>Nombre de Maisons (2-8)</label>
                <select 
                  className="input-paper-buvard"
                  value={houseCount}
                  onChange={(e) => updateHouseCount(e.target.value)}
                >
                  {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} maisons</option>)}
                </select>
              </div>

              <div className="houses-config-scroll-area">
                <label style={{ marginBottom: '1rem', display: 'block' }}>Configuration des Maisons</label>
                <div className="houses-config-grid">
                  {houses.map((house, idx) => (
                    <div key={idx} className="house-config-item">
                      <input 
                        type="text" 
                        value={house.name} 
                        onChange={(e) => updateHouseDetail(idx, 'name', e.target.value)}
                        placeholder={`Nom Maison ${idx + 1}`}
                        className="input-mini-buvard"
                        required
                      />
                      <input 
                        type="color" 
                        value={house.color} 
                        onChange={(e) => updateHouseDetail(idx, 'color', e.target.value)}
                        className="color-picker-buvard"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="stack-buttons-modal" style={{ marginTop: '1rem' }}>
                <button type="submit" className="btn-confirm-gold">Créer la classe</button>
                <button type="button" onClick={() => setShowNewClassForm(false)} className="btn-cancel-neutral">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="modal-letter-overlay">
          <div className="modal-letter modal-delete-warning">
            <h2 className="modal-title-serious">AVERTISSEMENT</h2>
            <p style={{ marginTop: '1rem', fontFamily: 'var(--font-sans)', color: '#666' }}>
              Voulez-vous vraiment supprimer cette classe ?
            </p>
            <div className="stack-buttons-modal" style={{ marginTop: '2rem' }}>
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-cancel-neutral">Conserver</button>
              <button onClick={handleDeleteClass} className="btn-delete-confirmed">Supprimer</button>
            </div>
          </div>
        </div>
      )}


      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

export default ProfessorDashboard;
