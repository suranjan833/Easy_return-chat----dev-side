import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Container, Row, Col, Card, Table, Button, Spinner, Alert, Form } from 'react-bootstrap';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://chatsupport.fskindia.com";

const RemoveMembersPage = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const [members, setMembers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const token = localStorage.getItem('accessToken');

  const handleApiError = (err, navigate) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('accessToken');
      navigate('/auth-login');
      return 'Session expired. Please log in again.';
    }
    if (err.response?.status === 422) {
      const details = err.response.data.detail;
      if (Array.isArray(details)) {
        return details.map(e => e.msg).join(', ');
      }
      return 'Invalid input.';
    }
    return err.response?.data?.detail || err.message || 'An unexpected error occurred.';
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/groups/${groupId}/members`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (!Array.isArray(response.data)) {
        setMembers([]);
        setError('Unexpected response format.');
        return;
      }
      setMembers(response.data);
      setError(null);
    } catch (err) {
      setError(handleApiError(err, navigate));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }
    if (isNaN(groupId)) {
      setError('Invalid group ID.');
      setLoading(false);
      return;
    }

    fetchMembers();
  }, [navigate, token, groupId]);

  const handleSelectUser = useCallback((userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
    setError(null);
    setSuccess(null);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) {
      setError('Please select at least one member to remove.');
      return;
    }

    try {
      setSubmitting(true);
      await axios.delete(`${BASE_URL}/groups/remove_members`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        data: {
          group_id: Number(groupId),
          user_ids: selectedUserIds,
        },
      });
      setSuccess('Members removed successfully!');
      setSelectedUserIds([]);
      fetchMembers(); // Refresh members list
      setTimeout(() => setSuccess(null), 5000); // Clear success message after 5 seconds
    } catch (err) {
      setError(handleApiError(err, navigate));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate(`/groups/${groupId}/members`);
  };

  const handleBackToGroups = () => {
    navigate('/app-group-chat');
  };

  if (loading) {
    return (
      <Container className="my-5">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p>Loading members...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="px-lg-5 px-md-3 my-5">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h4 className="fw-bold text-primary mb-0">Remove Members</h4>
              <p className="text-muted">Remove members from Group ID: {groupId}</p>
            </div>
            <Button
              variant="outline-secondary"
              onClick={handleBack}
            >
              <i className="bi bi-arrow-left me-1"></i> Back to Members
            </Button>
          </div>

          <Card className="border-0 shadow-sm">
            <Card.Body>
              <span className="text-muted d-block mb-3">Group Members</span>
              {error && (
                <Alert variant="danger" className="border-0 bg-danger bg-opacity-10">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert variant="success" className="border-0 bg-success bg-opacity-10">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  {success}
                </Alert>
              )}
              <Form onSubmit={handleSubmit}>
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th>Select</th>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.length > 0 ? (
                        members.map((member) => (
                          <tr key={member.id}>
                            <td>
                              <Form.Check
                                type="checkbox"
                                checked={selectedUserIds.includes(member.id)}
                                onChange={() => handleSelectUser(member.id)}
                                disabled={submitting}
                                aria-label={`Select ${member.first_name} ${member.last_name}`}
                              />
                            </td>
                            <td>#{member.id}</td>
                            <td>
                              {member.first_name} {member.last_name}
                            </td>
                            <td>{member.email}</td>
                            <td>{member.role?.name || 'N/A'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="text-center py-4">
                            <div className="py-3">
                              <i className="bi bi-people text-muted fs-1"></i>
                              <p className="mt-2 text-muted">No members in this group.</p>
                              <div className="d-flex justify-content-center gap-2">
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => navigate(`/groups/${groupId}/add-members`)}
                                >
                                  Add Members
                                </Button>
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  onClick={handleBackToGroups}
                                >
                                  Back to Groups
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
                {members.length > 0 && (
                  <div className="d-flex justify-content-end mt-3">
                    <Button
                      variant="danger"
                      type="submit"
                      disabled={submitting || selectedUserIds.length === 0}
                      className="d-flex align-items-center"
                    >
                      {submitting ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Removing...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-person-dash me-1"></i> Remove Selected Members
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default RemoveMembersPage;