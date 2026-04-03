import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { db } from '../config/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { getTranslation } from '../config/translations';
import LanguageSwitcher from '../components/LanguageSwitcher';
import '../styles/Dashboard.css';

function StudentDashboard() {
  const { user, userRole, loading, logout } = useContext(AuthContext);
  const { language } = useContext(LanguageContext);
  const navigate = useNavigate();
  const [studentInfo, setStudentInfo] = useState(null);
  const [classInfo, setClassInfo] = useState(null);
  const [pointHistory, setPointHistory] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const t = (key) => getTranslation(language, 'student', key);

  useEffect(() => {
    if (loading && userRole === null) return;
    if (userRole !== 'student') {
      navigate('/');
      return;
    }
    fetchStudentData();
  }, [userRole, loading, navigate]);

  const fetchStudentData = async () => {
    if (!user?.uid) {
      setDashboardLoading(false);
      return;
    }
    try {
      const studentDoc = await getDoc(doc(db, 'students', user.uid));
      if (!studentDoc.exists()) {
        setDashboardLoading(false);
        return;
      }

      const studentData = studentDoc.data();
      setStudentInfo({ id: user.uid, ...studentData });

      const classDoc = await getDoc(doc(db, 'classes', studentData.classId));
      if (classDoc.exists()) {
        setClassInfo(classDoc.data());
      }

      // Fetch point history for this class
      try {
        const hq = query(
          collection(db, 'point_history'),
          where('classId', '==', studentData.classId),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
        const histSnapshot = await getDocs(hq);
        setPointHistory(histSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
      } catch (err) {
        console.warn("History fetch issue:", err);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getGridCols = (count) => {
    if (!count) return 3;
    if (count <= 4) return count;
    if (count === 5 || count === 6) return 3;
    if (count === 7 || count === 8) return 4;
    return 4;
  };

  if (loading || dashboardLoading) return <div className="dashboard loading" style={{ textAlign: 'center', padding: '10rem' }}>{t('loading')}</div>;

  if (!studentInfo || !classInfo) {
    return <div className="dashboard-content" style={{ textAlign: 'center', padding: '5rem' }}>{t('no_data')}</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-logo">
          <span className="header-page-title">{getTranslation(language, 'professor', 'home')}</span>
        </div>
        <div className="header-actions">
          <LanguageSwitcher />
          <span className="user-email-text">{studentInfo.firstName} {studentInfo.lastName}</span>
          <button onClick={handleLogout} className="btn-header btn-logout-vintage">{t('logout')}</button>
        </div>
      </header>

      <main className="student-dashboard-main" style={{ padding: '2rem 5%' }}>
        
        {/* LIGNE 1 : LEADERBOARD PLEIN ECRAN */}
        <section style={{ marginBottom: '3rem' }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', marginBottom: '1.5rem', color: 'var(--primary-sepia)', fontSize: '1.4rem' }}>
            {t('leaderboard')}
          </h3>
          <div 
            className="leaderboard-grid"
            style={{ gridTemplateColumns: `repeat(${getGridCols(classInfo.houseNames?.length)}, 1fr)` }}
          >
            {classInfo.houseNames.map((house, idx) => (
              <div key={idx} className={`house-tile-original tile-read-only ${idx === studentInfo.house ? 'tile-my-house' : ''}`}>
                <div className="house-name-box">{house}</div>
                <div className="score-display-box">
                  <p className="score-num" style={{ 
                      color: classInfo.houseColors[idx], 
                      fontFamily: "var(--font-serif)"
                  }}>
                    {classInfo.housePoints?.[idx] || 0}
                  </p>
                  <span className="score-tag">{t('points')}</span>
                </div>
                {idx === studentInfo.house && <div className="my-house-indicator">{getTranslation(language, 'student', 'my_house')}</div>}
              </div>
            ))}
          </div>
        </section>

        {/* LIGNE 2 : INFOS & HISTORIQUE */}
        <div className="dashboard-bottom-grid">
          
          {/* Fiche d'Honneur */}
          <div className="registration-fiche-vintage">
            <div className="fiche-header-academic">
              <span>{t('my_profile')}</span>
            </div>
            <div className="fiche-body-academic" style={{ padding: '2.5rem' }}>
              <div className="fiche-profile-layout">
                <div className="house-emblem-student" style={{ borderColor: classInfo.houseColors[studentInfo.house] }}>
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.8 }}>{getTranslation(language, 'professor', 'house')}</span>
                  <strong style={{ color: classInfo.houseColors[studentInfo.house], fontSize: '1.1rem' }}>
                    {classInfo.houseNames[studentInfo.house]}
                  </strong>
                </div>
                <div className="fiche-profile-text">
                  <h2 className="student-name-cursive">
                    {studentInfo.firstName} {studentInfo.lastName}
                  </h2>
                  <p className="student-class-info">
                    {t('class')} <strong>{classInfo.name}</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Historique Purifié */}
          <section className="academic-registry-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', marginBottom: '1.5rem', borderBottom: '1px solid #EEE', paddingBottom: '0.5rem' }}>
              {getTranslation(language, 'admin', 'statistics')}
            </h3>
            {pointHistory.length === 0 ? (
              <p className="empty-state">{getTranslation(language, 'professor', 'no_students')}</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table-registry" style={{ fontSize: '0.9rem' }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>{getTranslation(language, 'professor', 'house')}</th>
                      <th>Variation</th>
                      <th>Motif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pointHistory.map(hist => (
                      <tr key={hist.id}>
                        <td style={{ opacity: 0.7 }}>
                          {hist.timestamp?.toDate ? new Date(hist.timestamp.toDate()).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'short' }) : '...'}
                        </td>
                        <td>
                          <span style={{ color: classInfo.houseColors[hist.houseIndex], fontWeight: 800 }}>
                            {hist.houseName}
                          </span>
                        </td>
                        <td style={{ color: hist.points > 0 ? 'var(--accent-green)' : 'var(--accent-red-brick)', fontWeight: 'bold' }}>
                          {hist.points > 0 ? "+" + hist.points : hist.points}
                        </td>
                        <td style={{ fontStyle: 'italic' }}>{hist.justification}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}

export default StudentDashboard;
