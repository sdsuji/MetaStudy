import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import "./MaterialsPage.css";

// helper function to detect video file types
const isVideo = (filename) => {
  const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
  return videoExtensions.some((ext) =>
    filename?.toLowerCase().endsWith(ext)
  );
};

const MaterialsPage = () => {
  const { id } = useParams();
  const [materials, setMaterials] = useState([]);
  const [classroomName, setClassroomName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  const [showPopup, setShowPopup] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [uploadType, setUploadType] = useState("file");
  const [uploadMsg, setUploadMsg] = useState("");

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [deleteTarget, setDeleteTarget] = useState(null); 

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));
  const isTeacher = user?.role === "teacher";
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !token) {
      navigate("/option");
      return;
    }
    fetchClassroom();
    fetchMaterials();
  }, []);

  const fetchClassroom = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5002/api/classes/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setClassroomName(res.data.classroom?.name || "Classroom");
    } catch (err) {
      console.error("Error fetching classroom", err);
    }
  };

  const fetchMaterials = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5002/api/materials/class/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMaterials(res.data.materials || []);
    } catch (err) {
      console.error("Error fetching materials", err);
    }
  };

  const getSignedUrl = async (materialId, action) => {
    try {
      const res = await axios.get(
        `http://localhost:5002/api/materials/${materialId}/signed-url`,
        { headers: { Authorization: `Bearer ${token}` }, params: { action } }
      );
      return res.data.url;
    } catch (err) {
      console.error(`Failed to get signed URL for ${action}`, err);
      return null;
    }
  };

  const handleView = async (materialId) => {
    const url = await getSignedUrl(materialId, "view");
    if (url) window.open(url, "_blank");
  };

  const handleDownload = async (materialId) => {
    const url = await getSignedUrl(materialId, "download");
    if (url) window.open(url, "_blank");
  };

  const confirmDelete = (material) => {
    setDeleteTarget(material);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`http://localhost:5002/api/materials/${deleteTarget._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchMaterials();
      setDeleteTarget(null); // close popup
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleUpload = async () => {
    if (!title) {
      setUploadMsg("Please provide a title.");
      return;
    }

    try {
      setUploading(true);

      if (uploadType === "file") {
        if (!file) {
          setUploadMsg("Please select a file.");
          return;
        }
        const formData = new FormData();
        formData.append("title", title);
        formData.append("file", file);
        formData.append("classId", id);

        await axios.post("http://localhost:5002/api/materials/upload", formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
      } else {
        if (!linkUrl) {
          setUploadMsg("Please enter a link.");
          return;
        }
        await axios.post(
          "http://localhost:5002/api/materials/link",
          { title, url: linkUrl, classId: id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      setUploadMsg("✅ Uploaded successfully!");
      setTitle("");
      setFile(null);
      setLinkUrl("");
      fetchMaterials();

      setTimeout(() => {
        setShowPopup(false);
        setUploadMsg("");
      }, 2000);
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadMsg("❌ Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // Filter + Search logic
  const filteredMaterials = materials.filter((mat) => {
    const matchesSearch =
      mat.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mat.originalName?.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesFilter = false;

    if (filterType === "all") {
      matchesFilter = true;
    } else if (filterType === "link") {
      matchesFilter = mat.isLink === true;
    } else if (filterType === "image") {
      const imageExts = ["jpg", "jpeg", "png", "gif", "bmp", "svg"];
      const ext = mat.originalName?.split(".").pop().toLowerCase();
      matchesFilter = imageExts.includes(ext);
    } else {
      const extension = mat.originalName?.split(".").pop().toLowerCase();
      matchesFilter = extension === filterType.toLowerCase();
    }

    return matchesSearch && matchesFilter;
  });

  // Get icon by file extension
  const getFileIcon = (filename, isLink) => {
    if (isLink) return "🔗";
    if (!filename) return "📄";
    const ext = filename.split(".").pop().toLowerCase();
    switch (ext) {
      case "pdf": return "📕";
      case "doc":
      case "docx": return "📘";
      case "ppt":
      case "pptx": return "📙";
      case "xls":
      case "xlsx": return "📗";
      case "jpg":
      case "jpeg":
      case "png":
      case "gif": return "🖼️";
      default: return "📄";
    }
  };

  // handle dropdown close outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/option");
  };

  return (
    <>
      {/* Top Bar */}
      <header>
        <div className="left-header">
          <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <h1>Materials</h1>
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
        <aside className={sidebarOpen ? "open" : ""}>
          <button onClick={() => navigate("/dashboard")}>Home</button>
          <button>Calendar</button>
          <button>Enrolled</button>
          <button>Settings</button>
        </aside>

        <main className={sidebarOpen ? "shifted" : ""}>
          <div className="materials-page">
            {/* Search + Filter + Upload */}
            <div className="search-filter">
              <input
                type="text"
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="pdf">PDF</option>
                <option value="pptx">PPT</option>
                <option value="docx">Word</option>
                <option value="xlsx">Excel</option>
                <option value="image">Images</option>
                <option value="link">Links</option>
              </select>

              {isTeacher && (
                <button className="upload-btn" onClick={() => setShowPopup(true)}>
                  + Upload
                </button>
              )}
            </div>

            {/* Material Cards */}
            <div className="materials-list">
              {filteredMaterials.length === 0 ? (
                <div className="no-results">No results found</div>
              ) : (
                filteredMaterials.map((mat) => (
                  <div key={mat._id} className="material-card">
                    <div className="material-header">
                      <span>
                        {getFileIcon(mat.originalName, mat.isLink)}{" "}
                        {mat.title || mat.originalName || "Untitled"}
                      </span>
                    </div>
                    <div className="card-actions">
                      <button onClick={() => handleView(mat._id)} className="btn view">
                        View
                      </button>

                      {!mat.isLink && (
                        <button
                          onClick={() => handleDownload(mat._id)}
                          className="btn download"
                        >
                          Download
                        </button>
                      )}

                      {isTeacher && (
                        <button
                          onClick={() => confirmDelete(mat)}
                          className="btn delete"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Upload Popup */}
            {isTeacher && showPopup && (
              <div className="popup-overlay">
                <div className="popup-box">
                  <div className="popup-header">
                    <h3>Upload Material</h3>
                    <span
                      className="close-icon"
                      onClick={() => setShowPopup(false)}
                    >
                      ×
                    </span>
                  </div>

                  {/* Title */}
                  <input
                    type="text"
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />

                  {/* Upload Type Selector */}
                  <div className="upload-type">
                    <label>
                      <input
                        type="radio"
                        value="file"
                        checked={uploadType === "file"}
                        onChange={() => setUploadType("file")}
                      />
                      Upload File
                    </label>
                    <label>
                      <input
                        type="radio"
                        value="link"
                        checked={uploadType === "link"}
                        onChange={() => setUploadType("link")}
                      />
                      Upload Link
                    </label>
                  </div>

                  {/* Conditionally show File or Link input */}
                  {uploadType === "file" ? (
                    <input type="file" onChange={(e) => setFile(e.target.files[0])} />
                  ) : (
                    <input
                      type="text"
                      placeholder="Paste link URL..."
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                    />
                  )}

                  {/* Upload Message */}
                  {uploadMsg && <p className="form-message">{uploadMsg}</p>}

                  {/* Submit Button */}
                  <button
                    className="primary"
                    onClick={handleUpload}
                    disabled={uploading}
                  >
                    {uploading ? "Uploading..." : "Submit"}
                  </button>
                </div>
              </div>
            )}

            {/* Delete Confirmation Popup */}
            {deleteTarget && (
              <div className="popup-overlay">
                <div className="popup-box">
                  <div className="popup-header delete">
                    <h3>Confirm Delete</h3>
                    <span
                      className="close-icon"
                      onClick={() => setDeleteTarget(null)}
                    >
                      ×
                    </span>
                  </div>
                  <p>Are you sure you want to delete <b>{deleteTarget.title || deleteTarget.originalName}</b>?</p>
                  <div className="card-actions">
                    <button className="btn delete" onClick={handleDelete}>Yes, Delete</button>
                    <button className="btn view" onClick={() => setDeleteTarget(null)}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );
};

export default MaterialsPage;
