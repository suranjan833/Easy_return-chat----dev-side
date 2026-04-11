import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container, Row, Col, Button, Spinner, Alert, Card, CardBody,
  InputGroup, InputGroupText, Input, Form, FormGroup, FormFeedback, Table, Badge,
} from 'reactstrap';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Content from '@/layout/content/Content';
import Head from '@/layout/head/Head';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const CreateDepartment = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    site_id: null,
    manager_id: null,
  });
  const [formErrors, setFormErrors] = useState({ name: '' });
  const [managers, setManagers] = useState([]);
  const [sites, setSites] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingManagers, setLoadingManagers] = useState(true);
  const [loadingSites, setLoadingSites] = useState(true);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    const fetchData = async () => {
      try {
        setLoadingDepartments(true);
        const deptResponse = await axios.get(`${BASE_URL}/departments/`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        });
        const deptData = Array.isArray(deptResponse.data)
          ? deptResponse.data
          : deptResponse.data.records || deptResponse.data.data || [];

        setDepartments(deptData);

        setLoadingManagers(true);
        const managersResponse = await axios.get(`${BASE_URL}/users/managers`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        });
        const managersData = Array.isArray(managersResponse.data)
          ? managersResponse.data
          : managersResponse.data.records || managersResponse.data.data || [];

        setManagers(managersData);

        setLoadingSites(true);
        const sitesResponse = await axios.get(`${BASE_URL}/sites/?skip=0&limit=100`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        });
        const sitesData = Array.isArray(sitesResponse.data)
          ? sitesResponse.data
          : sitesResponse.data.records || sitesResponse.data.data || [];

        setSites(sitesData);
      } catch (err) {
        console.error('Error fetching data:', err.response?.data);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in again.');
          localStorage.removeItem('accessToken');
          navigate('/auth-login');
        } else {
          setError(err.response?.data?.message || 'Failed to load required data.');
        }
      } finally {
        setLoadingManagers(false);
        setLoadingSites(false);
        setLoadingDepartments(false);
      }
    };

    fetchData();
  }, [navigate, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const finalValue = (name === 'site_id' || name === 'manager_id') && value === '' ? null : value;

    setFormData({ ...formData, [name]: finalValue });
    setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Department name is required.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      setLoading(false);
      return;
    }

    const requestBody = {
      name: formData.name,
      description: formData.description,
      site_id: formData.site_id ? parseInt(formData.site_id) : null,
      manager_id: formData.manager_id ? parseInt(formData.manager_id) : null,
    };


    try {
      const response = await axios.post(
        `${BASE_URL}/departments/create`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSuccess('Department created successfully!');
      setDepartments((prev) => [...prev, response.data]); // Append new department
      setFormData({ name: '', description: '', site_id: null, manager_id: null });
    } catch (err) {
      console.error('Error creating department:', err.response?.data);
      if (err.response?.status === 401) {
        setError('Unauthorized: Please log in again.');
        localStorage.removeItem('accessToken');
        navigate('/auth-login');
      } else if (err.response?.status === 422) {
        const errors = err.response.data.detail?.map((e) => e.msg).join(', ') || 'Invalid input.';
        setError(`Validation Error: ${errors}`);
      } else {
        setError(err.response?.data?.message || 'An error occurred while creating the department.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getManagerName = (managerId) => {
    const manager = managers.find((m) => m.id === managerId);
    return manager ? `${manager.first_name} ${manager.last_name}` : 'Not assigned';
  };

  const getSiteName = (siteId) => {
    const site = sites.find((s) => s.id === siteId);
    return site ? site.name || site.domain || `Site ${site.id}` : 'Not assigned';
  };

  return (
    <Content>
      <Head title="Create Department" />
      <Container className="py-4">
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h3 className="fw-bold mb-1">Department Management</h3>
                <p className="text-muted mb-0">Create and manage departments</p>
              </div>
              <Button
                color="outline-primary"
                onClick={() => navigate('/list-departments')}
                className="d-flex align-items-center"
              >
                <i className="bi bi-arrow-left me-2"></i> Back to Department List
              </Button>
            </div>
          </Col>
        </Row>

        <Row className="mb-4">
          <Col>
            <Card className="border-0 shadow-sm">
              <CardBody className="p-4">
                <h5 className="fw-bold mb-3">Create New Department</h5>
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
                {(loadingManagers || loadingSites) ? (
                  <div className="text-center py-5">
                    <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
                    <p className="mt-3 text-muted">Loading required data...</p>
                  </div>
                ) : (
                  <Form onSubmit={handleSubmit}>
                    <Row className="gy-4">
                      <Col md="6">
                        <FormGroup>
                          <label htmlFor="name" className="form-label">
                            Department Name *
                          </label>
                          <InputGroup>
                            <InputGroupText className="bg-light border-end-0">
                              <i className="bi bi-briefcase text-muted"></i>
                            </InputGroupText>
                            <Input
                              id="name"
                              name="name"
                              value={formData.name}
                              onChange={handleChange}
                              placeholder="Enter department name"
                              type="text"
                              invalid={!!formErrors.name}
                              disabled={loading}
                              className="border-start-0"
                            />
                            <FormFeedback>{formErrors.name}</FormFeedback>
                          </InputGroup>
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <label htmlFor="manager_id" className="form-label">
                            Department Head
                          </label>
                          <InputGroup>
                            <InputGroupText className="bg-light border-end-0">
                              <i className="bi bi-person text-muted"></i>
                            </InputGroupText>
                            <Input
                              type="select"
                              id="manager_id"
                              name="manager_id"
                              value={formData.manager_id || ''}
                              onChange={handleChange}
                              disabled={loading || managers.length === 0}
                              className="border-start-0"
                            >
                              <option value="">Select Department Head</option>
                              {managers.map((manager) => (
                                <option key={manager.id} value={manager.id}>
                                  {manager.first_name} {manager.last_name}
                                </option>
                              ))}
                            </Input>
                          </InputGroup>
                          {managers.length === 0 && (
                            <small className="text-muted">
                              No managers available. Please create managers first.
                            </small>
                          )}
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <label htmlFor="site_id" className="form-label">
                            Associated Site
                          </label>
                          <InputGroup>
                            <InputGroupText className="bg-light border-end-0">
                              <i className="bi bi-globe text-muted"></i>
                            </InputGroupText>
                            <Input
                              type="select"
                              id="site_id"
                              name="site_id"
                              value={formData.site_id || ''}
                              onChange={handleChange}
                              disabled={loading || sites.length === 0}
                              className="border-start-0"
                            >
                              <option value="">Select Site</option>
                              {sites.map((site) => (
                                <option key={site.id} value={site.id}>
                                  {site.name || site.domain || `Site ${site.id}`}
                                </option>
                              ))}
                            </Input>
                          </InputGroup>
                          {sites.length === 0 && (
                            <small className="text-muted">
                              No sites available. <Link to="/create-site">Create a site</Link> first.
                            </small>
                          )}
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
                              placeholder="Enter department description"
                              type="textarea"
                              disabled={loading}
                              className="border-start-0"
                              rows="3"
                            />
                          </InputGroup>
                        </FormGroup>
                      </Col>
                      <Col sm="12" className="d-flex">
                        <Button
                          color="primary"
                          type="submit"
                          disabled={loading}
                          className="me-2 d-flex align-items-center"
                        >
                          {loading ? (
                            <Spinner size="sm" className="me-2" />
                          ) : (
                            <i className="bi bi-plus me-2"></i>
                          )}
                          Create Department
                        </Button>
                        <Button
                          color="outline-primary"
                          type="button"
                          onClick={() => navigate('/list-departments')}
                          disabled={loading}
                          className="d-flex align-items-center"
                        >
                          <i className="bi bi-x me-2"></i> Cancel
                        </Button>
                      </Col>
                    </Row>
                  </Form>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>

        <Row>
          <Col>
            <Card className="border-0 shadow-sm">
              <CardBody className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="fw-bold mb-0">Existing Departments</h5>
                  <Button
                    color="primary"
                    size="sm"
                    onClick={() => window.location.reload()}
                    disabled={loadingDepartments}
                  >
                    <i className="bi bi-arrow-clockwise me-1"></i> Refresh
                  </Button>
                </div>
                {loadingDepartments ? (
                  <div className="text-center py-5">
                    <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
                    <p className="mt-3 text-muted">Loading departments...</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table hover>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Manager</th>
                          <th>Site</th>
                          <th>Description</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {departments.length > 0 ? (
                          departments.map((dept) => (
                            <tr key={dept.id}>
                              <td>{dept.id}</td>
                              <td>
                                <Link to={`/departments/${dept.id}`} className="text-primary">
                                  {dept.name}
                                </Link>
                              </td>
                              <td>{getManagerName(dept.manager_id)}</td>
                              <td>{getSiteName(dept.site_id)}</td>
                              <td>{dept.description || '-'}</td>
                              <td>
                                <Badge color={dept.is_active ? 'success' : 'secondary'}>
                                  {dept.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="text-center py-5">
                              <i className="bi bi-building text-muted fs-1"></i>
                              <p className="mt-2 text-muted">No departments found</p>
                              <Button
                                color="primary"
                                size="sm"
                                onClick={() => window.location.reload()}
                              >
                                <i className="bi bi-arrow-clockwise me-1"></i> Refresh
                              </Button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
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

export default CreateDepartment;