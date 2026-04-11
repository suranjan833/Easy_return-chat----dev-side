import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Container, Row, Col, Button, Table, Spinner, Alert, Modal, Form } from 'react-bootstrap';
import { getGroups, uploadFile } from '../../Services/api.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const GroupSettingsPage = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const location = useLocation();
  const [group, setGroup] = useState({
    id: parseInt(groupId),
    name: location.state?.groupName || 'Unnamed Group',
    avatar_url: location.state?.avatar_url || null,
    description: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [avatarModal, setAvatarModal] = useState({ isOpen: false, groupId: null, groupName: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const token = localStorage.getItem('accessToken');
  const userId = localStorage.getItem('userId');

  // Conditional logging for development only
  const log = process.env.NODE_ENV === 'development' ? console.log : () => {};

  useEffect(() => {
    const isValidUserId = userId && /^\d+$/.test(userId);
    if (!token || !isValidUserId || !groupId || isNaN(groupId)) {
      setError('Invalid session or group ID. Please log in again.');
      setLoading(false);
      navigate('/auth-login');
      return;
    }

    const fetchGroup = async () => {
      try {
        setLoading(true);
        const fetchedGroups = await getGroups();
        const currentGroup = fetchedGroups.find((g) => g.id === parseInt(groupId));
        if (currentGroup) {
          setGroup({
            id: currentGroup.id,
            name: currentGroup.name || location.state?.groupName || 'Unnamed Group',
            avatar_url: currentGroup.avatar_url || location.state?.avatar_url || null,
            description: currentGroup.description || 'No description available',
          });
          setError(null);
        } else {
          throw new Error('Group not found');
        }
      } catch (err) {
        const errorMessage = err.response?.data?.detail
          ? Array.isArray(err.response.data.detail)
            ? err.response.data.detail.map((d) => d.msg).join(', ')
            : err.response.data.detail
          : err.message || 'Failed to load group details';
        setError(errorMessage);
        if (err.response?.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('userId');
          navigate('/auth-login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [navigate, token, userId, groupId]);

  const handleViewMembers = () => {
    navigate(`/groups/${groupId}/members`);
  };

  const handleViewUsersNotInGroup = () => {
    navigate(`/groups/${groupId}/users-not-in-group`);
  };

  const handleAddMembers = () => {
    navigate(`/groups/${groupId}/add-members`);
  };

  const handleViewFiles = () => {
    navigate(`/groups/${groupId}/files`);
  };

  const openAvatarModal = () => {
    setAvatarModal({ isOpen: true, groupId: parseInt(groupId), groupName: group.name });
    setSelectedFile(null);
  };

  const closeAvatarModal = () => {
    setAvatarModal({ isOpen: false, groupId: null, groupName: '' });
    setSelectedFile(null);
    setError(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && ['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size exceeds 5MB limit.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setError(null);
    } else {
      setSelectedFile(null);
      setError('Please select a valid image file (JPEG, JPG, or PNG).');
    }
  };

  const handleUploadAvatar = async () => {
    const { groupId } = avatarModal;
    if (!Number.isInteger(groupId) || groupId <= 0 || !selectedFile) {
      setError('Invalid group ID or no file selected.');
      return;
    }

    try {
      setUploading(true);
      const response = await uploadFile(selectedFile, groupId);
      log('Upload Response:', response);
      const avatar_url = response.url || response.filename || response.avatar_url;
      if (!avatar_url) {
        throw new Error('Invalid avatar URL in API response');
      }
      setGroup((prev) => ({ ...prev, avatar_url }));
      setError(null);
      closeAvatarModal();
    } catch (err) {
      const errorMessage =
        err.response?.status === 422
          ? err.response.data.detail.map((d) => d.msg).join(', ')
          : err.response?.status === 401
          ? 'Session expired. Please log in again.'
          : err.message || 'Failed to upload avatar';
      setError(errorMessage);
      if (err.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userId');
        navigate('/auth-login');
      }
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <Container className="my-5 d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 text-muted">Loading group settings...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center mt-5">
            <div>
              <h3 className="fw-bold mb-1 mt-2">Settings for {group.name}</h3>
              <p className="text-muted mb-0">Manage group members and files</p>
            </div>
            <Button
              variant="primary"
              onClick={() => navigate(`/groups/${groupId}/messages`, { state: { groupName: group.name, avatar_url: group.avatar_url } })}
              className="d-flex align-items-center"
              aria-label="Go to group chat"
            >
              <i className="bi bi-chat me-2" aria-hidden="true"></i> Back to Chat
            </Button>
          </div>
        </Col>
      </Row>

      {error && (
        <Alert
          variant="danger"
          className="border-0 bg-danger bg-opacity-10 mb-4"
          onClose={() => setError(null)}
          dismissible
        >
          <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true"></i>
          {error}
        </Alert>
      )}

      <Row>
        <Col>
          <div className="d-flex align-items-center mb-4">
            <div className="p-2 rounded me-3">
              {group.avatar_url ? (
                <img
                  src={group.avatar_url}
                  alt={group.name || 'Group avatar'}
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <i className="bi bi-people-fill text-primary fs-2" aria-hidden="true"></i>
              )}
            </div>
            <div>
              <h5 className="fw-bold mb-1">{group.name}</h5>
              <small className="text-muted">{group.description}</small>
            </div>
          </div>

          <div className="d-flex flex-column gap-2">
            <Button
              variant="outline-primary"
              onClick={handleViewMembers}
              aria-label={`View members of ${group.name}`}
            >
              <i className="bi bi-people me-2" aria-hidden="true"></i> View Members
            </Button>
            <Button
              variant="outline-primary"
              onClick={handleViewUsersNotInGroup}
              aria-label={`View users not in ${group.name}`}
            >
              <i className="bi bi-person-x me-2" aria-hidden="true"></i> View Non-Members
            </Button>
            <Button
              variant="outline-success"
              onClick={handleAddMembers}
              aria-label={`Add members to ${group.name}`}
            >
              <i className="bi bi-person-plus me-2" aria-hidden="true"></i> Add Members
            </Button>
            <Button
              variant="outline-info"
              onClick={handleViewFiles}
              aria-label={`View files in ${group.name}`}
            >
              <i className="bi bi-folder me-2" aria-hidden="true"></i> View Files
            </Button>
            <Button
              variant="outline-primary"
              onClick={openAvatarModal}
              aria-label={`Upload avatar for ${group.name}`}
            >
              <i className="bi bi-image me-2" aria-hidden="true"></i> Upload Avatar
            </Button>
          </div>
        </Col>
      </Row>

      <Modal show={avatarModal.isOpen} onHide={closeAvatarModal} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">Upload Group Avatar</Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-4">
          <div className="text-center">
            <p className="mb-3">
              Upload an avatar for <strong>"{avatarModal.groupName}"</strong>
            </p>
            <Form.Group controlId="avatarUpload">
              <Form.Control
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleFileChange}
                aria-label="Select an avatar image"
              />
              <Form.Text className="text-muted">
                Please select a JPEG, JPG, or PNG image (max 5MB).
              </Form.Text>
            </Form.Group>
            {error && (
              <Alert variant="danger" className="mt-3">
                {error}
              </Alert>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="outline-secondary" onClick={closeAvatarModal} disabled={uploading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleUploadAvatar}
            disabled={!selectedFile || uploading}
            aria-label="Upload selected avatar"
          >
            {uploading ? <Spinner size="sm" /> : 'Upload Avatar'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default GroupSettingsPage;