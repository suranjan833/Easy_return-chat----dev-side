import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
} from 'reactstrap';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Content from '@/layout/content/Content';
import Head from '@/layout/head/Head';
const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const UpdateDepartment = () => {
  const { departmentId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    site_id: '',
    manager_id: '',
  });
  const [formErrors, setFormErrors] = useState({
    name: '',
  });
  const [managers, setManagers] = useState([]);
  const [sites, setSites] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingManagers, setLoadingManagers] = useState(true);
  const [loadingSites, setLoadingSites] = useState(true);
  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    if (!departmentId || isNaN(departmentId)) {
      setError('Invalid department ID.');
      setLoading(false);
      navigate('/list-departments');
      return;
    }

    const fetchDepartment = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/departments/${departmentId}`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        setFormData({
          name: response.data.name || '',
          description: response.data.description || '',
          site_id: response.data.site_id?.toString() || '',
          manager_id: response.data.manager_id?.toString() || '',
        });
        setError(null);
      } catch (err) {
        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in again.');
          localStorage.removeItem('accessToken');
          navigate('/auth-login');
        } else {
          const errorMsg = err.response?.data?.detail
            ? Array.isArray(err.response.data.detail)
              ? err.response.data.detail.map((e) => e.msg).join(', ')
              : err.response.data.detail
            : 'Failed to load department data.';
          setError(errorMsg);
        }
      } finally {
        setLoading(false);
      }
    };

    const fetchManagers = async () => {
      try {
        setLoadingManagers(true);
        const response = await axios.get(`${BASE_URL}/users/managers`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        setManagers(
          Array.isArray(response.data) 
            ? response.data 
            : Array.isArray(response.data.records) 
              ? response.data.records 
              : []
        );
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load managers.');
      } finally {
        setLoadingManagers(false);
      }
    };

    const fetchSites = async () => {
      try {
        setLoadingSites(true);
        const response = await axios.get(`${BASE_URL}/sites/?skip=0&limit=100`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        setSites(
          Array.isArray(response.data) 
            ? response.data 
            : Array.isArray(response.data.records) 
              ? response.data.records 
              : []
        );
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load sites.');
      } finally {
        setLoadingSites(false);
      }
    };

    fetchDepartment();
    fetchManagers();
    fetchSites();
  }, [departmentId, navigate, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
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

    const payload = {
      name: formData.name,
      description: formData.description,
      site_id: formData.site_id ? parseInt(formData.site_id) : null,
      manager_id: formData.manager_id ? parseInt(formData.manager_id) : null,
    };

    try {
      await axios.put(`${BASE_URL}/departments/${departmentId}`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      setSuccess('Department updated successfully!');
      setTimeout(() => navigate('/list-departments'), 1500); // Navigate after showing success
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Unauthorized: Please log in again.');
        localStorage.removeItem('accessToken');
        navigate('/auth-login');
      } else {
        const errorMsg = err.response?.data?.detail
          ? Array.isArray(err.response.data.detail)
            ? err.response.data.detail.map((e) => e.msg).join(', ')
            : err.response.data.detail
          : 'An error occurred while updating the department.';
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading || loadingManagers || loadingSites) {
    return (
      <Content>
        <Head title="Update Department" />
        <Container
          className="my-5 d-flex justify-content-center align-items-center"
          style={{ minHeight: '60vh' }}
        >
          <div className="text-center">
            <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
            <p className="mt-3 text-muted">Loading department data...</p>
          </div>
        </Container>
      </Content>
    );
  }

  return (
    <Content>
      <Head title="Update Department" />
      <Container className="py-4">
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center mt-5">
              <div>
                <h3 className="fw-bold mb-1 mt-2">Update Department</h3>
                <p className="text-muted mb-0">Modify details for the department</p>
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

        <Row>
          <Col>
            <Card className="border-0 shadow-sm">
              <CardBody className="p-4">
                <h5 className="fw-bold mb-3">Department Details</h5>
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
                          Head of Department
                        </label>
                        <InputGroup>
                          <InputGroupText className="bg-light border-end-0">
                            <i className="bi bi-person text-muted"></i>
                          </InputGroupText>
                          <Input
                            type="select"
                            id="manager_id"
                            name="manager_id"
                            value={formData.manager_id}
                            onChange={handleChange}
                            disabled={loading || managers.length === 0}
                            className="border-start-0"
                          >
                            <option value="">Select Head (Optional)</option>
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
                          Site
                        </label>
                        <InputGroup>
                          <InputGroupText className="bg-light border-end-0">
                            <i className="bi bi-globe text-muted"></i>
                          </InputGroupText>
                          <Input
                            type="select"
                            id="site_id"
                            name="site_id"
                            value={formData.site_id}
                            onChange={handleChange}
                            disabled={loading || sites.length === 0}
                            className="border-start-0"
                          >
                            <option value="">Select Site (Optional)</option>
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
                    <Col sm="12" className='d-flex'>
                      <Button
                        color="primary"
                        type="submit"
                        disabled={loading}
                        className="me-2 d-flex align-items-center"
                      >
                        {loading ? (
                          <Spinner size="sm" className="me-2" />
                        ) : (
                          <i className="bi bi-check me-2"></i>
                        )}
                        Update Department
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
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </Content>
  );
};

export default UpdateDepartment;