import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Spinner } from 'reactstrap';
import Content from '@/layout/content/Content';
import Head from '@/layout/head/Head';
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

const GetAgentsByDepartment = () => {
  const navigate = useNavigate();
  const { department_id } = useParams();
  const [agents, setAgents] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    const fetchAgents = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/agents/departments/${department_id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        setAgents(Array.isArray(response.data) ? response.data : []);
        setError(null);
      } catch (err) {
        console.error('Error fetching agents:', err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          setError('Unauthorized: Please log in again.');
          localStorage.removeItem('accessToken');
          navigate('/auth-login');
        } else {
          setError('Failed to load agents. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, [navigate, token, department_id]);

  if (loading) {
    return (
      <Content>
        <Head title="Agents by Department" />
        <div className="text-center">
          <Spinner color="primary" />
          <p>Loading...</p>
        </div>
      </Content>
    );
  }

  return (
    <Content>
      <Head title="Agents by Department" />
      <Block size="lg">
        <BlockHead>
          <BlockHeadContent>
            <BlockTitle tag="h5">Agents in Department</BlockTitle>
          </BlockHeadContent>
        </BlockHead>
        <PreviewCard>
          <OverlineTitle tag="span" className="preview-title-lg">
            Agent List
          </OverlineTitle>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="table-responsive">
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {agents.length > 0 ? (
                  agents.map((agent) => (
                    <tr key={agent.id}>
                      <td>{agent.id}</td>
                      <td>{agent.name || 'N/A'}</td>
                      <td>{agent.email || 'N/A'}</td>
                      <td>{agent.role || 'N/A'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center">
                      No agents found in this department.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Button
            color="primary"
            onClick={() => navigate('/departments')}
            className="mt-3"
          >
            Back to Department List
          </Button>
        </PreviewCard>
      </Block>
    </Content>
  );
};

export default GetAgentsByDepartment;