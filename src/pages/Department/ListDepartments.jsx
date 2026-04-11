import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Table, Spinner, Alert, Modal, Card, Form } from 'react-bootstrap';
import axios from 'axios';
import { debounce } from 'lodash'; // Ensure lodash is installed: npm install lodash
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { fetchSiteName } from '../../Services/MultipleCallingApi';
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ListDepartments = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, departmentId: null, departmentName: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10); // Adjust limit as needed
  const [siteNames, setSiteNames] = useState({});
  const token = localStorage.getItem('accessToken');
  // Debounced search
  const debouncedSetSearchTerm = useCallback(
    debounce((value) => setSearchTerm(value), 300),
    []
  );

  const handleSearchChange = (e) => {
    debouncedSetSearchTerm(e.target.value);
  };

  useEffect(() => {
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    const fetchDepartments = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${BASE_URL}/departments/?skip=${(page - 1) * limit}&limit=${limit}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        const deptData = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data.records)
            ? response.data.records
            : Array.isArray(response.data.data)
              ? response.data.data
              : [];

       const siteNamePromises = deptData.map(async (dept) => {
          if (dept.site_id) {
            const siteName = await fetchSiteName(dept.site_id, token);
            return { [dept.site_id]: siteName };
          }
          return null;
        });

        const siteNameResults = await Promise.all(siteNamePromises);
        const siteNamesMap = siteNameResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        setSiteNames(siteNamesMap);
        setDepartments(deptData);
        setError(null);
      } catch (err) {
        console.error('Error fetching departments:', err);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in again.');
          localStorage.removeItem('accessToken');
          navigate('/auth-login');
        } else {
          setError(err.response?.data?.detail || 'Failed to load departments.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, [navigate, token, page]);

  const filteredDepartments = departments.filter(dept =>
    dept.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.id?.toString().includes(searchTerm) ||
    dept.site_id?.toString().includes(searchTerm) ||
    (dept.manager &&
      dept.manager.first_name &&
      dept.manager.last_name &&
      `${dept.manager.first_name} ${dept.manager.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateDepartment = () => navigate('/create-department');

  const openDeleteModal = (departmentId, departmentName) => {
    setDeleteModal({ isOpen: true, departmentId, departmentName });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, departmentId: null, departmentName: '' });
  };

  const handleDeleteDepartment = async () => {
    const { departmentId } = deleteModal;
    if (!departmentId || isNaN(departmentId)) {
      setError('Invalid department ID.');
      closeDeleteModal();
      return;
    }

    try {
      await axios.delete(`${BASE_URL}/departments/${departmentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setDepartments(prevDepartments => prevDepartments.filter(dept => dept.id !== departmentId));
      setSuccess('Department deleted successfully!');
      setError(null);
      setTimeout(() => setSuccess(null), 3000); // Clear success message after 3 seconds
    } catch (err) {
      console.error('Failed to delete department:', err);
      setError(err.response?.data?.detail || 'Failed to delete department.');
    } finally {
      closeDeleteModal();
    }
  };

  if (loading) {
    return (
      <Container className="my-5 d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 text-muted">Loading departments...</p>
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
              <h3 className="fw-bold mb-1 mt-2">Department Management</h3>
              <p className="text-muted mb-0">Manage your departments and staff</p>
            </div>
            <Button 
              variant="primary" 
              onClick={handleCreateDepartment}
              className="d-flex align-items-center"
            >
              <i className="bi bi-plus-lg me-2"></i> Create Department
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
                  <h5 className="fw-bold mb-1">All Departments</h5>
                  <small className="text-muted">
                    Showing {filteredDepartments.length} {filteredDepartments.length === 1 ? 'department' : 'departments'}
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
                      placeholder="Search departments..."
                      onChange={handleSearchChange}
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
              {success && (
                <Alert variant="success" className="border-0 bg-success bg-opacity-10">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  {success}
                </Alert>
              )}

              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>ID</th>
                      <th>Department Name</th>
                      <th>Description</th>
                      <th>Site Name</th>
                      <th>Manager</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDepartments.length > 0 ? (
                      filteredDepartments.map((dept) => (
                        <tr key={dept.id}>
                          <td className="fw-semibold">#{dept.id}</td>
                          <td className="fw-medium">{dept.name || 'Unnamed Department'}</td>
                          <td>
                            <small className="text-muted">
                              {dept.description || 'No description available'}
                            </small>
                          </td>
                          <td>{siteNames[dept.site_id] || 'N/A'}</td>
                          <td>
                            {dept.manager && dept.manager.first_name && dept.manager.last_name
                              ? `${dept.manager.first_name} ${dept.manager.last_name}`
                              : 'None'}
                          </td>
                          <td className="text-end">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => navigate(`/view-department/${dept.id}`)}
                              className="me-2"
                              title="View Department"
                            >
                              <i className="bi bi-eye me-1"></i> View
                            </Button>
                            <Button
                              variant="outline-info"
                              size="sm"
                              onClick={() => navigate(`/departments/${dept.id}/stats`)}
                              className="me-2"
                              title="View Statistics"
                            >
                              <i className="bi bi-bar-chart me-1"></i> Stats
                            </Button>
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => navigate(`/update-department/${dept.id}`)}
                              className="me-2"
                              title="Edit Department"
                            >
                              <i className="bi bi-pencil me-1"></i> Edit
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => openDeleteModal(dept.id, dept.name)}
                              title="Delete Department"
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
                            <i className="bi bi-building text-muted fs-1"></i>
                            <p className="mt-2 text-muted">No departments found</p>
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
                                onClick={handleCreateDepartment}
                              >
                                <i className="bi bi-plus-lg me-1"></i> Create Department
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {filteredDepartments.length > 0 && (
                <div className="d-flex justify-content-end mt-3">
                  {/* <Button
                    variant="outline-primary"
                    disabled={page === 1}
                    onClick={() => setPage(prev => prev - 1)}
                    className="me-2"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline-primary"
                    disabled={filteredDepartments.length < limit}
                    onClick={() => setPage(prev => prev + 1)}
                  >
                    Next
                  </Button> */}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Delete Confirmation Modal */}
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
              Are you sure you want to delete the department <strong>"{deleteModal.departmentName}"</strong>?<br />
              This action cannot be undone.
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="outline-secondary" onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteDepartment}>
            Delete Department
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ListDepartments;