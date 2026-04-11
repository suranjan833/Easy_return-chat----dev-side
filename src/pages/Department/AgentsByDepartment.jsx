import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Table, Spinner, Alert, Card, Form } from 'react-bootstrap';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const AgentsByDepartment = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [agents, setAgents] = useState([]);
  const [department, setDepartment] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    const fetchDepartments = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${BASE_URL}/departments/`, {
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
  }, [navigate, token]);

  useEffect(() => {
    if (!selectedDepartmentId) {
      setAgents([]);
      setDepartment(null);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch agents
        const agentsResponse = await axios.get(`${BASE_URL}/agents/departments/${selectedDepartmentId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        const agentsData = Array.isArray(agentsResponse.data)
          ? agentsResponse.data
          : Array.isArray(agentsResponse.data.records)
            ? agentsResponse.data.records
            : Array.isArray(agentsResponse.data.data)
              ? agentsResponse.data.data
              : [];
        setAgents(agentsData);

        // Fetch department details
        const deptResponse = await axios.get(`${BASE_URL}/agents/department/${selectedDepartmentId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        setDepartment(deptResponse.data);

        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in again.');
          localStorage.removeItem('accessToken');
          navigate('/auth-login');
        } else {
          setError(err.response?.data?.detail || 'Failed to load agents or department details.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDepartmentId, navigate, token]);

  const handleDepartmentChange = (e) => {
    setSelectedDepartmentId(e.target.value);
  };

  if (loading && !selectedDepartmentId) {
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
              <h3 className="fw-bold mb-1 mt-2">Department Agents</h3>
              <p className="text-muted mb-0">View agents assigned to a department</p>
            </div>
            <Button
              variant="outline-primary"
              onClick={() => navigate('/list-departments')}
              className="d-flex align-items-center"
            >
              <i className="bi bi-arrow-left me-2"></i> Back to Departments
            </Button>
          </div>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" className="border-0 bg-danger bg-opacity-10">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </Alert>
      )}

      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h5 className="fw-bold mb-1">Select Department</h5>
                </div>
                <div className="w-25">
                  <Form.Select
                    value={selectedDepartmentId}
                    onChange={handleDepartmentChange}
                    disabled={departments.length === 0}
                  >
                    <option value="">Select a Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name || `Department #${dept.id}`}
                      </option>
                    ))}
                  </Form.Select>
                  {departments.length === 0 && (
                    <Form.Text className="text-muted">No departments available.</Form.Text>
                  )}
                </div>
              </div>

              {selectedDepartmentId && (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                      <h5 className="fw-bold mb-1">Agents in {department?.name || `Department #${selectedDepartmentId}`}</h5>
                      <small className="text-muted">
                        Showing {agents.length} {agents.length === 1 ? 'agent' : 'agents'}
                      </small>
                    </div>
                  </div>

                  <div className="table-responsive">
                    <Table hover className="mb-0">
                      <thead className="bg-light">
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agents.length > 0 ? (
                          agents.map((agent) => (
                            <tr key={agent.id}>
                              <td className="fw-semibold">#{agent.id}</td>
                              <td className="fw-medium">
                                {agent.first_name && agent.last_name
                                  ? `${agent.first_name} ${agent.last_name}`
                                  : 'Unnamed Agent'}
                              </td>
                              <td>{agent.email || 'N/A'}</td>
                              <td>{agent.role || 'N/A'}</td>
                              <td className="text-end">
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => navigate(`/agent-details/${agent.id}`)} // Adjusted to match menu
                                  className="me-2"
                                  title="View Agent"
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
                                <i className="bi bi-person text-muted fs-1"></i>
                                <p className="mt-2 text-muted">No agents found for this department</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AgentsByDepartment;