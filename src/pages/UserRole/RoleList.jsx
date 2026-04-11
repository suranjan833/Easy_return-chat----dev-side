import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Button,
  Table,
  Spinner,
  Alert,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Card,
  CardBody,
  Badge,
  Pagination,
  PaginationItem,
  PaginationLink,
  InputGroup,
  InputGroupText,
  Input,
} from 'reactstrap';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Content from '@/layout/content/Content';
import Head from '@/layout/head/Head';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const RoleList = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, roleId: null, roleName: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const token = localStorage.getItem('accessToken');

  // Fetch roles on mount
  useEffect(() => {
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    const fetchRoles = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${BASE_URL}/roles/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        setRoles(Array.isArray(response.data) ? response.data : []);
        setError(null);
      } catch (err) {
        console.error('Error fetching roles:', err);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in again.');
          localStorage.removeItem('accessToken');
          navigate('/auth-login');
        } else {
          setError(err.response?.data?.detail || 'Failed to load roles.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [navigate, token]);

  // Filter roles based on search term
  const filteredRoles = roles.filter(
    (role) =>
      searchTerm === '' ||
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRoles.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);

  const handleCreateRole = () => {
    navigate('/roles/create');
  };

  const handleViewRole = (roleId) => {
    navigate(`/roles/${roleId}`);
  };

  const handleEditRole = (roleId) => {
    navigate(`/edit-role/${roleId}`);
  };

  const openDeleteModal = (roleId, roleName) => {
    setDeleteModal({ isOpen: true, roleId, roleName });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, roleId: null, roleName: '' });
  };

  const handleDeleteRole = async () => {
    if (!deleteModal.roleId) {
      setError('Invalid role ID.');
      closeDeleteModal();
      return;
    }

    setDeleting(true);
    try {
      await axios.delete(`${BASE_URL}/roles/${deleteModal.roleId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      setRoles(roles.filter((role) => role.id !== deleteModal.roleId));
      setError(null);
    } catch (err) {
      console.error('Error deleting role:', err);
      if (err.response?.status === 401) {
        setError('Unauthorized: Please log in again.');
        localStorage.removeItem('accessToken');
        navigate('/auth-login');
      } else if (err.response?.status === 404) {
        setError('Role not found.');
      } else if (err.response?.status === 422) {
        setError(err.response.data.detail?.map((e) => e.msg).join(', ') || 'Invalid role ID.');
      } else {
        setError(err.response?.data?.detail || 'Failed to delete role.');
      }
    } finally {
      setDeleting(false);
      closeDeleteModal();
    }
  };

  if (loading) {
    return (
      <Content>
        <Head title="Role List" />
        <Container className="my-5 d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
          <div className="text-center">
            <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
            <p className="mt-3 text-muted">Loading roles...</p>
          </div>
        </Container>
      </Content>
    );
  }

  return (
    <Content>
      <Head title="Role List" />
      <Container className="py-4">
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h3 className="fw-bold mb-1">Role Management</h3>
                <p className="text-muted mb-0">View and manage all your roles</p>
              </div>
              <Button
                color="primary"
                onClick={handleCreateRole}
                className="d-flex align-items-center"
              >
                <i className="bi bi-plus-lg me-2"></i> Add New Role
              </Button>
            </div>
          </Col>
        </Row>

        <Row>
          <Col>
            <Card className="border-0 shadow-sm">
              <CardBody className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div>
                    <h5 className="fw-bold mb-1">All Roles</h5>
                    <small className="text-muted">
                      Showing {filteredRoles.length} {filteredRoles.length === 1 ? 'role' : 'roles'}
                    </small>
                  </div>
                  <div className="w-25">
                    <InputGroup>
                      <InputGroupText className="bg-light border-end-0">
                        <i className="bi bi-search text-muted"></i>
                      </InputGroupText>
                      <Input
                        type="text"
                        className="border-start-0"
                        placeholder="Search roles..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </InputGroup>
                  </div>
                </div>

                {error && (
                  <Alert color="danger" className="border-0 bg-danger bg-opacity-10">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {error}
                  </Alert>
                )}

                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.length > 0 ? (
                        currentItems.map((role) => (
                          <tr key={role.id}>
                            <td className="fw-semibold">#{role.id}</td>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="bg-primary bg-opacity-10 p-2 rounded me-3">
                                  <i className="bi bi-shield text-primary"></i>
                                </div>
                                <span className="fw-medium">{role.name}</span>
                              </div>
                            </td>
                            <td>{role.description || 'N/A'}</td>
                            <td>
                              <Badge color="success" pill>
                                Active
                              </Badge>
                            </td>
                            <td className="text-end">
                              <Button
                                color="outline-primary"
                                size="sm"
                                onClick={() => handleViewRole(role.id)}
                                className="me-2"
                                title="View Role"
                              >
                                <i className="bi bi-eye me-1"></i> View
                              </Button>
                              <Button
                                color="outline-warning"
                                size="sm"
                                onClick={() => handleEditRole(role.id)}
                                className="me-2"
                                title="Edit Role"
                              >
                                <i className="bi bi-pencil me-1"></i> Edit
                              </Button>
                              <Button
                                color="outline-danger"
                                size="sm"
                                onClick={() => openDeleteModal(role.id, role.name)}
                                disabled={deleting}
                                title="Delete Role"
                              >
                                <i className="bi bi-trash me-1"></i> Delete
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="text-center py-5">
                            <div className="py-3">
                              <i className="bi bi-people text-muted fs-1"></i>
                              <p className="mt-2 text-muted">No roles found</p>
                              {searchTerm ? (
                                <Button
                                  color="outline-primary"
                                  size="sm"
                                  className="mt-2"
                                  onClick={() => setSearchTerm('')}
                                >
                                  Clear search
                                </Button>
                              ) : (
                                <Button
                                  color="primary"
                                  size="sm"
                                  className="mt-2"
                                  onClick={handleCreateRole}
                                >
                                  <i className="bi bi-plus-lg me-1"></i> Add New Role
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>

                {filteredRoles.length > itemsPerPage && (
                  <div className="d-flex justify-content-center mt-4">
                    <Pagination>
                      <PaginationItem disabled={currentPage === 1}>
                        <PaginationLink
                          previous
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <PaginationItem key={i + 1} active={i + 1 === currentPage}>
                          <PaginationLink onClick={() => setCurrentPage(i + 1)}>
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem disabled={currentPage === totalPages}>
                        <PaginationLink
                          next
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        />
                      </PaginationItem>
                    </Pagination>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={deleteModal.isOpen} toggle={closeDeleteModal} centered>
          <ModalHeader toggle={closeDeleteModal} className="border-0">
            Confirm Delete
          </ModalHeader>
          <ModalBody className="py-4">
            <div className="d-flex flex-column align-items-center text-center">
              <div className="bg-danger bg-opacity-10 p-3 rounded-circle mb-3">
                <i className="bi bi-exclamation-triangle-fill text-danger fs-4"></i>
              </div>
              <p className="mb-0">
                Are you sure you want to delete the role <strong>"{deleteModal.roleName}"</strong>?<br />
                This action cannot be undone.
              </p>
            </div>
          </ModalBody>
          <ModalFooter className="border-0">
            <Button color="outline-secondary" onClick={closeDeleteModal} disabled={deleting}>
              Cancel
            </Button>
            <Button color="danger" onClick={handleDeleteRole} disabled={deleting}>
              {deleting ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Deleting...
                </>
              ) : (
                'Delete Role'
              )}
            </Button>
          </ModalFooter>
        </Modal>
      </Container>
    </Content>
  );
};

export default RoleList;