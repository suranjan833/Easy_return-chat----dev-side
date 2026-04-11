import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Button,
  Spinner,
  Alert,
  Card,
  CardBody,
  InputGroup,
  InputGroupText,
  Input,
  Form,
  FormGroup,
  FormFeedback,
  Table,
  Badge,
  Pagination,
  PaginationItem,
  PaginationLink,
} from 'reactstrap';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Content from '@/layout/content/Content';
import Head from '@/layout/head/Head';
const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const CreateRole = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [formErrors, setFormErrors] = useState({
    name: '',
    description: '',
  });
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
        const response = await axios.get(`${BASE_URL}/roles/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setRoles(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching roles:', err);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in again.');
          localStorage.removeItem('accessToken');
          navigate('/auth-login');
        } else {
          setError('Failed to load roles. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [navigate, token]);

  // Filter roles for pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRoles = roles.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(roles.length / itemsPerPage);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    // Clear error for the field
    setFormErrors({
      ...formErrors,
      [name]: '',
    });
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Role name is required.';
    }
    if (!formData.description.trim()) {
      errors.description = 'Description is required.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      return;
    }

    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    try {
      setSubmitting(true);
      const response = await axios.post(
        `${BASE_URL}/roles/create`,
        {
          name: formData.name,
          description: formData.description,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );


      setSuccess('Role created successfully!');
      setFormData({ name: '', description: '' });
      setFormErrors({ name: '', description: '' });
      // Refresh roles list
      const rolesResponse = await axios.get(`${BASE_URL}/roles/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRoles(rolesResponse.data);
      setCurrentPage(1); // Reset to first page
    } catch (err) {
      console.error('Error creating role:', err);
      if (err.response?.status === 401) {
        setError('Unauthorized: Please log in again.');
        localStorage.removeItem('accessToken');
        navigate('/auth-login');
      } else if (err.response?.status === 422) {
        const validationErrors = err.response.data.detail?.map((error) => error.msg).join(', ');
        setError(`Validation Error: ${validationErrors || 'Please check the input fields.'}`);
      } else {
        setError(err.response?.data?.detail || 'An error occurred while creating the role.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewRole = (roleId) => {
    navigate(`/roles/${roleId}`);
  };

  if (loading) {
    return (
      <Content>
        <Head title="Create Role" />
        <Container
          className="my-5 d-flex justify-content-center align-items-center"
          style={{ minHeight: '60vh' }}
        >
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
      <Head title="Create Role" />
      <Container className="py-4">
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center ">
              <div>
                <h3 className="fw-bold mb-1">Create Role</h3>
                <p className="text-muted mb-0">Add a new role to the system</p>
              </div>
              <Button
                color="outline-primary"
                onClick={() => navigate('/list-roles')}
                className="d-flex align-items-center"
              >
                <i className="bi bi-arrow-left me-2"></i> Back to Role List
              </Button>
            </div>
          </Col>
        </Row>

        <Row>
          <Col>
            <Card className="border-0 shadow-sm">
              <CardBody className="p-4">
                <h5 className="fw-bold mb-3">Role Details</h5>
                {error && (
                  <Alert color="danger" className="border-0 bg-danger bg-opacity-10">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {error}
                  </Alert>
                )}
                {success && (
                  <Alert color="success" className="border-0 bg-success bg-opacity-10">
                    <i className="bi bi-check-circle-fill me-2"></i>
                    {success}
                  </Alert>
                )}
                <Form onSubmit={handleSubmit}>
                  <Row className="gy-4">
                    <Col md="6">
                      <FormGroup>
                        <label htmlFor="name" className="form-label">
                          Role Name
                        </label>
                        <InputGroup>
                          <InputGroupText className="bg-light border-end-0">
                            <i className="bi bi-shield text-muted"></i>
                          </InputGroupText>
                          <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter role name"
                            type="text"
                            invalid={!!formErrors.name}
                            disabled={submitting}
                            className="border-start-0"
                          />
                          <FormFeedback>{formErrors.name}</FormFeedback>
                        </InputGroup>
                      </FormGroup>
                    </Col>
                    <Col md="6">
                      <FormGroup>
                        <label htmlFor="description" className="form-label">
                          Description
                        </label>
                        <InputGroup>
                          <InputGroupText className="bg-light border-end-0">
                            <i className="bi bi-file-text text-muted"></i>
                          </InputGroupText>
                          <Input
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Enter role description"
                            type="textarea"
                            invalid={!!formErrors.description}
                            disabled={submitting}
                            className="border-start-0"
                          />
                          <FormFeedback>{formErrors.description}</FormFeedback>
                        </InputGroup>
                      </FormGroup>
                    </Col>
                    <Col sm="12"  className='d-flex'>
                      <Button
                        color="primary"
                        type="submit"
                        disabled={submitting}
                        className="me-2 d-flex align-items-center"
                      >
                        {submitting ? (
                          <Spinner size="sm" className="me-2" />
                        ) : (
                          <i className="bi bi-plus me-2"></i>
                        )}
                        Create Role
                      </Button>
                      <Button
                        color="outline-primary"
                        type="button"
                        onClick={() => {
                          setFormData({ name: '', description: '' });
                          setFormErrors({ name: '', description: '' });
                        }}
                        disabled={submitting}
                        className="d-flex align-items-center"
                      >
                        <i className="bi bi-x me-2"></i> Clear
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </CardBody>
            </Card>
          </Col>
        </Row>

        <Row className="mt-4">
          <Col>
            <Card className="border-0 shadow-sm">
              <CardBody className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h5 className="fw-bold mb-1">Existing Roles</h5>
                    <small className="text-muted">
                      Showing {roles.length} {roles.length === 1 ? 'role' : 'roles'}
                    </small>
                  </div>
                </div>
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
                      {roles.length > 0 ? (
                        currentRoles.map((role) => (
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
                                color="primary"
                                size="sm"
                                onClick={() => handleViewRole(role.id)}
                                title="View Role"
                                aria-label={`View role ${role.name}`}
                                className="d-flex align-items-center"
                              >
                                <i className="bi bi-eye me-1"></i> View
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="text-center py-5">
                            <div className="py-3">
                              <i className="bi bi-shield text-muted fs-1"></i>
                              <p className="mt-2 text-muted">No roles found</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
                {roles.length > itemsPerPage && (
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
      </Container>
    </Content>
  );
};

export default CreateRole;