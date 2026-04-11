
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Content from '@/layout/content/Content';
import Head from '@/layout/head/Head';
import { Input, Button, Table, Row, Col } from 'reactstrap'; // Added Row and Col imports
import {
  Block,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  PreviewCard,
  OverlineTitle,
} from '@/components/Component';
import axios from 'axios';
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const AgentsByDepartment = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [agents, setAgents] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await axios.get(`${BASE_URL}/departments/`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        setDepartments(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching departments:', err);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in again.');
          navigate('/auth-login');
        } else {
          setError('Failed to load departments.');
        }
        setLoading(false);
      }
    };
    fetchDepartments();
  }, [navigate]);

  const fetchAgents = async () => {
    if (!selectedDepartment) return;
    setError(null);
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/agents/departments/${selectedDepartment}`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      setAgents(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching agents:', err);
      if (err.response?.status === 401) {
        setError('Unauthorized: Please log in again.');
        navigate('/auth-login');
      } else {
        setError('Failed to load agents.');
      }
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Content>
      <Head title="Agents by Department" />
      <Block size="lg">
        <BlockHead>
          <BlockHeadContent>
            <BlockTitle tag="h5">Agents by Department</BlockTitle>
          </BlockHeadContent>
        </BlockHead>
        <PreviewCard>
          <OverlineTitle tag="span" className="preview-title-lg">
            Select a Department
          </OverlineTitle>
          {error && <div className="alert alert-danger">{error}</div>}
          <Row className="gy-4">
            <Col sm="6">
              <div className="form-group">
                <Input
                  type="select"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </Input>
              </div>
            </Col>
            <Col sm="6">
              <Button color="primary" onClick={fetchAgents} disabled={!selectedDepartment}>
                Load Agents
              </Button>
            </Col>
          </Row>
          {agents.length > 0 && (
            <Table striped className="mt-4">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id}>
                    <td>{agent.first_name} {agent.last_name}</td>
                    <td>{agent.email}</td>
                    <td>{agent.role_name || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </PreviewCard>
      </Block>
    </Content>
  );
};

export default AgentsByDepartment;
