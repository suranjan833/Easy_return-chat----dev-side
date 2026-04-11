import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Form, Button, Card, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const GroupCreateEditPage = () => {
  const { id } = useParams(); // Group ID for editing
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', group_creater: '' });
  const [loading, setLoading] = useState(!!id); // Only load if editing
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const token = localStorage.getItem('accessToken');
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://chatsupport.fskindia.com";


  // Fetch group data if editing
  useEffect(() => {
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    if (id) {
      const fetchGroup = async () => {
        try {
          const response = await axios.get(`${BASE_URL}/groups/${id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          });
          setFormData({
            name: response.data.name || '',
            group_creater: response.data.group_creater?.toString() || '',
          });
          setError(null);
        } catch (err) {
          console.error('Error fetching group:', err);
          if (err.response?.status === 401) {
            setError('Unauthorized: Please log in again.');
            localStorage.removeItem('accessToken');
            navigate('/auth-login');
          } else {
            setError(err.response?.data?.detail || 'Failed to load group.');
          }
        } finally {
          setLoading(false);
        }
      };
      fetchGroup();
    } else {
      setLoading(false); // No loading for create mode
    }
  }, [id, navigate, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
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

    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    try {
      setSubmitting(true);
      if (id) {
        // Edit mode: PATCH request
        await axios.patch(
          `${BASE_URL}/groups/${id}`,
          {
            name: formData.name,
            group_creater: Number(formData.group_creater),
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setSuccess('Group updated successfully!');
      } else {
        // Create mode: POST request
        await axios.post(
          `${BASE_URL}/groups/`,
          {
            name: formData.name,
            group_creater: Number(formData.group_creater),
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setSuccess('Group created successfully!');
      }
      setFormData({ name: '', group_creater: '' });
      setTimeout(() => navigate('/groups'), 2000); // Redirect to group list
    } catch (err) {
      console.error('Error saving group:', err);
      if (err.response?.status === 401) {
        setError('Unauthorized: Please log in again.');
        localStorage.removeItem('accessToken');
        navigate('/auth-login');
      } else if (err.response?.status === 422) {
        setError(err.response.data.detail?.map((e) => e.msg).join(', ') || 'Invalid input.');
      } else {
        setError(err.response?.data?.detail || 'Failed to save group.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setFormData({ name: '', group_creater: '' });
    setError(null);
    setSuccess(null);
  };

  if (loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p>Loading group...</p>
      </Container>
    );
  }

  return (
    <Container className="my-5">
      <Row>
        <Col>
          <h5 className="mb-3">{id ? `Edit Group #${id}` : 'Create New Group'}</h5>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <span className="text-muted d-block mb-3">Group Details</span>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}
              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col sm="6">
                    <Form.Group className="mb-3" controlId="groupName">
                      <Form.Label>Group Name</Form.Label>
                      <div className="position-relative">
                        <i className="bi bi-people position-absolute" style={{ top: '12px', left: '12px', fontSize: '1.2rem' }} />
                        <Form.Control
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Enter group name"
                          required
                          disabled={submitting}
                          className="ps-5"
                          style={{ paddingLeft: '38px' }}
                        />
                      </div>
                    </Form.Group>
                  </Col>
                  <Col sm="6">
                    <Form.Group className="mb-3" controlId="groupCreator">
                      <Form.Label>Creator ID</Form.Label>
                      <div className="position-relative">
                        <i className="bi bi-person position-absolute" style={{ top: '12px', left: '12px', fontSize: '1.2rem' }} />
                        <Form.Control
                          type="number"
                          name="group_creater"
                          value={formData.group_creater}
                          onChange={handleChange}
                          placeholder="Enter creator ID"
                          required
                          disabled={submitting}
                          className="ps-5"
                          style={{ paddingLeft: '38px' }}
                        />
                      </div>
                    </Form.Group>
                  </Col>
                  <Col sm="12">
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={submitting}
                      className="me-2"
                    >
                      {submitting ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          {id ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (
                        id ? 'Update Group' : 'Create Group'
                      )}
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={handleClear}
                      disabled={submitting}
                    >
                      Clear
                    </Button>
                    <Button
                      variant="outline-secondary"
                      type="button"
                      onClick={() => navigate('/groups')}
                      disabled={submitting}
                      className="ms-2"
                    >
                      Cancel
                    </Button>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default GroupCreateEditPage;