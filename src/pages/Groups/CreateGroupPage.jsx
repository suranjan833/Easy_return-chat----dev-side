import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Form, Button, Card, Table, Spinner, Alert, Badge } from 'react-bootstrap';
import { uploadFile } from '../../Services/api.js';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://chatsupport.fskindia.com";


const CreateGroupPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', group_creater: '' });
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    const fetchGroups = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${BASE_URL}/groups/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        setGroups(Array.isArray(response.data) ? response.data : []);
        setError(null);
      } catch (err) {
        console.error('Error fetching groups:', err);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in again.');
          localStorage.removeItem('accessToken');
          navigate('/auth-login');
        } else {
          setError(err.response?.data?.detail || 'Failed to load groups.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [navigate, token, success]);

  const filteredGroups = groups.filter(group =>
    group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.group_creater?.toString().includes(searchTerm) ||
    group.id?.toString().includes(searchTerm)
  );

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'avatar') {
      // Added: Handle file input for avatar
      const file = files[0];
      if (file) {
        if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
          setError('Please select a JPEG or PNG image.');
          setTimeout(() => setError(null), 5000);
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          setError('File size exceeds 5MB limit.');
          setTimeout(() => setError(null), 5000);
          return;
        }
        setFormData({ ...formData, avatar: file });
        // Added: Create preview URL for the selected avatar
        const reader = new FileReader();
        reader.onload = () => setAvatarPreview(reader.result);
        reader.readAsDataURL(file);
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.name) {
      setError('Group name is required.');
      return;
    }
    if (!formData.group_creater || isNaN(formData.group_creater) || Number(formData.group_creater) <= 0) {
      setError('Valid creator ID is required.');
      return;
    }

    try {
      setSubmitting(true);
      // Modified: Create group first
      const groupResponse = await axios.post(
        `${BASE_URL}/groups/`,
        {
          id: 0,
          name: formData.name,
          group_creater: Number(formData.group_creater),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Added: Upload avatar if one is selected
      let avatarUrl = null;
      if (formData.avatar) {
        const uploadResponse = await uploadFile(formData.avatar, groupResponse.data.id);
        avatarUrl = uploadResponse.url;
      }

      // Added: Update group with avatar URL if uploaded
      if (avatarUrl) {
        await axios.put(
          `${BASE_URL}/groups/${groupResponse.data.id}`,
          {
            name: formData.name,
            group_creater: Number(formData.group_creater),
            avatar_url: avatarUrl,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }

      setSuccess('Group created successfully!');
      setFormData({ name: '', group_creater: '', avatar: null });
      setAvatarPreview(null);
    } catch (err) {
      console.error('Error creating group:', err);
      if (err.response?.status === 401) {
        setError('Unauthorized: Please log in again.');
        localStorage.removeItem('accessToken');
        navigate('/auth-login');
      } else if (err.response?.status === 422) {
        setError(err.response.data.detail?.map((e) => e.msg).join(', ') || 'Invalid input.');
      } else {
        setError(err.response?.data?.detail || 'Failed to create group.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setFormData({ name: '', group_creater: '' });
    setAvatarPreview(null);
    setError(null);
    setSuccess(null);
  };

  if (loading) {
    return (
      <Container className="my-5 d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 text-muted">Loading groups...</p>
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
              <h2 className="fw-bold mb-1 mt-4">Create New Group</h2>
              <p className="text-muted mb-0">Add a new group to your organization</p>
            </div>
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-4">Group Information</h5>

              {error && (
                <Alert variant="danger" className="border-0 bg-danger bg-opacity-10 mb-4">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert variant="success" className="border-0 bg-success bg-opacity-10 mb-4">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  {success}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md={6} className="mb-3">
                    <Form.Group controlId="groupName">
                      <Form.Label className="fw-medium">Group Name</Form.Label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          <i className="bi bi-people-fill text-muted"></i>
                        </span>
                        <Form.Control
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Enter group name"
                          required
                          disabled={submitting}
                          className="border-start-0 ps-2"
                        />
                      </div>
                    </Form.Group>
                  </Col>

                  <Col md={6} className="mb-3">
                    <Form.Group controlId="groupCreator">
                      <Form.Label className="fw-medium">Creator ID</Form.Label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          <i className="bi bi-person-fill text-muted"></i>
                        </span>
                        <Form.Control
                          type="number"
                          name="group_creater"
                          value={formData.group_creater}
                          onChange={handleChange}
                          placeholder="Enter creator ID"
                          required
                          disabled={submitting}
                          className="border-start-0 ps-2"
                        />
                      </div>
                    </Form.Group>
                  </Col>

                  {/* Added: Avatar upload field */}
                  <Col md={6} className="mb-3">
                    <Form.Group controlId="groupAvatar">
                      <Form.Label className="fw-medium">Group Avatar</Form.Label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                          <i className="bi bi-image text-muted"></i>
                        </span>
                        <Form.Control
                          type="file"
                          name="avatar"
                          onChange={handleChange}
                          accept="image/png,image/jpeg,image/jpg"
                          disabled={submitting}
                          className="border-start-0 ps-2"
                          aria-label="Upload group avatar"
                        />
                      </div>
                      {/* Added: Avatar preview */}
                      {avatarPreview && (
                        <div className="mt-2">
                          <img
                            src={avatarPreview}
                            alt="Avatar preview"
                            style={{
                              width: '60px',
                              height: '60px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '1px solid #e0e0e0',
                            }}
                          />
                          <Button
                            variant="link"
                            className="text-danger p-0 ms-2"
                            onClick={() => {
                              setFormData({ ...formData, avatar: null });
                              setAvatarPreview(null);
                            }}
                            aria-label="Remove avatar"
                          >
                            <i className="bi bi-x-circle"></i>
                          </Button>
                        </div>
                      )}
                    </Form.Group>
                  </Col>

                  <Col xs={12} className="mt-2">
                    <div className="d-flex gap-2">
                      <Button
                        variant="primary"
                        type="submit"
                        disabled={submitting}
                        className="px-4 py-2"
                        size="lg"
                      >
                        {submitting ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-plus-circle me-2"></i>
                            Create Group
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline-secondary"
                        type="button"
                        onClick={handleClear}
                        disabled={submitting}
                        className="px-4 py-2"
                        size="lg"
                      >
                        <i className="bi bi-eraser me-2"></i>
                        Clear
                      </Button>
                    </div>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h5 className="fw-bold mb-1">Existing Groups</h5>
                  <small className="text-muted">
                    Showing {filteredGroups.length} {filteredGroups.length === 1 ? 'group' : 'groups'}
                  </small>
                </div>
                <div className="w-25">
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="bi bi-search text-muted"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      placeholder="Search groups..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>ID</th>
                      <th>Group Name</th>
                      <th>Creator ID</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGroups.length > 0 ? (
                      filteredGroups.map((group) => (
                        <tr key={group.id}>
                          <td className="fw-semibold">#{group.id}</td>
                          <td>
                            <div className="d-flex align-items-center">
                              {/* Modified: Added group avatar display */}
                              <div className="me-3">
                                {group.avatar_url ? (
                                  <img
                                    src={group.avatar_url}
                                    alt={`${group.name} avatar`}
                                    style={{
                                      width: '40px',
                                      height: '40px',
                                      borderRadius: '50%',
                                      objectFit: 'cover',
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: '40px',
                                      height: '40px',
                                      borderRadius: '50%',
                                      background: '#25d366',
                                      color: '#fff',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '16px',
                                    }}
                                  >
                                    {group.name ? group.name.slice(0, 2).toUpperCase() : 'G'}
                                  </div>
                                )}
                              </div>
                              <span className="fw-medium">{group.name}</span>
                            </div>
                          </td>
                          <td>
                            <Badge bg="light" text="dark" className="py-2 px-3">
                              <i className="bi bi-person-fill text-primary me-1"></i>
                              {group.group_creater}
                            </Badge>
                          </td>
                          <td>
                            <Badge pill bg="success" className="px-3 py-1">
                              Active
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center py-5">
                          <div className="py-3">
                            <i className="bi bi-people text-muted fs-1"></i>
                            <p className="mt-2 text-muted">No groups found</p>
                            {searchTerm ? (
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="mt-2"
                                onClick={() => setSearchTerm('')}
                              >
                                Clear search
                              </Button>
                            ) : (
                              <Button
                                variant="primary"
                                size="sm"
                                className="mt-2"
                                onClick={() => window.scrollTo(0, 0)}
                              >
                                <i className="bi bi-plus-lg me-1"></i> Create Group
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CreateGroupPage;