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
  Pagination,
  PaginationItem,
  PaginationLink,
  InputGroup,
  InputGroupText,
  Input,
} from 'reactstrap';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Content from '@/layout/content/Content';
import Head from '@/layout/head/Head';
const BASE_URL = import.meta.env.VITE_API_BASE_URL;


const AgentsBySite = () => {
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchingAgents, setFetchingAgents] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const token = localStorage.getItem('accessToken');

  // Fetch sites for dropdown
  useEffect(() => {
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    const fetchSites = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${BASE_URL}/sites/?skip=0&limit=100`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        setSites(Array.isArray(response.data.records) ? response.data.records : []);
        setError(null);
      } catch (err) {
        console.error('Error fetching sites:', err);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in again.');
          localStorage.removeItem('accessToken');
          navigate('/auth-login');
        } else {
          setError(err.response?.data?.detail || 'Failed to load sites.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSites();
  }, [navigate, token]);

  // Fetch agents when site_id changes
  useEffect(() => {
    if (!selectedSiteId) {
      setAgents([]);
      return;
    }

    const fetchAgentsBySite = async () => {
      if (!token) {
        setError('No authentication token found. Please log in.');
        navigate('/auth-login');
        return;
      }

      try {
        setFetchingAgents(true);
        const response = await axios.get(
          `${BASE_URL}/users/site/${selectedSiteId}/agents?skip=0&limit=100`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }
        );
        const validAgents = Array.isArray(response.data)
          ? response.data.filter(
              (agent) => agent.id && agent.email && agent.first_name && agent.last_name
            )
          : [];
        setAgents(validAgents);
        setError(null);
      } catch (err) {
        console.error('Error fetching agents by site:', err);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in again.');
          localStorage.removeItem('accessToken');
          navigate('/auth-login');
        } else if (err.response?.status === 422) {
          setError(err.response.data.detail?.map((e) => e.msg).join(', ') || 'Invalid site ID.');
        } else if (err.response?.status === 404) {
          setError('Site not found.');
        } else {
          setError(err.response?.data?.detail || 'Failed to load agents.');
        }
      } finally {
        setFetchingAgents(false);
      }
    };

    fetchAgentsBySite();
  }, [selectedSiteId, navigate, token]);

  // Filter agents for pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAgents = agents.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(agents.length / itemsPerPage);

  const handleSiteChange = (e) => {
    setSelectedSiteId(e.target.value);
    setCurrentPage(1); // Reset to first page when site changes
  };

  const handleViewAgent = (agentId) => {
    navigate(`/update-user/${agentId}`);
  };

  if (loading) {
    return (
      <Content>
        <Head title="Agents by Site" />
        <Container
          className="my-5 d-flex justify-content-center align-items-center"
          style={{ minHeight: '60vh' }}
        >
          <div className="text-center">
            <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
            <p className="mt-3 text-muted">Loading sites...</p>
          </div>
        </Container>
      </Content>
    );
  }

  return (
    <Content>
      <Head title="Agents by Site" />
      <Container className="py-4">
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h3 className="fw-bold mb-1 mt-2">Agents by Site</h3>
                <p className="text-muted mb-0">View agents assigned to a specific site</p>
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
                    <h5 className="fw-bold mb-1">Agent List</h5>
                    <small className="text-muted">
                      Showing {agents.length} {agents.length === 1 ? 'agent' : 'agents'}
                    </small>
                  </div>
                  <div className="w-25">
                    <InputGroup>
                      <InputGroupText className="bg-light border-end-0">
                        <i className="bi bi-globe text-muted"></i>
                      </InputGroupText>
                      <Input
                        type="select"
                        className="border-start-0"
                        value={selectedSiteId}
                        onChange={handleSiteChange}
                        aria-label="Select a site to view agents"
                      >
                        <option value="" disabled>
                          Select a site
                        </option>
                        {sites.map((site) => (
                          <option key={site.id} value={site.id}>
                            {site.name || site.domain || `Site ${site.id}`}
                          </option>
                        ))}
                      </Input>
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
                      {fetchingAgents ? (
                        <tr>
                          <td colSpan="6" className="text-center py-5">
                            <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
                            <p className="mt-3 text-muted">Loading agents...</p>
                          </td>
                        </tr>
                      ) : agents.length > 0 ? (
                        currentAgents.map((agent) => (
                          <tr key={agent.id}>
                            <td className="fw-semibold">#{agent.id}</td>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="bg-primary bg-opacity-10 p-2 rounded me-3">
                                  <i className="bi bi-person text-primary"></i>
                                </div>
                                <span className="fw-medium">{agent.email}</span>
                              </div>
                            </td>
                            <td>{agent.first_name}</td>
                            <td>{agent.last_name}</td>
                            <td>
                              <Badge color={agent.is_active ? 'success' : 'warning'} pill>
                                {agent.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="text-end">
                              <Button
                                color="primary"
                                size="sm"
                                onClick={() => handleViewAgent(agent.id)}
                                title="View/Edit Agent"
                                aria-label={`Edit agent ${agent.email}`}
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
                                {selectedSiteId
                                  ? 'No agents found for this site'
                                  : 'Select a site to view agents'}
                              </p>
                              {selectedSiteId && (
                                <Button
                                  color="outline-primary"
                                  size="sm"
                                  className="mt-2"
                                  onClick={() => setSelectedSiteId('')}
                                >
                                  Clear selection
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>

                {agents.length > itemsPerPage && (
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

export default AgentsBySite;