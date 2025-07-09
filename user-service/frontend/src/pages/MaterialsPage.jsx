import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import './MaterialsPage.css';

const MaterialsPage = () => {
  const { id } = useParams();
  const [materials, setMaterials] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [uploadMsg, setUploadMsg] = useState('');
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  const isTeacher = user?.role === 'teacher';

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const res = await axios.get(`http://localhost:5002/api/materials/class/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMaterials(res.data.materials || []);
    } catch (err) {
      console.error('Error fetching materials', err);
    }
  };

  const getSignedUrl = async (materialId, action) => {
    try {
      const res = await axios.get(`http://localhost:5002/api/materials/${materialId}/signed-url`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { action },
      });
      return res.data.url;
    } catch (err) {
      console.error(`Failed to get signed URL for ${action}`, err);
      return null;
    }
  };

  const handleView = async (materialId) => {
    const url = await getSignedUrl(materialId, 'view');
    if (url) window.open(url, '_blank');
  };

  const handleDownload = async (materialId) => {
    const url = await getSignedUrl(materialId, 'download');
    if (url) window.open(url, '_blank');
  };

  const handleUpload = async () => {
    if (!title || !file) {
      setUploadMsg('Please provide both title and file.');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('file', file);
    formData.append('classId', id);

    try {
      setUploading(true);
      await axios.post('http://localhost:5002/api/materials/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setUploadMsg('✅ Uploaded!');
      setTitle('');
      setFile(null);
      fetchMaterials();
      setTimeout(() => {
        setShowPopup(false);
        setUploadMsg('');
      }, 2000);
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadMsg('❌ Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (materialId) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await axios.delete(`http://localhost:5002/api/materials/${materialId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchMaterials();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="materials-page">
      <h2>Materials</h2>
      <div className="materials-list">
        {materials.map((mat) => (
          <div key={mat._id} className="material-card">
            <h4>{mat.title || mat.filename}</h4>
            <div className="actions">
              <button onClick={() => handleView(mat._id)}>👁️ View</button>
              <button onClick={() => handleDownload(mat._id)}>📥 Download</button>
              {isTeacher && (
                <button className="delete-btn" onClick={() => handleDelete(mat._id)}>🗑 Delete</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {isTeacher && (
        <>
          <button className="floating-btn" onClick={() => {
            setShowPopup(true);
            setUploadMsg('');
          }}>
            + Upload Material
          </button>

          {showPopup && (
            <div className="popup-overlay">
              <div className="popup-box">
                <div className="popup-header">
                  <h3>Upload Material</h3>
                  <span className="close-icon" onClick={() => setShowPopup(false)}>×</span>
                </div>
                <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                <input type="file" onChange={(e) => setFile(e.target.files[0])} />
                {uploadMsg && <p className="form-message">{uploadMsg}</p>}
                <button className="primary" onClick={handleUpload} disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Submit'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MaterialsPage;