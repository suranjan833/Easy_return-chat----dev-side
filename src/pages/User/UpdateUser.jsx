import {
  Block,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  OverlineTitle,
  PreviewCard,
} from "@/components/Component";
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, Col, FormFeedback, FormGroup, Input, Label, Row, Spinner } from "reactstrap";
const BASE_URL = import.meta.env.VITE_API_BASE_URL;


const UpdateUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    role_id: '',
    is_active: true,
    availability: true,
    reports_to: '',
    site_ids: [],
    department_ids: [],
    site_id: '',
    password: '',
  });


  const [departments, setDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [sites, setSites] = useState([]);
  const [filteredSites, setFilteredSites] = useState([]);
  const [roles, setRoles] = useState([]);
  const [managers, setManagers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Pagination state for sites
  const [currentSitePage, setCurrentSitePage] = useState(1);
  const [sitesPerPage] = useState(5);

  // Pagination state for departments
  const [currentDeptPage, setCurrentDeptPage] = useState(1);
  const [deptsPerPage] = useState(5);

  // Search state
  const [siteSearchTerm, setSiteSearchTerm] = useState('');
  const [deptSearchTerm, setDeptSearchTerm] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      axios.get(`${BASE_URL}/users/${id}`, { headers }),
      axios.get(`${BASE_URL}/departments/`, { headers }).catch(() => ({ data: [] })),
      axios.get(`${BASE_URL}/sites/?skip=0&limit=100`, { headers }).catch(() => ({ data: { records: [] } })),
      axios.get(`${BASE_URL}/roles/`, { headers }).catch(() => ({ data: [] })),
      axios.get(`${BASE_URL}/users/managers`, { headers }).catch(() => ({ data: [] })),
    ])
      .then(([userResponse, deptResponse, siteResponse, roleResponse, managerResponse]) => {
        const userData = userResponse.data;
        setFormData({
          email: userData.email || '',
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          phone_number: userData.phone_number || '',
          role_id: userData.role_id || userData.role?.id || '',
          is_active: userData.is_active ?? true,
          availability: userData.availability ?? true,
          reports_to: userData.reports_to || '',
          site_ids: userData.sites ? userData.sites : [],
          department_ids: userData.departments ? userData.departments : [],
          site_id: userData.site_id || '',
          password: '',

        });

        const depts = Array.isArray(deptResponse.data) ? deptResponse.data : [];
        const sitesData = Array.isArray(siteResponse.data.records) ? siteResponse.data.records : [];

        setDepartments(depts);
        setFilteredDepartments(depts);
        setSites(sitesData);
        setFilteredSites(sitesData);
        setRoles(Array.isArray(roleResponse.data) ? roleResponse.data : []);
        setManagers(Array.isArray(managerResponse.data) ? managerResponse.data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching data:', err);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in again.');
          localStorage.removeItem('accessToken');
          navigate('/auth-login');
        } else {
          const errorMessage = err.response?.data?.detail
            ? Array.isArray(err.response.data.detail)
              ? err.response.data.detail.map((e) => e.msg).join(', ')
              : err.response.data.detail
            : 'Failed to load data.';
          setError(errorMessage);
        }
        setLoading(false);
      });
  }, [id, navigate]);

  // Handle site search
  useEffect(() => {
    if (siteSearchTerm === '') {
      setFilteredSites(sites);
    } else {
      const filtered = sites.filter(site =>
        site.domain.toLowerCase().includes(siteSearchTerm.toLowerCase()) ||
        (site.id && site.id.toString().includes(siteSearchTerm))
      );
      setFilteredSites(filtered);
    }
    setCurrentSitePage(1);
  }, [siteSearchTerm, sites]);

  // Handle department search
  useEffect(() => {
    if (deptSearchTerm === '') {
      setFilteredDepartments(departments);
    } else {
      const filtered = departments.filter(dept =>
        dept.name.toLowerCase().includes(deptSearchTerm.toLowerCase()) ||
        (dept.id && dept.id.toString().includes(deptSearchTerm))
      );
      setFilteredDepartments(filtered);
    }
    setCurrentDeptPage(1);
  }, [deptSearchTerm, departments]);

  // Get current sites for pagination
  const indexOfLastSite = currentSitePage * sitesPerPage;
  const indexOfFirstSite = indexOfLastSite - sitesPerPage;
  const currentSites = filteredSites.slice(indexOfFirstSite, indexOfLastSite);

  // Get current departments for pagination
  const indexOfLastDept = currentDeptPage * deptsPerPage;
  const indexOfFirstDept = indexOfLastDept - deptsPerPage;
  const currentDepts = filteredDepartments.slice(indexOfFirstDept, indexOfLastDept);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleCheckboxChange = (field, id) => {
    setFormData((prev) => {
      const currentIds = prev[field];
      if (currentIds.includes(id)) {
        return { ...prev, [field]: currentIds.filter((item) => item !== id) };
      } else {
        return { ...prev, [field]: [...currentIds, id] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // Validate form
    const errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    if (formData.phone_number && !/^\d{10}$/.test(formData.phone_number)) {
      errors.phone_number = 'Phone number must be 10 digits';
    }
    if (!formData.site_ids.length) {
      errors.site_ids = 'At least one site must be selected';
    }
    if (!formData.department_ids.length) {
      errors.department_ids = 'At least one department must be selected';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
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
        phone_number: formData.phone_number,
        role_id: parseInt(formData.role_id) || null,
        is_active: formData.is_active,
        availability: formData.availability,
        reports_to: parseInt(formData.reports_to) || null,
        site_ids: formData.site_ids.map(site => Number(site.id)),
        department_ids: formData.department_ids.map(dep => dep.id),
        // site_id: parseInt(formData.site_id) || null,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      const response = await axios.put(
        `${BASE_URL}/users/${id}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert('User Updated Successfully!');
      navigate(location.state?.from || '/list-users');
    } catch (err) {
      console.error('Error updating user:', err);
      if (err.response?.status === 401) {
        setError('Unauthorized: Please log in again.');
        localStorage.removeItem('accessToken');
        navigate('/auth-login');
      } else if (err.response?.status === 422) {
        const validationErrors = err.response.data.detail?.reduce((acc, error) => {
          const field = error.loc[error.loc.length - 1];
          return { ...acc, [field]: error.msg };
        }, {});
        setValidationErrors(validationErrors);
      } else {
        setError(err.response?.data?.detail || 'An error occurred while updating the user.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Content>
        <Head title="Update User" />
        <div className="text-center">
          <Spinner color="primary" />
          <p>Loading...</p>
        </div>
      </Content>
    );
  }

  return (
    <Content>
      <Head title="Update User" />
      <Block size="lg">
        <BlockHead>
          <BlockHeadContent>
            <BlockTitle tag="h5">Update User</BlockTitle>
          </BlockHeadContent>
        </BlockHead>
        <PreviewCard>
          <OverlineTitle tag="span" className="preview-title-lg">
            User Details
          </OverlineTitle>
          {error && (
            <div className="alert alert-danger alert-dismissible">
              {error}
              <button type="button" className="close" onClick={() => setError(null)} aria-label="Close">
                {/*<span aria-hidden="true"></span>*/}
              </button>
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <Row className="gy-4">
              {/* Personal Information */}
              <Col sm="12">
                <h6 className="title">Personal Information</h6>
              </Col>
              <Col sm="6">
                <FormGroup>
                  <Label for="email">Email<span style={{ color: "red" }}>*</span></Label>
                  <Input
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter email"
                    type="email"
                    invalid={!!validationErrors.email}
                    required
                  />
                  <FormFeedback>{validationErrors.email}</FormFeedback>
                </FormGroup>
              </Col>
              <Col sm="6">
                <FormGroup>
                  <Label for="password">New Password (Optional)</Label>
                  <Input
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter new password"
                    type="password"
                  />
                </FormGroup>
              </Col>
              <Col sm="6">
                <FormGroup>
                  <Label for="first_name">First Name<span style={{ color: "red" }}>*</span></Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="Enter first name"
                    type="text"
                    required
                  />
                </FormGroup>
              </Col>
              <Col sm="6">
                <FormGroup>
                  <Label for="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="Enter last name"
                    type="text"
                  />
                </FormGroup>
              </Col>
              <Col sm="6">
                <FormGroup>
                  <Label for="phone_number">Phone Number</Label>
                  <Input
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    placeholder="Enter phone number (10 digits)"
                    type="tel"
                    invalid={!!validationErrors.phone_number}
                  />
                  <FormFeedback>{validationErrors.phone_number}</FormFeedback>
                </FormGroup>
              </Col>

              {/* Work Information */}
              <Col sm="12">
                <h6 className="title">Work Information</h6>
              </Col>
              <Col sm="6">
                <FormGroup>
                  <Label for="role_id">Role<span style={{ color: "red" }}>*</span></Label>
                  <Input
                    type="select"
                    id="role_id"
                    name="role_id"
                    value={formData.role_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </Input>
                </FormGroup>
              </Col>
              <Col sm="6">
                <FormGroup>
                  <Label for="reports_to">Reports To</Label>
                  <Input
                    type="select"
                    id="reports_to"
                    name="reports_to"
                    value={formData.reports_to}
                    onChange={handleChange}
                  >
                    <option value="">Select Manager</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.first_name} {manager.last_name}
                      </option>
                    ))}
                  </Input>
                </FormGroup>
              </Col>
              <Col sm="6">
                <FormGroup>
                  <Label for="siteSearch">Sites<span style={{ color: "red" }}>*</span> ({formData.site_ids.length} selected)</Label>
                  <Input
                    type="text"
                    id="siteSearch"
                    placeholder="Search sites..."
                    value={siteSearchTerm}
                    onChange={(e) => setSiteSearchTerm(e.target.value)}
                    className="mb-2"
                  />
                  <div className="border p-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {currentSites.length > 0 ? (
                      currentSites.map((site) => (
                        <FormGroup check key={site.id}>
                          <Input
                            type="checkbox"
                            id={`site-${site.id}`}
                            defaultChecked={formData.site_ids?.some((vl) => vl?.id == site.id)}
                            onChange={() => handleCheckboxChange('site_ids', site.id)}
                          />
                          <Label for={`site-${site.id}`} check>
                            {site.domain}
                          </Label>
                        </FormGroup>
                      ))
                    ) : (
                      <p>No sites found</p>
                    )}
                  </div>
                  {filteredSites.length > sitesPerPage && (
                    <div className="d-flex justify-content-between mt-2">
                      <Button
                        color="light"
                        size="sm"
                        onClick={() => setCurrentSitePage(prev => Math.max(prev - 1, 1))}
                        disabled={currentSitePage === 1}
                      >
                        Previous
                      </Button>
                      <span>Page {currentSitePage} of {Math.ceil(filteredSites.length / sitesPerPage)}</span>
                      <Button
                        color="light"
                        size="sm"
                        onClick={() => setCurrentSitePage(prev =>
                          Math.min(prev + 1, Math.ceil(filteredSites.length / sitesPerPage))
                        )}
                        disabled={currentSitePage === Math.ceil(filteredSites.length / sitesPerPage)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                  {validationErrors.site_ids && (
                    <div className="text-danger small">{validationErrors.site_ids}</div>
                  )}
                </FormGroup>
              </Col>
              <Col sm="6">
                <FormGroup>
                  <Label for="deptSearch">Departments<span style={{ color: "red" }}>*</span> ({formData.department_ids.length} selected)</Label>
                  <Input
                    type="text"
                    id="deptSearch"
                    placeholder="Search departments..."
                    value={deptSearchTerm}
                    onChange={(e) => setDeptSearchTerm(e.target.value)}
                    className="mb-2"
                  />
                  <div className="border p-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {currentDepts.length > 0 ? (
                      currentDepts.map((dept) => (
                        <FormGroup check key={dept.id}>
                          <Input
                            type="checkbox"
                            id={`dept-${dept.id}`}
                            defaultChecked={formData.department_ids?.some((vl) => vl?.id == dept.id)}
                            onChange={() => handleCheckboxChange('department_ids', dept.id)}
                          />
                          <Label for={`dept-${dept.id}`} check>
                            {dept.name}
                          </Label>
                        </FormGroup>
                      ))
                    ) : (
                      <p>No departments found</p>
                    )}
                  </div>
                  {filteredDepartments.length > deptsPerPage && (
                    <div className="d-flex justify-content-between mt-2">
                      <Button
                        color="light"
                        size="sm"
                        onClick={() => setCurrentDeptPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentDeptPage === 1}
                      >
                        Previous
                      </Button>
                      <span>Page {currentDeptPage} of {Math.ceil(filteredDepartments.length / deptsPerPage)}</span>
                      <Button
                        color="light"
                        size="sm"
                        onClick={() => setCurrentDeptPage(prev =>
                          Math.min(prev + 1, Math.ceil(filteredDepartments.length / deptsPerPage))
                        )}
                        disabled={currentDeptPage === Math.ceil(filteredDepartments.length / deptsPerPage)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                  {validationErrors.department_ids && (
                    <div className="text-danger small">{validationErrors.department_ids}</div>
                  )}
                </FormGroup>
              </Col>
              <Col sm="6">
                <FormGroup>
                  <Label for="site_id">Primary Site</Label>
                  <Input
                    type="select"
                    id="site_id"
                    name="site_id"
                    value={formData.site_id}
                    onChange={handleChange}
                  >
                    <option value="">Select Primary Site</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.domain}
                      </option>
                    ))}
                  </Input>
                </FormGroup>
              </Col>

              {/* Status */}
              <Col sm="12">
                <h6 className="title">Status</h6>
              </Col>
              <Col sm="6">
                <FormGroup check>
                  <Label check>
                    <Input
                      id="is_active"
                      name="is_active"
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={handleChange}
                    />{' '}
                    Active
                  </Label>
                </FormGroup>
              </Col>
              <Col sm="6">
                <FormGroup check>
                  <Label check>
                    <Input
                      id="availability"
                      name="availability"
                      type="checkbox"
                      checked={formData.availability}
                      onChange={handleChange}
                    />{' '}
                    Available
                  </Label>
                </FormGroup>
              </Col>

              {/* Submit */}
              <Col sm="12" className="mt-4">
                <Button
                  color="primary"
                  type="submit"
                  disabled={submitting}
                  aria-label="Update user"
                >
                  {submitting ? <Spinner size="sm" /> : 'Update User'}
                </Button>
                <Button
                  color="secondary"
                  className="ms-2"
                  onClick={() => navigate(location.state?.from || '/list-users')}
                  disabled={submitting}
                  aria-label="Cancel user update"
                >
                  Cancel
                </Button>
              </Col>
            </Row>
          </form>
        </PreviewCard>
      </Block>
    </Content>
  );
};

export default UpdateUser;