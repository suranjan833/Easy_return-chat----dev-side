import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

const EditRole = () => {
  const { roleId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [formErrors, setFormErrors] = useState({ name: '', description: '' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    if (!token) {
      setError('No authentication token found.');
      navigate('/auth-login');
      return;
    }

    const fetchRole = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/roles/${roleId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFormData({
          name: response.data.name || '',
          description: response.data.description || '',
        });
      } catch (err) {
        console.error('Error fetching role:', err);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in again.');
          localStorage.removeItem('accessToken');
          navigate('/auth-login');
        } else {
          setError('Failed to load role details.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (roleId) {
      fetchRole();
    } else {
      setError('Role ID is missing.');
      navigate('/list-roles');
    }
  }, [roleId, token, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for the field
    setFormErrors((prev) => ({ ...prev, [name]: '' }));
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

    if (!roleId) {
      setError('Role ID is missing.');
      return;
    }

    try {
      setSubmitting(true);
      await axios.put(
        `${BASE_URL}/roles/${roleId}`,
        {
          name: formData.name,
          description: formData.description,
          id: roleId, // Include the id field
        },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      setSuccess('Role updated successfully!');
      setTimeout(() => navigate('/list-roles'), 1500); // Navigate after showing success
    } catch (err) {
      console.error('Error updating role:', err.response?.data);
      if (err.response?.status === 401) {
        setError('Unauthorized: Please log in again.');
        localStorage.removeItem('accessToken');
        navigate('/auth-login');
      } else if (err.response?.status === 422) {
        const validationErrors = err.response.data.detail?.map((error) => error.msg).join(', ');
        setError(`Validation Error: ${validationErrors || 'Please check the input fields.'}`);
      } else {
        setError(err.response?.data?.detail || 'Failed to update role.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Content>
        <Head title="Edit Role" />
        <Container
          className="my-5 d-flex justify-content-center align-items-center"
          style={{ minHeight: '60vh' }}
        >
          <div className="text-center">
            <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
            <p className="mt-3 text-muted">Loading role data...</p>
          </div>
        </Container>
      </Content>
    );
  }

  return (
    <Content>
      <Head title="Edit Role" />
      <Container className="py-4">
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h3 className="fw-bold mb-1 mt-2">Edit Role</h3>
                <p className="text-muted mb-0">Update details for the selected role</p>
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
                    <Col sm="12" className='d-flex'>
                      <Button
                        color="primary"
                        type="submit"
                        disabled={submitting}
                        className="me-2 d-flex align-items-center"
                      >
                        {submitting ? (
                          <Spinner size="sm" className="me-2" />
                        ) : (
                          <i className="bi bi-check me-2"></i>
                        )}
                        Update Role
                      </Button>
                      <Button
                        color="outline-primary"
                        type="button"
                        onClick={() => navigate('/list-roles')}
                        disabled={submitting}
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

export default EditRole;