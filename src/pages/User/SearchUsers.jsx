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
  Card,
  CardBody,
  Badge,
  InputGroup,
  InputGroupText,
  Input,
} from 'reactstrap';
import axios from 'axios';
import { debounce } from 'lodash';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Content from '@/layout/content/Content';
import Head from '@/layout/head/Head';
const BASE_URL = import.meta.env.VITE_API_BASE_URL;


const SearchUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('accessToken');

  const handleSearch = async (searchQuery) => {
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    if (!searchQuery.trim()) {
      setUsers([]);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(
        `${BASE_URL}/users/search/?query=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );
      setUsers(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err) {
      console.error('Error searching users:', err);
      if (err.response?.status === 401) {
        setError('Unauthorized: Please log in again.');
        localStorage.removeItem('accessToken');
        navigate('/auth-login');
      } else if (err.response?.status === 422) {
        setError(err.response.data.detail?.map((e) => e.msg).join(', ') || 'Invalid search query.');
      } else {
        setError(err.response?.data?.detail || 'Failed to search users.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Debounced search handler
  const debouncedSearch = debounce((value) => {
    setQuery(value);
    handleSearch(value);
  }, 300);

  const handleInputChange = (e) => {
    debouncedSearch(e.target.value);
  };

  const handleViewUser = (userId) => {
    navigate(`/update-user/${userId}`);
  };

  return (
    <Content>
      <Head title="Search Users" />
      <Container className="py-4">
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h3 className="fw-bold mb-1">User Search</h3>
                <p className="text-muted mb-0">Search for users by name or email</p>
              </div>
            </div>
          </Col>
        </Row>

        <Row>
          <Col>
            <Card className="border-0 shadow-sm">
              <CardBody className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div>
                    <h5 className="fw-bold mb-1">Search Results</h5>
                    <small className="text-muted">
                      Showing {users.length} {users.length === 1 ? 'user' : 'users'}
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
                        placeholder="Search by name or email..."
                        value={query}
                        onChange={handleInputChange}
                        aria-label="Search users by name or email"
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
                        <th>Email</th>
                        <th>First Name</th>
                        <th>Last Name</th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="6" className="text-center py-5">
                            <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
                            <p className="mt-3 text-muted">Searching...</p>
                          </td>
                        </tr>
                      ) : users.length > 0 ? (
                        users.map((user) => (
                          <tr key={user.id}>
                            <td className="fw-semibold">#{user.id}</td>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="bg-primary bg-opacity-10 p-2 rounded me-3">
                                  <i className="bi bi-person text-primary"></i>
                                </div>
                                <span className="fw-medium">{user.email}</span>
                              </div>
                            </td>
                            <td>{user.first_name || 'N/A'}</td>
                            <td>{user.last_name || 'N/A'}</td>
                            <td>
                              <Badge color={user.is_active ? 'success' : 'warning'} pill>
                                {user.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="text-end">
                              <Button
                                color="primary"
                                size="sm"
                                onClick={() => handleViewUser(user.id)}
                                title="View/Edit User"
                                aria-label={`Edit user ${user.email}`}
                              >
                                <i className="bi bi-pencil me-1"></i> Edit
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="text-center py-5">
                            <div className="py-3">
                              <i className="bi bi-people text-muted fs-1"></i>
                              <p className="mt-2 text-muted">
                                {query ? 'No users found' : 'Enter a search query'}
                              </p>
                              {query && (
                                <Button
                                  color="outline-primary"
                                  size="sm"
                                  className="mt-2"
                                  onClick={() => setQuery('')}
                                >
                                  Clear search
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </Content>
  );
};

export default SearchUsers;