import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import './GroupService.css'; 

// --- CONFIGURATION ---
const GROUP_API_BASE_URL = "http://localhost:5020/api"; 
const USER_SERVICE_URL = "http://localhost:5000/api/users"; 
const CLASS_SERVICE_URL = "http://localhost:5001/api/classrooms";
// ---------------------

const GroupService = () => {
    // --- Routing & User Context ---
    const { id: classId, classId: paramClassId, assignmentId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const actualClassId = classId || paramClassId;
    const isGradingMode = !!assignmentId;

    // --- Data States ---
    const [groups, setGroups] = useState([]); 
    const [assignments, setAssignments] = useState([]); 
    const [classMembers, setClassMembers] = useState([]); 
    const [groupedStudentIds, setGroupedStudentIds] = useState([]); 
    
    // --- UI/Control States ---
    const [loading, setLoading] = useState(true); 
    const [error, setError] = useState(null); 
    const [message, setMessage] = useState(''); 
    
    // --- Refs ---
    const tokenRef = useRef(null); 
    // 🛑 CRITICAL FIX: Ref to ensure initial data fetch only runs ONCE.
    const initialFetchAttempted = useRef(false);

    // --- Group Creation/Edit States ---
    const [showGroupPopup, setShowGroupPopup] = useState(false); 
    const [newGroupName, setNewGroupName] = useState(''); 
    const [selectedMembers, setSelectedMembers] = useState([]); 
    const [groupToEdit, setGroupToEdit] = useState(null); 

    // --- Assignment Creation/Edit States ---
    const [showAssignmentPopup, setShowAssignmentPopup] = useState(false); 
    const [newAssignmentTitle, setNewAssignmentTitle] = useState(''); 
    const [newAssignmentDeadline, setNewAssignmentDeadline] = useState(''); 
    const [newAssignmentDetails, setNewAssignmentDetails] = useState(''); 
    const [assignmentToEdit, setAssignmentToEdit] = useState(null); 
    
    // File Upload and Group Selection States
    const [newAssignmentFile, setNewAssignmentFile] = useState(null);
    const [selectedAssignmentGroups, setSelectedAssignmentGroups] = useState([]); 
    const [availableGroups, setAvailableGroups] = useState([]); 

    // --- Submission States (Teacher Mode) ---
    const [submissions, setSubmissions] = useState([]); 
    const [currentAssignmentTitle, setCurrentAssignmentTitle] = useState(''); 
    const [gradingTarget, setGradingTarget] = useState(null); 
    const [grade, setGrade] = useState(''); 
    const [feedback, setFeedback] = useState(''); 
    const [showGradePopup, setShowGradePopup] = useState(false); 
    const [gradingMsg, setGradingMsg] = useState(''); 

    // --- Submission States (Student Mode) ---
    const [submissionFile, setSubmissionFile] = useState(null); 
    const [selectedAssignmentId, setSelectedAssignmentId] = useState(null); 
    const [showSubmissionPopup, setShowSubmissionPopup] = useState(false); 
    const [submissionDetails, setSubmissionDetails] = useState(''); 

    // =========================================================================
    //                            CORE FETCH LOGIC
    // =========================================================================

     const getStudentsInClass = useCallback(async (cId, authToken) => { 
        if (!cId || !authToken) return []; 
        try {
            // 1. Call to Class Service (REQUIRES TOKEN)
            const idsResponse = await axios.get( 
                `${CLASS_SERVICE_URL}/${cId}/student-ids-for-grouping`, 
                { headers: { Authorization: `Bearer ${authToken}` } } 
            );
            const { studentIds } = idsResponse.data; 
            if (!studentIds || studentIds.length === 0) { 
                return []; 
            }

            // 2. Call to User Service /batch-users (NO LONGER REQUIRES TOKEN)
            // 🛑 FIX: Remove the headers configuration object entirely.
            const userDetailsResponse = await axios.get( 
                `${USER_SERVICE_URL}/batch-users?ids=${studentIds.join(',')}`
                // Removed: , { headers: { Authorization: `Bearer ${authToken}` } } 
            );
            return userDetailsResponse.data; 
        } catch (err) {
            console.error(
                "WARNING: Could not fetch user data for student group. Check User Service (5000) status. Details:", 
                err.response?.data?.msg || err.message
            ); 
            throw err; 
        }
    }, []);

    const fetchInitialData = useCallback(async (cId, authToken, uRole, shouldSetLoading = false) => { 
        if (shouldSetLoading) {
            setLoading(true);
            setError(null); // Clear error only when starting a fresh load
        }
        
        try {
            let groupFetchPromise; 
            let groupData = []; 
            // ... (rest of promise setup) ...
            
            if (uRole === 'teacher') { 
                groupFetchPromise = axios.get( 
                    `${GROUP_API_BASE_URL}/groups/class/${cId}/teacher`, 
                    { headers: { Authorization: `Bearer ${authToken}` } } 
                );
            } else {
                groupFetchPromise = axios.get( 
                    `${GROUP_API_BASE_URL}/groups/class/${cId}/mine`, 
                    { headers: { Authorization: `Bearer ${authToken}` } } 
                );
            }
            
            const groupedIdsPromise = axios.get( 
                `${GROUP_API_BASE_URL}/groups/class/${cId}/grouped-student-ids`, 
                { headers: { Authorization: `Bearer ${authToken}` } } 
            );

            // If getStudentsInClass throws, Promise.all fails and triggers catch
            const [
                members, 
                groupsResponse, 
                assignmentsResponse, 
                groupedIdsResponse 
            ] = await Promise.all([ 
                getStudentsInClass(cId, authToken), 
                groupFetchPromise, 
                axios.get( 
                    `${GROUP_API_BASE_URL}/assignments/class/${cId}`, 
                    { headers: { Authorization: `Bearer ${authToken}` } } 
                ),
                groupedIdsPromise 
            ]);

            setClassMembers(members); 
            setGroupedStudentIds(groupedIdsResponse.data); 

            if (uRole === 'teacher') { 
                groupData = groupsResponse.data; 
                setAvailableGroups(groupData); 
            } else { 
                const studentGroup = groupsResponse.data.group; 
                groupData = studentGroup ? [studentGroup] : []; 
            }
            setGroups(groupData); 

            const assignmentsData = assignmentsResponse.data.assignments || assignmentsResponse.data; 
            setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []); 

        } catch (err) {
            // ✅ This sets the error state which will be checked by the useEffect in the next render
            console.error("Fetch data error caught in fetchInitialData:", err); 
            setError("Failed to fetch initial data. Check backend status or console for details."); 
        } finally {
            if (shouldSetLoading) {
                setLoading(false); 
            }
        }
    }, [getStudentsInClass]); 
    
    // fetchSubmissions and other functions remain the same...

    const fetchSubmissions = useCallback(async (cId, aId, authToken) => { 
        setError(null); 
        try {
            const subsResponse = await axios.get( 
                `${GROUP_API_BASE_URL}/submissions/assignment/${aId}/teacher`, 
                { headers: { Authorization: `Bearer ${authToken}` } } 
            );
             setSubmissions(subsResponse.data.submissions);
            const assignment = assignments.find(a => a._id === aId); 
            if(assignment) {
                setCurrentAssignmentTitle(assignment.title); 
            }
        } catch (err) {
            console.error("Fetch submissions error:", err); 
            setError("Failed to fetch submissions."); 
        }
    }, [assignments]); 

    // =========================================================================
    //                                 USE EFFECT
    // =========================================================================

    useEffect(() => { 
        let isMounted = true; 

        const token = localStorage.getItem("token"); 
        const storedUser = localStorage.getItem("user"); 
        if (!token || !storedUser) { 
            navigate('/login'); 
            return; 
        }
        
        try {
            const u = JSON.parse(storedUser); 
            setUser(u); 
            tokenRef.current = token; 

            // 🛑 CRITICAL FIX: Only run fetch if classId is present, there is NO current error, 
            // AND we haven't attempted the initial fetch yet.
            if (actualClassId && !error && !initialFetchAttempted.current) { 
                // Mark the attempt before the async call returns. This stops the loop on failure.
                initialFetchAttempted.current = true;
                
                // INITIAL LOAD: Pass true to start loading, clear error, and run fetch
                fetchInitialData(actualClassId, token, u.role, true).then(() => { 
                    if (isMounted && isGradingMode && assignmentId) { 
                        fetchSubmissions(actualClassId, assignmentId, token); 
                    }
                });
            } else if (isMounted && !actualClassId && !error) { 
                setError("Class ID is missing in the route."); 
                setLoading(false); 
            }
        } catch (e) {
            console.error("Error parsing user data:", e); 
            if (isMounted) navigate('/login'); 
        }

        return () => {
            isMounted = false; // Cleanup function
        };

    // The 'error' dependency re-runs the effect, but the 'initialFetchAttempted' ref prevents the fetch call.
    }, [actualClassId, isGradingMode, assignmentId, navigate, fetchInitialData, fetchSubmissions, error]); 

    // =========================================================================
    //                             ACTIONS & UTILS (remaining code)
    // =========================================================================
    
    const closeGroupPopup = () => { 
        setShowGroupPopup(false); 
        setGroupToEdit(null); 
        setNewGroupName(''); 
        setSelectedMembers([]); 
        // Re-fetch data without toggling global loading (shouldSetLoading=false)
        fetchInitialData(actualClassId, tokenRef.current, user.role); 
    };

    const handleCreateGroup = async () => { 
        if (!newGroupName.trim() || selectedMembers.length === 0) { 
            setMessage('Group name and members are required.'); 
            return; 
        }
        const actionType = groupToEdit ? 'updated' : 'created';
        setMessage(`Group ${actionType} in progress...`);
        try {
            const url = groupToEdit 
                ? `${GROUP_API_BASE_URL}/groups/${groupToEdit._id}` 
                : `${GROUP_API_BASE_URL}/groups`; 
            const method = groupToEdit ? 'patch' : 'post'; 
            const payload = {
                classId: actualClassId, 
                name: newGroupName, 
                members: selectedMembers, 
                teacherId: user.id 
            };
            await axios[method](url, payload, { 
                headers: { Authorization: `Bearer ${tokenRef.current}` } 
            });
            setMessage(`Group ${actionType} successfully!`); 
            setShowGroupPopup(false); 
            setGroupToEdit(null); 
            setNewGroupName(''); 
            setSelectedMembers([]); 
            // Re-fetch data
            fetchInitialData(actualClassId, tokenRef.current, user.role); 
        } catch (err) {
            console.error("Group action error:", err); 
            setMessage(`Failed to ${actionType} group.`); 
        }
    };

    const handleDeleteGroup = async (groupId) => { 
        if (!window.confirm("Are you sure you want to delete this group?")) return; 
        setMessage('Deleting group...');
        try {
            await axios.delete( 
                `${GROUP_API_BASE_URL}/groups/${groupId}`, 
                { headers: { Authorization: `Bearer ${tokenRef.current}` } } 
            );
            setMessage('Group deleted successfully!'); 
            // Re-fetch data
            fetchInitialData(actualClassId, tokenRef.current, user.role); 
        } catch (err) {
            console.error("Delete group error:", err); 
            setMessage('Failed to delete group.'); 
        }
    };

    const openEditGroup = (group) => { 
        setGroupToEdit(group); 
        setNewGroupName(group.name); 
        setSelectedMembers(group.members.map(m => m._id || m)); 
        setShowGroupPopup(true); 
    };

    const handleToggleMember = (memberId) => { 
        setSelectedMembers(prev => 
            prev.includes(memberId) 
                ? prev.filter(id => id !== memberId) 
                : [...prev, memberId] 
        );
    };

    const handleCreateAssignment = async () => {
        if (!newAssignmentTitle.trim() || !newAssignmentDeadline || selectedAssignmentGroups.length === 0) {
            setMessage('Title, Deadline, and at least one Group must be selected.');
            return;
        }

        const actionType = assignmentToEdit ? 'updated' : 'created';
        setMessage(`Assignment ${actionType} in progress...`);
        const formData = new FormData();
        formData.append('classId', actualClassId);
        formData.append('title', newAssignmentTitle);
        formData.append('details', newAssignmentDetails); 
        formData.append('deadline', new Date(newAssignmentDeadline).toISOString());
        formData.append('assignedGroups', JSON.stringify(selectedAssignmentGroups)); 
        formData.append('teacherId', user.id); 

        if (newAssignmentFile) {
            formData.append('file', newAssignmentFile); 
        }
        
        const url = assignmentToEdit 
            ? `${GROUP_API_BASE_URL}/assignments/${assignmentToEdit._id}` 
            : `${GROUP_API_BASE_URL}/assignments/create`; 
        const method = assignmentToEdit ? 'patch' : 'post';
        
        try {
            await axios[method](
                url,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${tokenRef.current}`,
                        'Content-Type': 'multipart/form-data', 
                    }
                }
            );
            setMessage(`Assignment ${actionType} successfully!`); 
            setShowAssignmentPopup(false); 
            
            setAssignmentToEdit(null); 
            setNewAssignmentTitle(''); 
            setNewAssignmentDeadline(''); 
            setNewAssignmentDetails(''); 
            setNewAssignmentFile(null); 
            setSelectedAssignmentGroups([]); 
            
            // Re-fetch data
            fetchInitialData(actualClassId, tokenRef.current, user.role); 
        } catch (err) {
            console.error("Assignment creation error:", err.response ? err.response.data : err); 
            setMessage(`Failed to ${actionType} assignment: ${err.response?.data?.msg || 'Server Error'}`); 
        }
    };

    const handleToggleAssignedGroup = (groupId) => {
        setSelectedAssignmentGroups(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        );
    };

    const handleDeleteAssignment = async (aId) => { 
        if (!window.confirm("Are you sure you want to delete this assignment?")) return; 
        setMessage('Deleting assignment...');
        try {
            await axios.delete( 
                `${GROUP_API_BASE_URL}/assignments/${aId}`, 
                { headers: { Authorization: `Bearer ${tokenRef.current}` } } 
            );
            setMessage('Assignment deleted successfully!'); 
            // Re-fetch data
            fetchInitialData(actualClassId, tokenRef.current, user.role); 
        } catch (err) {
            console.error("Delete assignment error:", err); 
            setMessage('Failed to delete assignment.'); 
        }
    };

    const handleDownloadAssignmentFile = async (assignment) => {
        if (!assignment.questionFileKey && !assignment.fileKey) {
            setMessage("Error: No file key found for this item.");
            return;
        }
        
        const fileKey = assignment.questionFileKey || assignment.fileKey;
        const assignmentIdToUse = assignment._id; 

        try {
            const response = await axios.get(
                `${GROUP_API_BASE_URL}/assignments/${assignmentIdToUse}/signed-url?key=${fileKey}`,
                { headers: { Authorization: `Bearer ${tokenRef.current}` } }
            );
            const signedUrl = response.data.url; 
            if (signedUrl) {
                window.open(signedUrl, '_blank');
            } else {
                setMessage("Failed to get file download link.");
            }
        } catch (err) {
            console.error("Download error:", err);
            setMessage("Failed to download file. Please check server logs.");
        }
    };

    const handleOpenSubmission = (assignment) => { 
        setSelectedAssignmentId(assignment._id); 
        setSubmissionDetails(''); 
        setSubmissionFile(null); 
        setShowSubmissionPopup(true); 
    };
    
    const handleFileChange = (e) => { 
        setSubmissionFile(e.target.files[0]); 
    };

    const handleStudentSubmission = async () => { 
        if (!submissionFile) { 
            setMessage('Please select a file to submit.'); 
            return; 
        }

        const group = groups.length > 0 ? groups[0] : null; 
        if (!group) {
            setMessage('You must belong to a group to submit an assignment.'); 
            return; 
        }

        setMessage('Submitting...'); 
        const formData = new FormData(); 
        formData.append('file', submissionFile); 
        formData.append('details', submissionDetails); 
        formData.append('groupId', group._id); 
        formData.append('assignmentId', selectedAssignmentId); 
        formData.append('classId', actualClassId); 
        
        try {
            await axios.post( 
                `${GROUP_API_BASE_URL}/submissions/upload`, 
                formData, 
                {
                    headers: {
                        'Authorization': `Bearer ${tokenRef.current}`, 
                        'Content-Type': 'multipart/form-data' 
                    }
                }
            );
            setMessage('Assignment submitted successfully!'); 
            setShowSubmissionPopup(false);
            // Re-fetch data
            fetchInitialData(actualClassId, tokenRef.current, user.role);
        } catch (err) {
            console.error("Submission error:", err);
            setMessage(err.response?.data?.msg || 'Failed to submit assignment.');
        }
    };

    const handleOpenGradePopup = (submission) => {
        setGradingTarget(submission);
        setGrade(submission.grade || '');
        setFeedback(submission.feedback || '');
        setShowGradePopup(true);
    };
    
    const handleGradeSubmission = async () => {
        if (!grade || isNaN(grade) || grade < 0 || grade > 100) {
            setGradingMsg('Grade must be a number between 0 and 100.');
            return;
        }
        setGradingMsg('Submitting grade...');
        try {
            await axios.patch(
                `${GROUP_API_BASE_URL}/submissions/${gradingTarget._id}/grade`,
                { grade: Number(grade), feedback },
                { headers: { Authorization: `Bearer ${tokenRef.current}` } }
            );
            setGradingMsg('Grade submitted successfully!');
            setShowGradePopup(false);
            setGradingTarget(null);
            // Re-fetch submissions
            fetchSubmissions(actualClassId, assignmentId, tokenRef.current);
        } catch (err) {
            setGradingMsg('Failed to submit grade.');
        }
    };

    const getStudentName = (memberId) => {
        if (!classMembers || classMembers.length === 0) return 'Loading/Unknown User';
        const member = classMembers.find(m => m._id === memberId);
        return member ? `${member.name} (${member.rollNo || member.staffId || member.email})` : 'Unknown User';
    };

    const getGroupStatus = (group) => {
        if (!user || !group || !group.members) return 'N/A';
        return group.members.some(m => (m._id || m) === user.id) ? 'Your Group' : 'Other Group';
    };

    const getSubmissionStatus = (assignment) => {
        if (!user) return 'N/A';
        const group = groups.length > 0 ? groups[0] : null;
        if (user.role === 'student' && !group) return 'No Group';
        
        const submissionsArray = assignment.submissions || [];
        const submission = submissionsArray.find(s => (s.groupId._id || s.groupId) === group?._id);
        
        if (!submission) return 'Not Submitted';
        return submission.grade !== undefined && submission.grade !== null
            ? `Graded: ${submission.grade}/100`
            : 'Submitted';
    };

    const formatDeadline = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const availableMembers = classMembers.filter(member => {
        const memberIdString = member._id;
        if (groupToEdit) {
            return !groupedStudentIds.includes(memberIdString) || selectedMembers.includes(memberIdString);
        }
        return !groupedStudentIds.includes(memberIdString);
    });

    // =========================================================================
    //                                 RENDER
    // =========================================================================

    if (loading && (!user || classMembers.length === 0)) return <div className="group-service-loading">Loading class data...</div>;
    if (error) return <div className="group-service-error">{error}</div>;
    if (!user) return null;

    // --- RENDER TEACHER GRADING VIEW ---
    if (user.role === 'teacher' && isGradingMode) {
        return (
            <div className="group-service-container">
                <header>
                    <button className="back-button" onClick={() => navigate(`/classroom/${actualClassId}/group-service`)}>
                        &larr; Back to Groups
                    </button>
                    <h1>Grading: {currentAssignmentTitle}</h1>
                </header>
                {gradingMsg && <p className={`status-message ${gradingMsg.includes('successfully') ? 'success' : 'error'}`}>{gradingMsg}</p>}

                <div className="submission-list">
                    {submissions.length > 0 ? (
                        submissions.map(sub => (
                            <div key={sub._id} className="submission-card">
                                <h4>Group: {sub.groupId?.name || 'Unknown Group'}</h4>
                                <p>Submitted: {formatDeadline(sub.submissionDate)}</p>
                                <p>Details: {sub.details}</p>
                                <p>Status: {sub.grade !== undefined ? `Graded: ${sub.grade}/100` : 'Awaiting Grade'}</p>
                                <div className="submission-actions">
                                    <button 
                                        onClick={() => handleDownloadAssignmentFile({ fileKey: sub.fileKey, _id: sub._id })} 
                                        className="action-button download-button"
                                    >
                                        Download Submission
                                    </button>
                                    <button 
                                        onClick={() => handleOpenGradePopup(sub)} 
                                        className="action-button primary"
                                    >
                                        {sub.grade !== undefined ? 'Edit Grade' : 'Grade'}
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p>No submissions found for this assignment.</p>
                    )}
                </div>

                {/* Grade Popup */}
                {showGradePopup && gradingTarget && (
                    <div className="popup-overlay">
                        <div className="popup-content">
                            <h2>Grade Submission for {gradingTarget.groupId?.name}</h2>
                            <label>Marks (0-100):</label>
                            <input 
                                type="number" 
                                value={grade} 
                                onChange={(e) => setGrade(e.target.value)} 
                                min="0" 
                                max="100" 
                                required 
                            />
                            <label>Feedback:</label>
                            <textarea 
                                value={feedback} 
                                onChange={(e) => setFeedback(e.target.value)}
                            />
                            <div className="popup-actions">
                                <button onClick={handleGradeSubmission} className="primary">Submit Grade</button>
                                <button onClick={() => setShowGradePopup(false)} className="secondary">Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // --- RENDER STANDARD GROUP/ASSIGNMENT VIEW ---
    return (
        <div className="group-service-container">
            {/* --- HEADER/NAVIGATION --- */}
            <header className="header">
                <h1>Classroom {actualClassId}</h1>
                <p>User: {user?.name} ({user?.role})</p>
                <button onClick={() => navigate('/dashboard')} className="back-button">
                    ← Back to Dashboard
                </button>
            </header>

            {/* --- STATUS MESSAGE --- */}
            {message && <p className={`status-message ${message.includes('successfully') ? 'success' : 'error'}`}>{message}</p>}

            {/* --- GROUP MANAGEMENT SECTION --- */}
            <div className="group-management-section">
                <h3>Group Management</h3>
                {user.role === 'teacher' && (
                    <button 
                        onClick={() => {setGroupToEdit(null); setNewGroupName(''); setSelectedMembers([]); setShowGroupPopup(true);}} 
                        className="create-button"
                    >
                        Create New Group
                    </button>
                )}
                <div className="group-list">
                    {groups.length > 0 ? (
                        groups.map(group => (
                            <div key={group._id} className={`group-card ${getGroupStatus(group) === 'Your Group' ? 'is-my-group' : ''}`}>
                                <h4>{group.name} - ({getGroupStatus(group)})</h4>
                                <p>Members:</p>
                                <ul>
                                    {group.members.map(member => (
                                        <li key={member._id}>
                                            {getStudentName(member._id || member)}
                                        </li>
                                    ))}
                                </ul>
                                {user.role === 'teacher' && (
                                    <div className="group-actions">
                                        <button onClick={() => openEditGroup(group)} className="action-button edit-button">Edit</button>
                                        <button onClick={() => handleDeleteGroup(group._id)} className="action-button delete-button">Delete</button>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <p>
                            {user.role === 'teacher' ? 'No groups created yet.' : 'You are not currently in a group.'}
                        </p>
                    )}
                </div>
            </div>

            <hr/>

            {/* --- ASSIGNMENT SECTION --- */}
            <div className="assignments-section">
                <h3>Assignments</h3>
                {user.role === 'teacher' && (
                    <button 
                        onClick={() => {
                            setAssignmentToEdit(null);
                            setNewAssignmentTitle('');
                            setNewAssignmentDeadline('');
                            setNewAssignmentDetails('');
                            setNewAssignmentFile(null);
                            setSelectedAssignmentGroups([]);
                            setShowAssignmentPopup(true);
                        }} 
                        className="create-button"
                    >
                        Create New Assignment
                    </button>
                )}
                
                {/* Assignment List */}
                <div className="assignment-list">
                    {assignments.length > 0 ? (
                        assignments.map(assignment => (
                            <div key={assignment._id} className="assignment-card">
                                <h4>{assignment.title}</h4>
                                <p>Deadline: {formatDeadline(assignment.dueDate)}</p>
                                <p>Details: {assignment.description}</p>
                                <p>Status: {user.role === 'student' ? getSubmissionStatus(assignment) : 'Teacher View'}</p>
                                
                                {assignment.questionFileKey && (
                                    <button
                                        onClick={() => handleDownloadAssignmentFile(assignment)}
                                        className="action-button download-button"
                                    >
                                        Download Question File ({assignment.originalName || 'File'})
                                    </button>
                                )}
                                
                                <div className="assignment-actions">
                                    {user.role === 'teacher' && (
                                        <>
                                            <button onClick={() => handleDeleteAssignment(assignment._id)} className="action-button delete-button">Delete</button>
                                            <button onClick={() => navigate(`/classroom/${actualClassId}/grade/${assignment._id}`)} className="action-button primary">View Submissions</button>
                                        </>
                                    )}
                                    {user.role === 'student' && groups.length > 0 && getSubmissionStatus(assignment) === 'Not Submitted' && (
                                        <button 
                                            onClick={() => handleOpenSubmission(assignment)} 
                                            className="action-button submit-button"
                                        >
                                            Submit Work
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p>No assignments found.</p>
                    )}
                </div>
            </div>

            {/* --- TEACHER: Assignment Creation/Edit Popup --- */}
            {showAssignmentPopup && user.role === 'teacher' && (
                <div className="popup-overlay">
                    <div className="popup-content">
                        <h2>{assignmentToEdit ? 'Edit Assignment' : 'Create New Assignment'}</h2>
                        
                        <label>Title:</label>
                        <input 
                            type="text" 
                            value={newAssignmentTitle} 
                            onChange={(e) => setNewAssignmentTitle(e.target.value)} 
                            required 
                        />

                        <label>Details:</label>
                        <textarea 
                            value={newAssignmentDetails} 
                            onChange={(e) => setNewAssignmentDetails(e.target.value)} 
                            required 
                        />

                        <label>Deadline:</label>
                        <input 
                            type="datetime-local" 
                            value={newAssignmentDeadline} 
                            onChange={(e) => setNewAssignmentDeadline(e.target.value)} 
                            required 
                        />

                        {/* File Upload Input */}
                        <label>Question File Upload (Optional):</label>
                        <input 
                            type="file" 
                            onChange={(e) => setNewAssignmentFile(e.target.files[0])} 
                        />
                        {newAssignmentFile && <p>Selected: {newAssignmentFile.name}</p>}
                        {assignmentToEdit?.originalName && !newAssignmentFile && (
                            <p>Current file: {assignmentToEdit.originalName}. Upload a new file to replace it.</p>
                        )}

                        {/* Group Selection */}
                        <label>Assign to Groups (Select one or more):</label>
                        <div className="group-selection-box">
                            {availableGroups.length > 0 ? (
                                availableGroups.map(group => (
                                    <div key={group._id} className="group-checkbox-item">
                                        <input
                                            type="checkbox"
                                            id={`assign-group-${group._id}`}
                                            checked={selectedAssignmentGroups.includes(group._id)}
                                            onChange={() => handleToggleAssignedGroup(group._id)}
                                        />
                                        <label htmlFor={`assign-group-${group._id}`}>{group.name}</label>
                                    </div>
                                ))
                            ) : (
                                <p>No groups found for this class. Create groups first.</p>
                            )}
                        </div>
                        
                        {message && <p className="status-message">{message}</p>}

                        <div className="popup-actions">
                            <button onClick={handleCreateAssignment} className="primary">
                                {assignmentToEdit ? 'Update Assignment' : 'Create Assignment'}
                            </button>
                            <button 
                                onClick={() => {
                                    setShowAssignmentPopup(false); 
                                    setAssignmentToEdit(null);
                                    setNewAssignmentTitle('');
                                    setNewAssignmentDeadline('');
                                    setNewAssignmentDetails('');
                                    setNewAssignmentFile(null);
                                    setSelectedAssignmentGroups([]);
                                    setMessage('');
                                }} 
                                className="secondary"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* --- STUDENT: Submission Popup --- */}
            {showSubmissionPopup && user.role === 'student' && (
                <div className="popup-overlay">
                    <div className="popup-content">
                        <h2>Submit Assignment</h2>
                        <label>File Upload (e.g., PDF, ZIP):</label>
                        <input 
                            type="file" 
                            onChange={handleFileChange} 
                            required 
                        />
                        {submissionFile && <p>Selected: {submissionFile.name}</p>}
                        
                        <label>Submission Notes (Optional):</label>
                        <textarea 
                            value={submissionDetails} 
                            onChange={(e) => setSubmissionDetails(e.target.value)} 
                        />

                        <div className="popup-actions">
                            <button onClick={handleStudentSubmission} className="primary">Submit</button>
                            <button onClick={() => setShowSubmissionPopup(false)} className="secondary">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TEACHER: Group Creation/Edit Popup --- */}
            {showGroupPopup && user.role === 'teacher' && (
                <div className="popup-overlay">
                    <div className="popup-content">
                        <h2>{groupToEdit ? 'Edit Group' : 'Create New Group'}</h2>
                        <label>Group Name:</label>
                        <input
                            type="text"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            required
                        />

                        <label>Select Members (Available Students):</label>
                        <div className="member-selection-box">
                            {availableMembers.length > 0 ? (
                                availableMembers.map(member => (
                                    <div key={member._id} className="member-checkbox-item">
                                        <input
                                            type="checkbox"
                                            id={member._id}
                                            checked={selectedMembers.includes(member._id)}
                                            onChange={() => handleToggleMember(member._id)}
                                        />
                                        <label htmlFor={member._id}>{getStudentName(member._id)}</label>
                                    </div>
                                ))
                            ) : (
                                <p>All available students are currently in groups.</p>
                            )}
                        </div>

                        {message && <p className="status-message">{message}</p>}

                        <div className="popup-actions">
                            <button onClick={handleCreateGroup} className="primary">
                                {groupToEdit ? 'Update Group' : 'Create Group'}
                            </button>
                            <button onClick={closeGroupPopup} className="secondary">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupService;

