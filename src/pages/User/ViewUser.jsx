import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Spinner, Alert, Modal, Card, Table, Badge } from 'react-bootstrap';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ViewUser = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, userId: null, userEmail: '' });
  const [deleting, setDeleting] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    if (!userId || isNaN(userId)) {
      setError('Invalid user ID.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch user data
        const userResponse = await axios.get(`${BASE_URL}/users/${userId}`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        setUser(userResponse.data);

        // Fetch roles
        const roleResponse = await axios.get(`${BASE_URL}/roles`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        setRoles(Array.isArray(roleResponse.data) ? roleResponse.data : []);

        // Fetch departments if user is a manager or has assigned departments
        if (userResponse.data.role?.name === 'manager' || userResponse.data.departments?.length > 0) {
          const deptResponse = await axios.get(`${BASE_URL}/departments/`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          });
          setDepartments(Array.isArray(deptResponse.data) ? deptResponse.data : []);
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in again.');
          localStorage.removeItem('accessToken');
          navigate('/auth-login');
        } else if (err.response?.status === 404) {
          setError('User not found.');
        } else if (err.response?.status === 422) {
          setError(err.response.data.detail?.map(e => e.msg).join(', ') || 'Invalid user ID.');
        } else if (err.response?.status === 500) {
          setError('Server error: Please try again later or contact support.');
        } else if (err.code === 'ERR_NETWORK') {
          setError('Network error: Please check your connection.');
        } else {
          setError(err.response?.data?.detail || 'An unexpected error occurred.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, navigate]);

  const handleDelete = async () => {
    const { userId } = deleteModal;
    if (!userId) {
      console.error('Invalid user ID in deleteModal:', userId);
      setError('Invalid user ID.');
      setDeleteModal({ isOpen: false, userId: null, userEmail: '' });
      return;
    }

    setDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(`${BASE_URL}/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      navigate('/list-users', { state: { message: 'User deleted successfully' } });
    } catch (err) {
      console.error('Delete error:', err.response?.data, err.response?.status);
      if (err.response?.status === 401) {
        setError('Unauthorized: Please log in again.');
        localStorage.removeItem('accessToken');
        navigate('/auth-login');
      } else if (err.response?.status === 403) {
        setError('Cannot delete admin user or action forbidden.');
      } else if (err.response?.status === 404) {
        setError('User not found.');
      } else if (err.response?.status === 422) {
        setError(err.response.data.detail?.map(e => e.msg).join(', ') || 'Invalid user ID.');
      } else {
        setError(err.response?.data?.detail || 'Failed to delete user.');
      }
    } finally {
      setDeleting(false);
      setDeleteModal({ isOpen: false, userId: null, userEmail: '' });
    }
  };

  const openDeleteModal = (userId, userEmail) => {

    setDeleteModal({ isOpen: true, userId, userEmail });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, userId: null, userEmail: '' });
  };

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : 'N/A';
  };

  if (loading) {
    return (
      <Container className="my-5 d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 text-muted">Loading user data...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-4">
        <Row className="mb-4">
          <Col>
            <h3 className="fw-bold mb-1 mt-2">View User</h3>
            <p className="text-muted mb-0">User details</p>
          </Col>
        </Row>
        <Row>
          <Col>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                <Alert variant="danger" className="border-0 bg-danger bg-opacity-10">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                </Alert>
                <Button
                  variant="outline-secondary"
                  onClick={() => navigate('/list-users')}
                >
                  <i className="bi bi-arrow-left me-1"></i> Back to Users
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <div className="d-flex justify-content-between align-items-center mt-5">
          <div>
            <h3 className="fw-bold mb-1 mt-2">User Details</h3>
            <p className="text-muted mb-0">View details for {user.first_name} {user.last_name}</p>
          </div>
          <div>
            <Button
              variant="outline-primary"
              className="me-2"
              onClick={() => navigate(`/users/${userId}/edit`)}
              title="Edit User"
            >
              <i className="bi bi-pencil me-1"></i> Edit User
            </Button>
            {user && (
              <Button
                variant="outline-danger"
                className="me-2"
                onClick={() => openDeleteModal(userId, user.email)}
                disabled={deleting}
                title="Delete User"
              >
                <i className="bi bi-trash me-1"></i> Delete User
              </Button>
            )}
            <Button
              variant="outline-secondary"
              onClick={() => navigate('/list-users')}
              title="Back to Users"
            >
              <i className="bi bi-arrow-left me-1"></i> Back to Users
            </Button>
          </div>
        </div>
      </Row>

      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <h5 className="fw-bold mb-3">{user.first_name} {user.last_name}</h5>
              <Row className="gy-4">
                <Col md="4" sm="6">
                  <div className="form-group">
                    <label className="form-label fw-medium">Email</label>
                    <div className="form-control-plaintext">{user.email}</div>
                  </div>
                </Col>
                <Col md="4" sm="6">
                  <div className="form-group">
                    <label className="form-label fw-medium">First Name</label>
                    <div className="form-control-plaintext">{user.first_name || 'N/A'}</div>
                  </div>
                </Col>
                <Col md="4" sm="6">
                  <div className="form-group">
                    <label className="form-label fw-medium">Last Name</label>
                    <div className="form-control-plaintext">{user.last_name || 'N/A'}</div>
                  </div>
                </Col>
                <Col md="4" sm="6">
                  <div className="form-group">
                    <label className="form-label fw-medium">Phone</label>
                    <div className="form-control-plaintext">{user.phone_number || 'N/A'}</div>
                  </div>
                </Col>
                <Col md="4" sm="6">
                  <div className="form-group">
                    <label className="form-label fw-medium">Role</label>
                    <div className="form-control-plaintext">
                      <Badge bg="info" pill>{getRoleName(user.role_id)}</Badge>
                    </div>
                  </div>
                </Col>
                <Col md="4" sm="6">
                  <div className="form-group">
                    <label className="form-label fw-medium">Status</label>
                    <div className="form-control-plaintext">
                      <Badge bg={user.is_active ? 'success' : 'warning'} pill>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </Col>
                <Col md="4" sm="6">
                  <div className="form-group">
                    <label className="form-label fw-medium">Date Joined</label>
                    <div className="form-control-plaintext">
                      {user.date_joined ? new Date(user.date_joined).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </Col>
                <Col md="4" sm="6">
                  <div className="form-group">
                    <label className="form-label fw-medium">Last Login</label>
                    <div className="form-control-plaintext">
                      {user.last_login ? new Date(user.last_login).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </Col>

                {(user.departments?.length > 0 || departments.length > 0) && (
                  <Col sm="12">
                    <h6 className="fw-bold mt-4 mb-3">Departments</h6>
                    <div className="table-responsive">
                      <Table hover className="mb-0">
                        <thead className="bg-light">
                          <tr>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Site</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(user.departments || departments).map((dept) => (
                            <tr key={dept.id}>
                              <td>{dept.name || 'N/A'}</td>
                              <td>{dept.description || 'N/A'}</td>
                              <td>{dept.site_id || 'None'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </Col>
                )}
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={deleteModal.isOpen} onHide={closeDeleteModal} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-4">
          <div className="d-flex flex-column align-items-center text-center">
            <div className="bg-danger bg-opacity-10 p-3 rounded-circle mb-3">
              <i className="bi bi-exclamation-triangle-fill text-danger fs-4"></i>
            </div>
            <p className="mb-0">
              Are you sure you want to delete the user <strong>"{deleteModal.userEmail}"</strong>?<br />
              This action cannot be undone.
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="outline-secondary" onClick={closeDeleteModal} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Deleting...
              </>
            ) : (
              'Delete User'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ViewUser;