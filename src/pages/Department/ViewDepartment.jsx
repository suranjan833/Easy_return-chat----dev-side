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
  ListGroup,
  ListGroupItem,
  Table,
  Badge,
  Pagination,
  PaginationItem,
  PaginationLink,
  FormGroup,
  Label,
  Input,
} from 'reactstrap';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Content from '@/layout/content/Content';
import Head from '@/layout/head/Head';
import { fetchRoleName } from '../../Services/MultipleCallingApi';
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ViewDepartment = () => {
  const { departmentId } = useParams();
  const navigate = useNavigate();
  const [department, setDepartment] = useState(null);
  const [siteName, setSiteName] = useState(''); // State for site name
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [addingUser, setAddingUser] = useState(false);
  const itemsPerPage = 10;
  const token = localStorage.getItem('accessToken');
  const [roleNames, setRoleNames] = useState({});
  // Validate and format timestamp for display
  const formatTimestamp = (timestamp) => {
    // Check if timestamp is a valid string and matches ISO 8601 format
    if (typeof timestamp === 'string' && timestamp.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      try {
        const date = new Date(timestamp);
        // Ensure the date is valid
        if (!isNaN(date.getTime())) {
          return date.toLocaleString();
        }
      } catch {
        // Invalid date format
      }
    }
    return 'Not available'; // Fallback for null, undefined, or invalid timestamps
  };

  // Fetch department, users, and site details on mount
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

    const fetchData = async () => {
      try {
        const headers = {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        };

        // Fetch department details
        const deptResponse = await axios.get(`${BASE_URL}/departments/${departmentId}`, { headers });
        setDepartment(deptResponse.data);

        // Fetch all users
        const usersResponse = await axios.get(`${BASE_URL}/users`, { headers });
        const usersData = Array.isArray(usersResponse.data) ? usersResponse.data : usersResponse.data.records || [];
        setAllUsers(usersData);

        // Fetch role names for each user
        const roleNamePromises = usersData.map(async (user) => {
          if (user.role_id) {
            const roleName = await fetchRoleName(user.role_id, token);
            return { [user.role_id]: roleName };
          }
          return null;
        });

        const roleNameResults = await Promise.all(roleNamePromises);
        const roleNamesMap = roleNameResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        setRoleNames(roleNamesMap);

        // Fetch site name if department.site is missing or lacks name
        let siteNameValue = deptResponse.data.site?.name || deptResponse.data.site?.domain || 'None';
        if (!deptResponse.data.site && deptResponse.data.site_id) {
          try {
            const siteResponse = await axios.get(`${BASE_URL}/sites/${deptResponse.data.site_id}`, { headers });
            siteNameValue = siteResponse.data.name || siteResponse.data.domain || deptResponse.data.site_id || 'None';
          } catch (siteErr) {
            console.warn('Error fetching site details:', siteErr);
            siteNameValue = deptResponse.data.site_id || 'None';
          }
        }
        setSiteName(siteNameValue);

        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in again.');
          localStorage.removeItem('accessToken');
          navigate('/auth-login');
        } else {
          const errorMsg = err.response?.data?.detail
            ? Array.isArray(err.response.data.detail)
              ? err.response.data.detail.map((e) => e.msg).join(', ')
              : err.response.data.detail
            : 'Failed to load data.';
          setError(errorMsg);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [departmentId, navigate, token]);

  // Handle department deletion
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this user from the department?')) {
      return;
    }

    try {
      await axios.delete(`${BASE_URL}/departments/user/${userId}/department/${departmentId}`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      setDepartment((prev) => ({
        ...prev,
        users: prev.users.filter((user) => user.id !== userId),
      }));
      setError(null);
    } catch (err) {
      console.error('Error deleting user from department:', err);
      const errorMsg = err.response?.data?.detail
        ? Array.isArray(err.response.data.detail)
          ? err.response.data.detail.map((e) => e.msg).join(', ')
          : err.response.data.detail
        : 'Failed to remove user from department.';
      setError(errorMsg);
    }
  };

 const handleAddUser = async () => {
    if (!selectedUserId) {
      setError('Please select a user to add.');
      return;
    }

    setAddingUser(true);
    try {
      const response = await axios.post(
        `https://chatsupport.fskindia.com/departments/user/${selectedUserId}/department/${departmentId}`,
        {},
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // Fetch the user details to add to the department's user list
      const userResponse = await axios.get(`${BASE_URL}/users/${selectedUserId}`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const newUser = userResponse.data;
      setDepartment((prev) => ({
        ...prev,
        users: [...(prev.users || []), newUser],
      }));
      setSelectedUserId('');
      setError(null);
      alert(`User ${response.data.user_id} added to ${response.data.department_name} successfully!`);
    } catch (err) {
      console.error('Error adding user to department:', err);
      const errorMsg = err.response?.data?.detail
        ? Array.isArray(err.response.data.detail)
          ? err.response.data.detail.map((e) => e.msg).join(', ')
          : err.response.data.detail
        : 'Failed to add user to department.';
      setError(errorMsg);
    } finally {
      setAddingUser(false);
    }
  };

  // Filter users for pagination
  const users = department?.users || [];
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = users.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(users.length / itemsPerPage);

  // Filter out users already assigned to the department
  const availableUsers = allUsers.filter(
    (user) => !users.some((deptUser) => deptUser.id === user.id)
  );

  const handleViewUser = (userId) => {
    navigate(`/update-user/${userId}`);
  };

  if (loading) {
    return (
      <Content>
        <Head title="View Department" />
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

  if (error) {
    return (
      <Content>
        <Head title="View Department" />
        <Container className="py-4">
          <Row className="mb-4">
            <Col>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h3 className="fw-bold mb-1 mt-2">Department Details</h3>
                  <p className="text-muted mb-0">View details of the selected department</p>
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
                  <Alert color="danger" className="border-0 bg-danger bg-opacity-10">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {error}
                  </Alert>
                  <Button
                    color="outline-primary"
                    onClick={() => navigate('/list-departments')}
                    className="d-flex align-items-center"
                  >
                    <i className="bi bi-arrow-left me-2"></i> Back to Departments
                  </Button>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </Content>
    );
  }

  return (
    <Content>
      <Head title="View Department" />
      <Container className="py-4">
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center ">
              <div>
                <h3 className="fw-bold mb-1 mt-2">Department Details</h3>
                <p className="text-muted mb-0">View details of the {department.name} department</p>
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
            <Card className="border-0 shadow-sm p-2">
              <CardBody className="p-4">
                <h5 className="fw-bold mb-3">{department.name}</h5>
                <ListGroup flush>
                  <ListGroupItem className="d-flex align-items-center">
                    <div className="bg-primary bg-opacity-10 p-2 rounded me-3">
                      <i className="bi bi-briefcase text-primary"></i>
                    </div>
                    <div>
                      <strong>Name:</strong> <span className="ms-2">{department.name}</span>
                    </div>
                  </ListGroupItem>
                  <ListGroupItem className="d-flex align-items-center">
                    <div className="bg-primary bg-opacity-10 p-2 rounded me-3">
                      <i className="bi bi-globe text-primary"></i>
                    </div>
                    <div>
                      <strong>Site:</strong> <span className="ms-2">{siteName}</span>
                    </div>
                  </ListGroupItem>
                  <ListGroupItem className="d-flex align-items-center">
                    <div className="bg-primary bg-opacity-10 p-2 rounded me-3">
                      <i className="bi bi-person text-primary"></i>
                    </div>
                    <div>
                      <strong>Manager:</strong>{' '}
                      <span className="ms-2">
                        {department.manager
                          ? `${department.manager.first_name} ${department.manager.last_name}`
                          : 'None'}
                      </span>
                    </div>
                  </ListGroupItem>
                  <ListGroupItem className="d-flex align-items-center">
                    <div className="bg-primary bg-opacity-10 p-2 rounded me-3">
                      <i className="bi bi-calendar text-primary"></i>
                    </div>
                    <div>
                      <strong>Created At:</strong>{' '}
                      <span className="ms-2">{formatTimestamp(department.created_at)}</span> {/* Updated to validate and format timestamp like ViewSite.jsx */}
                    </div>
                  </ListGroupItem>
                  <ListGroupItem className="d-flex align-items-center">
                    <div className="bg-primary bg-opacity-10 p-2 rounded me-3">
                      <i className="bi bi-calendar text-primary"></i>
                    </div>
                    <div>
                      <strong>Updated At:</strong>{' '}
                      <span className="ms-2">{formatTimestamp(department.updated_at)}</span> {/* Updated to validate and format timestamp like ViewSite.jsx */}
                    </div>
                  </ListGroupItem>
                  <ListGroupItem className="d-flex align-items-start">
                    <div className="bg-primary bg-opacity-10 p-2 rounded me-3">
                      <i className="bi bi-file-text text-primary"></i>
                    </div>
                    <div>
                      <strong>Description:</strong>{' '}
                      <span className="ms-2">{department.description || 'No description provided.'}</span>
                    </div>
                  </ListGroupItem>
                </ListGroup>

                <h5 className="fw-bold mt-5 mb-3">Assigned Users</h5>
                <div className="mb-3">
                  <FormGroup className="d-flex align-items-center gap-2">
                    <Label for="add_user" className="me-2">Add User to Department:</Label>
                    <Input
                      type="select"
                      id="add_user"
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      style={{ maxWidth: '300px' }}
                      disabled={addingUser}
                    >
                      <option value="">Select a user</option>
                      {availableUsers.length > 0 ? (
                        availableUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.first_name} {user.last_name} ({user.email})
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          No available users
                        </option>
                      )}
                    </Input>
                    <Button
                      color="primary"
                      size="sm"
                      onClick={handleAddUser}
                      disabled={addingUser || !selectedUserId}
                      className="d-flex align-items-center"
                    >
                      {addingUser ? (
                        <>
                          <Spinner size="sm" className="me-1" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-plus-circle me-1"></i> Add User
                        </>
                      )}
                    </Button>
                  </FormGroup>
                </div>
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length > 0 ? (
                        currentUsers.map((user) => (
                          <tr key={user.email}>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="bg-primary bg-opacity-10 p-2 rounded me-3">
                                  <i className="bi bi-person text-primary"></i>
                                </div>
                                <span className="fw-medium">{`${user.first_name} ${user.last_name}`}</span>
                              </div>
                            </td>
                            <td>{user.email}</td>
                            <td>{user.phone_number || 'Not available'}</td>
                              <td>{roleNames[user.role_id] || 'N/A'}</td>
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
                                title="View User"
                                aria-label={`View user ${user.email}`}
                                className="d-flex align-items-center me-2"
                              >
                                <i className="bi bi-eye me-1"></i> View
                              </Button>
                              <Button
                                color="danger"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                                title="Remove User"
                                aria-label={`Remove user ${user.email} from department`}
                                className="d-flex align-items-center"
                              >
                                <i className="bi bi-trash me-1"></i> Remove
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="text-center py-5">
                            <div className="py-3">
                              <i className="bi bi-people text-muted fs-1"></i>
                              <p className="mt-2 text-muted">No users assigned to this department</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
                {users.length > itemsPerPage && (
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

                <div className="d-flex gap-2 mt-4">
                  <Button
                    color="primary"
                    onClick={() => navigate(`/update-department/${departmentId}`)}
                    className="d-flex align-items-center"
                    style={{ height: '30px' }}
                  >
                    <i className="bi bi-pencil me-2"></i> Edit Department
                  </Button>
                  <Button
                    color="outline-primary"
                    onClick={() => navigate('/list-departments')}
                    className="d-flex align-items-center"
                    style={{ height: '30px' }}
                  >
                    <i className="bi bi-arrow-left me-2"></i> Back to Departments
                  </Button>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </Content>
  );
};

export default ViewDepartment;