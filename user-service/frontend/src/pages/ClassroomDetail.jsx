import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Dashboard/Dashboard.css';
import './ClassroomDetail.css';

const ClassroomDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [classroom, setClassroom] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  // Image paths relative to /public
  const folderImages = [
    '/materials.jpeg',
    '/test.png',
    '/assignment.jpeg',
    '/presentation.png',
    '/discussionforum.png',
    '/group.jpeg'
  ];

  useEffect(() => {
    if (!token) {
      navigate('/option');
      return;
    }

    axios
      .get(`http://localhost:5001/api/classrooms/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setClassroom(res.data.classroom))
      .catch(() => navigate('/dashboard'));
  }, [id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/option');
  };

  if (!classroom) return <p>Loading...</p>;

  // Folder navigation mapping
  const folderRoutes = {
    "Materials": "materials",
    "Discussion Forum": "discussion",
    "Test Submissions": "tests",
    "Assignment Materials": "assignments", 
     "Presentation Materials": "presentations",
     "Groups": "group-service", 
    // Add more folders 
  };

  return (
    <>
      <header>
        <div className="left-header">
          <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <h1>{classroom.name}</h1>
        </div>
        <div className="profile" onClick={() => setDropdownOpen(!dropdownOpen)} ref={dropdownRef}>
          {user?.name?.[0]?.toUpperCase()}
          {dropdownOpen && (
            <div className="dropdown">
              <button onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
      </header>

      <div className="dashboard">
        <aside className={sidebarOpen ? 'open' : ''}>
          <button onClick={() => navigate('/dashboard')}>Home</button>
          <button>Calendar</button>
          <button>Enrolled</button>
          <button>Settings</button>
        </aside>

        <main className={sidebarOpen ? 'shifted' : ''}>
          <div className="classroom-grid detail-grid">
            {classroom.folders.map((folder, index) => (
              <div
                key={index}
                className="class-card"
                onClick={() => {
                  const route = folderRoutes[folder.name];
                  if (route) {
                    navigate(`/classroom/${id}/${route}`);
                  }
                }}
                style={{
                  cursor: folderRoutes[folder.name] ? 'pointer' : 'default',
                }}
              >
                <img src={folderImages[index] || '/default-folder.png'} alt={folder.name} className="folder-image" />
                <h3>{folder.name}</h3>
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  );
};

export default ClassroomDetail;
