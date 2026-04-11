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
} from 'reactstrap';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Content from '@/layout/content/Content';
import Head from '@/layout/head/Head';
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ViewRole = () => {
  const { roleId } = useParams();
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    const fetchRole = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${BASE_URL}/roles/${roleId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setRole(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching role:', err);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in again.');
          localStorage.removeItem('accessToken');
          navigate('/auth-login');
        } else {
          setError('Failed to load role details. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [roleId, token, navigate]);

  if (loading) {
    return (
      <Content>
        <Head title="View Role" />
        <Container
          className="my-5 d-flex justify-content-center align-items-center"
          style={{ minHeight: '60vh' }}
        >
          <div className="text-center">
            <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
            <p className="mt-3 text-muted">Loading role details...</p>
          </div>
        </Container>
      </Content>
    );
  }

  return (
    <Content>
      <Head title="View Role" />
      <Container className="py-4">
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h3 className="fw-bold mb-1">Role Details</h3>
                <p className="text-muted mb-0">View details of the selected role</p>
              </div>
              <Button
                color="primary"
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
                {error && (
                  <Alert color="danger" className="border-0 bg-danger bg-opacity-10">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {error}
                  </Alert>
                )}
                {role ? (
                  <ListGroup flush>
                    <ListGroupItem className="d-flex align-items-center">
                      <div className="bg-primary bg-opacity-10 p-2 rounded me-3">
                        <i className="bi bi-shield text-primary"></i>
                      </div>
                      <div>
                        <strong>Role ID:</strong> <span className="ms-2">{role.id}</span>
                      </div>
                    </ListGroupItem>
                    <ListGroupItem className="d-flex align-items-center">
                      <div className="bg-primary bg-opacity-10 p-2 rounded me-3">
                        <i className="bi bi-shield text-primary"></i>
                      </div>
                      <div>
                        <strong>Role Name:</strong> <span className="ms-2">{role.name}</span>
                      </div>
                    </ListGroupItem>
                    <ListGroupItem className="d-flex align-items-start">
                      <div className="bg-primary bg-opacity-10 p-2 rounded me-3">
                        <i className="bi bi-shield text-primary"></i>
                      </div>
                      <div>
                        <strong>Description:</strong>{' '}
                        <span className="ms-2">{role.description || 'N/A'}</span>
                      </div>
                    </ListGroupItem>
                  </ListGroup>
                ) : (
                  <div className="text-center py-5">
                    <i className="bi bi-shield text-muted fs-1"></i>
                    <p className="mt-2 text-muted">No role data available</p>
                    <Button
                      color="primary"
                      size="sm"
                      className="mt-2"
                      onClick={() => navigate('/list-roles')}
                    >
                      <i className="bi bi-arrow-left me-1"></i> Back to Role List
                    </Button>
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

export default ViewRole;