import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const [classrooms, setClassrooms] = useState([]);
  const [role, setRole] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    section: '',
    code: ''
  });

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!user || !token) {
      navigate('/option');
      return;
    }
    setRole(user.role);
    fetchClassrooms();
  }, []);

  

  const fetchClassrooms = async () => {
    try {
      const res = await axios.get('http://localhost:5001/api/classrooms/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClassrooms(res.data.classrooms);
    } catch (err) {
      console.error(err);
    }
  };

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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFormMessage('');
  };

 const handleSubmit = async () => {
  try {
    if (role === 'teacher') {
      await axios.post('http://localhost:5001/api/classrooms/create', {
        name: formData.name,
        subject: formData.subject,
        section: formData.section
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFormMessage('Classroom created successfully!');
    } else {
      await axios.post('http://localhost:5001/api/classrooms/join', {
        code: formData.code
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFormMessage('Joined classroom successfully!');
    }

    // Clear form
    setFormData({ name: '', subject: '', section: '', code: '' });
    
    // Refresh classrooms list
    fetchClassrooms();

    // Auto close popup 
    setTimeout(() => {
      setShowPopup(false);
      setFormMessage('');
    }, 2000);
  } catch (err) {
    setFormMessage(err.response?.data?.msg || 'Operation failed.');
  }
};


  return (
    <>
      {/* Top bar */}
      <header>
        <div className="left-header">
          <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <h1>MetaStudy</h1>
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

      {/* Layout wrapper */}
      <div className="dashboard">
        {/* Sidebar */}
        <aside className={sidebarOpen ? 'open' : ''}>
          <button>Home</button>
          <button>Calendar</button>
          <button>Enrolled</button>
          <button>Settings</button>
        </aside>

        {/* Main content */}
        <main className={sidebarOpen ? 'shifted' : ''}>
          <div className="classroom-grid">
           {classrooms.map(cls => (
  <Link to={`/classroom/${cls._id}`} key={cls._id} className="class-card">
    <h2>{cls.name}</h2>
    <p>{cls.subject} - {cls.section}</p>
    <span>Code: {cls.code}</span>
  </Link>
))}

          </div>

          {/* Floating Button */}
          <button className="floating-btn" onClick={() => setShowPopup(true)}>
            {role === 'teacher' ? 'Create Class' : 'Join Class'}
          </button>

          {/* Popup */}
          {showPopup && (
            <div className="popup-overlay">
              <div className="popup-box">
                <span className="close-icon" onClick={() => setShowPopup(false)}>×</span>
                <h3>{role === 'teacher' ? 'Create Classroom' : 'Join Classroom'}</h3>

                {role === 'teacher' ? (
                  <>
                    <input
                      name="name"
                      type="text"
                      placeholder="Class Name"
                      value={formData.name}
                      onChange={handleChange}
                    />
                    <input
                      name="subject"
                      type="text"
                      placeholder="Subject"
                      value={formData.subject}
                      onChange={handleChange}
                    />
                    <input
                      name="section"
                      type="text"
                      placeholder="Section"
                      value={formData.section}
                      onChange={handleChange}
                    />
                  </>
                ) : (
                  <input
                    name="code"
                    type="text"
                    placeholder="Enter Class Code"
                    value={formData.code}
                    onChange={handleChange}
                  />
                )}

                {formMessage && <p className="form-message">{formMessage}</p>}

                <button className="primary" onClick={handleSubmit}>Submit</button>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default Dashboard;
