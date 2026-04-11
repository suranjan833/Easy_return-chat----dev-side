import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Content from '@/layout/content/Content';
import Head from '@/layout/head/Head';
import { Label, Input, Row, Col, Button, Spinner, FormGroup, FormFeedback, Card, CardBody } from 'reactstrap';
import {
  Block,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
} from '@/components/Component';
import axios from 'axios';
const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const CreateUser = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    role_id: '',
    is_active: false,
    profile_picture: '',
    availability: true,
    reports_to: '',
    site_ids: [],
    department_ids: [],
    password: '',
  });
  const [departments, setDepartments] = useState([]);
  const [sites, setSites] = useState([]);
  const [roles, setRoles] = useState([]);
  const [managers, setManagers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };

    Promise.all([
      axios.get(`${BASE_URL}/departments/`, { headers }).catch(() => ({ data: [] })),
      axios.get(`${BASE_URL}/sites/?skip=0&limit=100`, { headers }).catch(() => ({ data: { records: [] } })),
      axios.get(`${BASE_URL}/roles`, { headers }).catch(() => ({ data: [] })),
      axios.get(`${BASE_URL}/users/managers`, { headers }).catch(() => ({ data: [] })),
    ])
      .then(([deptResponse, siteResponse, roleResponse, managerResponse]) => {
        const managerData = Array.isArray(managerResponse.data) ? managerResponse.data : [];
        const invalidManagers = managerData.filter(manager => !manager.id);
        if (invalidManagers.length > 0) {
          console.warn('Invalid managers detected (missing ID):', invalidManagers);
          setError('Warning: Some managers are missing ID fields, which may affect the Reports To dropdown.');
        }

        setDepartments(Array.isArray(deptResponse.data) ? deptResponse.data : []);
        setSites(Array.isArray(siteResponse.data.records) ? siteResponse.data.records : []);
        setRoles(Array.isArray(roleResponse.data) ? roleResponse.data : []);
        setManagers(managerData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching data:', err);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in again.');
          localStorage.removeItem('accessToken');
          navigate('/auth-login');
        } else if (err.code === 'ERR_NETWORK') {
          setError('Network error: Unable to connect to the server. Please check your connection or server CORS settings.');
        } else {
          const errorMsg = err.response?.data?.detail
            ? Array.isArray(err.response.data.detail)
              ? err.response.data.detail.map((e) => e.msg).join(', ')
              : err.response.data.detail
            : 'Failed to load data. Please try again.';
          setError(errorMsg);
        }
        setLoading(false);
      });
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setFormData({
      ...formData,
      [name]: newValue,
    });

    if (name === 'email') {
      validateEmail(newValue);
    } else if (name === 'phone_number') {
      validatePhoneNumber(newValue);
    } else if (name === 'password') {
      validatePassword(newValue);
    }
  };

  const validateEmail = (email) => {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setValidationErrors({
      ...validationErrors,
      email: isValid ? null : 'Invalid email format',
    });
    return isValid;
  };

  const validatePhoneNumber = (phone) => {
    const isValid = !phone || /^\d{10}$/.test(phone);
    setValidationErrors({
      ...validationErrors,
      phone_number: isValid ? null : 'Phone number must be 10 digits',
    });
    return isValid;
  };

  const validatePassword = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    setPasswordStrength(strength);
    setValidationErrors({
      ...validationErrors,
      password: password.length > 0 ? null : 'Password is required',
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setFormData({ ...formData, profile_picture: reader.result });
        setPreviewImage(reader.result);
      };
      reader.onerror = () => setError('Error reading image file');
      reader.readAsDataURL(file);
    }
  };

  const handleMultiSelectChange = (e, field) => {
    const selected = Array.from(e.target.selectedOptions, (option) => parseInt(option.value));
    setFormData({ ...formData, [field]: selected });

    if (field === 'site_ids') {
      setValidationErrors({
        ...validationErrors,
        site_ids: selected.length > 0 ? null : 'At least one site must be selected',
      });
    } else if (field === 'department_ids') {
      setValidationErrors({
        ...validationErrors,
        department_ids: selected.length > 0 ? null : 'At least one department must be selected',
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const isEmailValid = validateEmail(formData.email);
    const isPhoneValid = validatePhoneNumber(formData.phone_number);
    const isPasswordValid = formData.password.length > 0;
    const hasSites = formData.site_ids.length > 0;
    const hasDepartments = formData.department_ids.length > 0;

    if (!isEmailValid || !isPhoneValid || !isPasswordValid || !hasSites || !hasDepartments) {
      setValidationErrors({
        email: isEmailValid ? null : 'Invalid email format',
        phone_number: isPhoneValid ? null : 'Phone number must be 10 digits',
        password: isPasswordValid ? null : 'Password is required',
        site_ids: hasSites ? null : 'At least one site must be selected',
        department_ids: hasDepartments ? null : 'At least one department must be selected',
      });
      setSubmitting(false);
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number || null,
        role_id: parseInt(formData.role_id) || null,
        is_active: formData.is_active,
        profile_picture: formData.profile_picture || null,
        availability: formData.availability,
        reports_to: parseInt(formData.reports_to) || null,
        site_ids: formData.site_ids.map((id) => parseInt(id)),
        department_ids: formData.department_ids.map((id) => parseInt(id)),
        password: formData.password,
      };

      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const response = await axios.post(`${BASE_URL}/users/create`, payload, { headers });

      const agentRoleId = roles.find(role => role.name.toLowerCase() === 'agent')?.id;
      // if (parseInt(formData.role_id) === agentRoleId && formData.site_ids.length > 0) {
      //   await sendSiteAssignmentNotification(formData.email, formData.site_ids);
      // }

      alert('User created successfully!');
      navigate('/list-users');
    } catch (err) {
      console.error('Error creating user:', err);
      if (err.response?.status === 401) {
        setError('Unauthorized: Please log in again.');
        localStorage.removeItem('accessToken');
        navigate('/auth-login');
      } else if (err.response?.status === 422) {
        const errors = err.response.data.detail?.reduce((acc, error) => {
          const field = error.loc[error.loc.length - 1];
          return { ...acc, [field]: error.msg };
        }, {});
        setValidationErrors(errors);
      } else {
        setError(err.response?.data?.detail || 'An error occurred while creating the user.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Content>
        <Head title="Create User" />
        <div className="text-center py-4">
          <Spinner color="primary" />
          <p className="mt-2">Loading user creation form...</p>
        </div>
      </Content>
    );
  }

  return (
    <Content>
      <Head title="Create User" />
      <Block size="lg">
        <BlockHead>
          <BlockHeadContent>
            <BlockTitle tag="h4">Create New User</BlockTitle>
            <p className="text-soft">Fill in the details below to create a new user account</p>
          </BlockHeadContent>
        </BlockHead>

        <Card className="card-bordered">
          <CardBody>
            {error && (
              <div className="alert alert-danger">
                <Icon name="alert-circle" className="me-2" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <h5 className="title-with-border">
                  <Icon name="user" className="me-2" />
                  Personal Information
                </h5>
                <Row className="g-3">
                  <Col md="6">
                    <FormGroup>
                      <Label for="email" className="required">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="user@example.com"
                        type="email"
                        invalid={!!validationErrors.email}
                        required
                      />
                      <FormFeedback>{validationErrors.email}</FormFeedback>
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <Label for="password" className="required">Password</Label>
                      <div className="position-relative">
                        <Input
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Create a password"
                          type={showPassword ? "text" : "password"}
                          invalid={!!validationErrors.password}
                          required
                        />
                        <span
                          className="position-absolute top-50 end-0 translate-middle-y me-2 cursor-pointer"
                          style={{ right: '10px', bottom:"-35px" }}
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          <Icon name={showPassword ? "eye-off" : "eye"} />
                        </span>
                        {formData.password && (
                          <div className="password-strength mt-2">
                            <div className="d-flex justify-content-between mb-1">
                              <small>Password Strength:</small>
                              <small>
                                {passwordStrength === 0 ? 'Weak' :
                                  passwordStrength === 1 ? 'Fair' :
                                    passwordStrength === 2 ? 'Good' : 'Strong'}
                              </small>
                            </div>
                            <div className="progress" style={{ height: '5px' }}>
                              <div
                                className={`progress-bar ${passwordStrength > 2 ? 'bg-success' : passwordStrength > 1 ? 'bg-info' : passwordStrength > 0 ? 'bg-warning' : 'bg-danger'}`}
                                style={{ width: `${passwordStrength * 25}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                        <FormFeedback>{validationErrors.password}</FormFeedback>
                        <small className="text-muted">Minimum 8 characters with uppercase, number, and special character</small>
                      </div>
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <Label for="first_name" className="required">First Name</Label>
                      <Input
                        id="first_name"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        placeholder="John"
                        type="text"
                        required
                      />
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <Label for="last_name">Last Name</Label>
                      <Input
                        id="last_name"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        placeholder="Doe"
                        type="text"
                      />
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <Label for="phone_number">Phone Number</Label>
                      <Input
                        id="phone_number"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleChange}
                        placeholder="9876543210"
                        type="tel"
                        invalid={!!validationErrors.phone_number}
                      />
                      <FormFeedback>{validationErrors.phone_number}</FormFeedback>
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <Label for="profile_picture">Profile Picture</Label>
                      <div className="d-flex align-items-center">
                        <div className="me-3">
                          {previewImage ? (
                            <img
                              src={previewImage}
                              alt="Profile Preview"
                              className="rounded-circle"
                              style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                            />
                          ) : (
                            <div className="bg-light rounded-circle d-flex align-items-center justify-content-center"
                              style={{ width: '60px', height: '60px' }}>
                              <Icon name="user" className="fs-3 text-muted" />
                            </div>
                          )}
                        </div>
                        <div className="flex-grow-1">
                          <Input
                            id="profile_picture"
                            name="profile_picture"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                          />
                          <small className="text-muted">Max 5MB (JPEG, PNG)</small>
                        </div>
                      </div>
                    </FormGroup>
                  </Col>
                </Row>
              </div>

              <div className="mb-4">
                <h5 className="title-with-border">
                  <Icon name="briefcase" className="me-2" />
                  Work Information
                </h5>
                <Row className="g-3">
                  <Col md="6">
                    <FormGroup>
                      <Label for="role_id">Role</Label>
                      <Input
                        type="select"
                        id="role_id"
                        name="role_id"
                        value={formData.role_id}
                        onChange={handleChange}
                      >
                        <option value="">Select a role</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </Input>
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <Label for="reports_to">Reports To</Label>
                      <Input
                        type="select"
                        id="reports_to"
                        name="reports_to"
                        value={formData.reports_to}
                        onChange={handleChange}
                      >
                        <option value="">Select manager (optional)</option>
                        {managers.map((manager) => (
                          <option key={manager.id || `manager-${Math.random()}`} value={manager.id}>
                            {manager.first_name} {manager.last_name}
                          </option>
                        ))}
                      </Input>
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <Label for="site_ids" className="required">Assigned Sites</Label>
                      <Input
                        type="select"
                        id="site_ids"
                        name="site_ids"
                        multiple
                        onChange={(e) => handleMultiSelectChange(e, 'site_ids')}
                        value={formData.site_ids}
                        invalid={!!validationErrors.site_ids}
                      >
                        {sites.length > 0 ? (
                          sites.map((site) => (
                            <option key={site.id} value={site.id}>
                              {site.domain}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>
                            No sites available
                          </option>
                        )}
                      </Input>
                      <FormFeedback>{validationErrors.site_ids}</FormFeedback>
                      <small className="text-muted">Hold Ctrl/Cmd to select multiple sites</small>
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup>
                      <Label for="department_ids" className="required">Departments</Label>
                      <Input
                        type="select"
                        id="department_ids"
                        name="department_ids"
                        multiple
                        onChange={(e) => handleMultiSelectChange(e, 'department_ids')}
                        value={formData.department_ids}
                        invalid={!!validationErrors.department_ids}
                      >
                        {departments.length > 0 ? (
                          departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>
                            No departments available
                          </option>
                        )}
                      </Input>
                      <FormFeedback>{validationErrors.department_ids}</FormFeedback>
                      <small className="text-muted">Hold Ctrl/Cmd to select multiple departments</small>
                    </FormGroup>
                  </Col>
                </Row>
              </div>

              <div className="mb-4">
                <h5 className="title-with-border">
                  <Icon name="settings" className="me-2" />
                  Account Status
                </h5>
                <Row className="g-3">
                  <Col md="6">
                    <FormGroup check className="form-check-switch">
                      <Input
                        id="is_active"
                        name="is_active"
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={handleChange}
                      />
                      <Label check for="is_active">
                        Active Account
                      </Label>
                      <small className="text-muted d-block mt-1">User will be able to login if active</small>
                    </FormGroup>
                  </Col>
                  <Col md="6">
                    <FormGroup check className="form-check-switch">
                      <Input
                        id="availability"
                        name="availability"
                        type="checkbox"
                        checked={formData.availability}
                        onChange={handleChange}
                      />
                      <Label check for="availability">
                        Currently Available
                      </Label>
                      <small className="text-muted d-block mt-1">User is available for assignments</small>
                    </FormGroup>
                  </Col>
                </Row>
              </div>

              <div className="d-flex justify-content-between align-items-center mt-5 pt-4 border-top">
                <Button
                  color="light"
                  outline
                  onClick={() => navigate('/list-users')}
                  disabled={submitting}
                >
                  <Icon name="arrow-left" className="me-1" />
                  Back to Users
                </Button>
                <Button
                  color="primary"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Spinner size="sm" className="me-1" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Icon name="save" className="me-1" />
                      Create User
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </Block>
    </Content>
  );
};

export default CreateUser;