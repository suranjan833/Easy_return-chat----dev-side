import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Row, Col, Spinner, Input, FormGroup, Label, Table } from 'reactstrap';
import Content from '@/layout/content/Content';
import Head from '@/layout/head/Head';
import { Block, BlockHead, BlockHeadContent, BlockTitle, PreviewCard, OverlineTitle, Icon } from '@/components/Component';
import axios from 'axios';
const BASE_URL = import.meta.env.VITE_API_BASE_URL;


const AgentDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    user_id: '',
    max_requests: '',
  });
  const [updatedUser, setUpdatedUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const token = localStorage.getItem('accessToken');

  // Fetch users for dropdown
  useEffect(() => {
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
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        setUsers(Array.isArray(response.data.records) ? response.data.records : []);
        setError(null);
      } catch (err) {
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
  }, [navigate, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      setSubmitting(false);
      return;
    }

    if (!formData.user_id) {
      setError('Please select a user.');
      setSubmitting(false);
      return;
    }

    if (!formData.max_requests || isNaN(formData.max_requests) || formData.max_requests < 0) {
      setError('Please enter a valid number for max requests.');
      setSubmitting(false);
      return;
    }

    try {
      const response = await axios.post(
        `${BASE_URL}/users/agents/${formData.user_id}/details`,
        { max_requests: parseInt(formData.max_requests) },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );
      setUpdatedUser(response.data);
      setError(null);
      alert('Agent details updated successfully!');
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Unauthorized: Please log in again.');
        localStorage.removeItem('accessToken');
        navigate('/auth-login');
      } else if (err.response?.status === 422) {
        setError(err.response.data.detail?.map((e) => e.msg).join(', ') || 'Invalid input.');
      } else if (err.response?.status === 404) {
        setError('User not found.');
      } else {
        setError(err.response?.data?.detail || 'Failed to update agent details.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Content>
        <Head title="Agent Details" />
        <div className="text-center">
          <Spinner color="primary" />
          <p>Loading...</p>
        </div>
      </Content>
    );
  }

  return (
    <Content>
      <Head title="Agent Details" />
      <Block size="lg">
        <BlockHead>
          <BlockHeadContent>
            <BlockTitle tag="h5">Add/Update Agent Details</BlockTitle>
          </BlockHeadContent>
        </BlockHead>
        <PreviewCard>
          <Row className="gy-4">
            <Col sm="12">
              <OverlineTitle tag="span" className="preview-title-lg">
                Agent Details Form
              </OverlineTitle>
            </Col>
            {error && (
              <Col sm="12">
                <div className="alert alert-danger alert-dismissible">
                  {error}
                  <button type="button" className="close" onClick={() => setError(null)} aria-label="Close">
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
              </Col>
            )}
            <Col sm="12">
              <form onSubmit={handleSubmit}>
                <Row className="gy-4">
                  <Col sm="6">
                    <FormGroup>
                      <Label htmlFor="user_id" className="form-label">
                        Select User
                      </Label>
                      <div className="form-control-wrap">
                        <Input
                          type="select"
                          id="user_id"
                          name="user_id"
                          value={formData.user_id}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Select a user</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.first_name} {user.last_name} ({user.email})
                            </option>
                          ))}
                        </Input>
                      </div>
                    </FormGroup>
                  </Col>
                  <Col sm="6">
                    <FormGroup>
                      <Label htmlFor="max_requests" className="form-label">
                        Max Requests
                      </Label>
                      <div className="form-control-wrap">
                        <Input
                          id="max_requests"
                          name="max_requests"
                          value={formData.max_requests}
                          onChange={handleChange}
                          placeholder="Enter max requests"
                          type="number"
                          min="0"
                          required
                        />
                      </div>
                    </FormGroup>
                  </Col>
                  <Col sm="12">
                    <Button color="primary" type="submit" disabled={submitting || loading}>
                      {submitting ? <Spinner size="sm" /> : 'Update Agent Details'}
                    </Button>
                    {/* <Button
                      color="secondary"
                      className="ms-2"
                      onClick={() => navigate(location.state?.from || '/list-users')}
                      disabled={submitting || loading}
                      aria-label="Cancel agent details"
                    >
                      Cancel
                    </Button> */}
                  </Col>
                </Row>
              </form>
            </Col>
            {updatedUser && (
              <Col sm="12" className="mt-4">
                <OverlineTitle tag="span" className="preview-title-lg">
                  Updated User Profile
                </OverlineTitle>
                <div className="table-responsive">
                  <Table striped>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Email</th>
                        <th>First Name</th>
                        <th>Last Name</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{updatedUser.id}</td>
                        <td>{updatedUser.email}</td>
                        <td>{updatedUser.first_name}</td>
                        <td>{updatedUser.last_name}</td>
                        <td>
                          <Button
                            color="primary"
                            size="sm"
                            onClick={() => navigate(`/update-user/${updatedUser.id}`, { state: { from: '/agent-details' } })}
                            title="View/Edit User"
                            aria-label={`Edit user ${updatedUser.email}`}
                          >
                            <Icon name="edit" />
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                </div>
              </Col>
            )}
          </Row>
        </PreviewCard>
      </Block>
    </Content>
  );
};

export default AgentDetails;