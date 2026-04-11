import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Table, Spinner, Alert, Modal, Card, Badge, Pagination } from 'react-bootstrap';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ListUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, userId: null, userEmail: '' });
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [roles, setRoles] = useState([]);
  const itemsPerPage = 10;



  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await axios.get(`${BASE_URL}/roles/`, {
          headers: {
            'Accept': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        setRoles(response.data);
      } catch (err) {
        console.error('Error fetching roles:', err);
      }
    };
    fetchRoles();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    // console.log(token)
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${BASE_URL}/users/?skip=0&limit=100`, {
          headers: {
            'Accept': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        setUsers(Array.isArray(response.data.records) ? response.data.records : []);
        setError(null);
      } catch (err) {
        console.error('Error fetching users:', err);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in again.');
          localStorage.removeItem('accessToken');
          navigate('/auth-login');
        } else {
          setError(err.response?.data?.detail || 'Failed to load users.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [navigate]);

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.first_name && user.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.last_name && user.last_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.role?.name && user.role.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const handleDelete = async () => {
    const { userId } = deleteModal;
    if (!userId) {
      setError('Invalid user ID.');
      closeDeleteModal();
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
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      setError(null);
    } catch (err) {
      console.error('Error deleting user:', err);
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
      closeDeleteModal();
    }
  };

  const openDeleteModal = (userId, userEmail) => {
    setDeleteModal({ isOpen: true, userId, userEmail });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, userId: null, userEmail: '' });
  };

  const handleCreateUser = () => navigate('/create-user');
  const handleViewUser = (userId) => navigate(`/users/${userId}`);
  const handleEditUser = (userId) => navigate(`/users/${userId}/edit`);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  if (loading) {
    return (
      <Container className="my-5 d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 text-muted">Loading users...</p>
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
              <h3 className="fw-bold mb-1 mt-2">User Management</h3>
              <p className="text-muted mb-0">View and manage all your users</p>
            </div>
            <Button
              variant="primary"
              onClick={handleCreateUser}
              className="d-flex align-items-center"
            >
              <i className="bi bi-plus-lg me-2"></i> Add New User
            </Button>
          </div>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h5 className="fw-bold mb-1">All Users</h5>
                  <small className="text-muted">
                    Showing {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
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
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="danger" className="border-0 bg-danger bg-opacity-10">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                </Alert>
              )}

              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>ID</th>
                      <th>Email</th>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.length > 0 ? (
                      currentItems.map((user) => (
                        <tr key={user.id}>
                          <td className="fw-semibold">#{user.id}</td>
                          <td>{user.email}</td>
                          <td>{user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'N/A'}</td>
                          <td>
                            <Badge bg="info" pill>
                              {roles.find(r => r.id === user.role_id)?.name || 'N/A'}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg={user.is_active ? "success" : "warning"} pill>
                              {user.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="text-end">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleViewUser(user.id)}
                              className="me-2"
                              title="View User"
                            >
                              <i className="bi bi-eye me-1"></i> View
                            </Button>
                            <Button
                              variant="outline-warning"
                              size="sm"
                              onClick={() => handleEditUser(user.id)}
                              className="me-2"
                              title="Edit User"
                            >
                              <i className="bi bi-pencil me-1"></i> Edit
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => openDeleteModal(user.id, user.email)}
                              disabled={deleting}
                              title="Delete User"
                            >
                              <i className="bi bi-trash me-1"></i> Delete
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-5">
                          <div className="py-3">
                            <i className="bi bi-people text-muted fs-1"></i>
                            <p className="mt-2 text-muted">No users found</p>
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
                                onClick={handleCreateUser}
                              >
                                <i className="bi bi-plus-lg me-1"></i> Create User
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-4">
                  <Pagination>
                    <Pagination.Prev
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    />
                    {Array.from({ length: totalPages }, (_, i) => (
                      <Pagination.Item
                        key={i + 1}
                        active={i + 1 === currentPage}
                        onClick={() => handlePageChange(i + 1)}
                      >
                        {i + 1}
                      </Pagination.Item>
                    ))}
                    <Pagination.Next
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    />
                  </Pagination>
                </div>
              )}
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

export default ListUsers;