import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, Row, Col, Spinner, Table } from 'reactstrap';
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

const DepartmentStatistics = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    // console.log('DepartmentStatistics Token:', token); // Debug token
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
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        // console.log('Departments Response:', response.data); // Debug response
        setDepartments(Array.isArray(response.data) ? response.data : []);
        setError(null);
      } catch (err) {
        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in again.');
          localStorage.removeItem('accessToken');
          navigate('/auth-login');
        } else {
          const errorMsg = err.response?.data?.detail
            ? Array.isArray(err.response.data.detail)
              ? err.response.data.detail.map((e) => e.msg).join(', ')
              : err.response.data.detail
            : 'Failed to load departments.';
          setError(errorMsg);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, [navigate]);

  const fetchStats = async () => {
    if (!selectedDepartment) {
      setError('Please select a department.');
      return;
    }
    setError(null);
    setLoadingStats(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('No authentication token found. Please log in.');
        navigate('/auth-login');
        return;
      }
      const response = await axios.get(`${BASE_URL}/departments/${selectedDepartment}/stats`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
      if (err.response?.status === 401) {
        setError('Unauthorized: Please log in again.');
        localStorage.removeItem('accessToken');
        navigate('/auth-login');
      } else {
        const errorMsg = err.response?.data?.detail
          ? Array.isArray(err.response.data.detail)
            ? err.response.data.detail.map((e) => e.msg).join(', ')
            : err.response.data.detail
          : 'Failed to load statistics.';
        setError(errorMsg);
      }
    } finally {
      setLoadingStats(false);
    }
  };

  if (loading) {
    return (
      <Content>
        <Head title="Department Statistics" />
        <div className="text-center">
          <Spinner color="primary" />
          <p>Loading departments...</p>
        </div>
      </Content>
    );
  }

  return (
    <Content>
      <Head title="Department Statistics" />
      <Block size="lg">
        <BlockHead>
          <BlockHeadContent>
            <BlockTitle tag="h5">Department Statistics</BlockTitle>
          </BlockHeadContent>
        </BlockHead>
        <PreviewCard>
          <OverlineTitle tag="span" className="preview-title-lg">
            Select a Department
          </OverlineTitle>
          {error && (
            <div className="alert alert-danger mb-4">
              {error}
              {error.includes('Failed to load departments') && (
                <span>
                  {' '}
                  <Button color="link" onClick={() => navigate('/list-departments')}>
                    Go to Departments
                  </Button>
                </span>
              )}
            </div>
          )}
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
              <Button
                color="primary"
                onClick={fetchStats}
                disabled={!selectedDepartment || loadingStats}
              >
                {loadingStats ? <Spinner size="sm" /> : 'Load Statistics'}
              </Button>
            </Col>
          </Row>
          {stats && (
            <div className="mt-4">
              <h6>
                Statistics for{' '}
                {departments.find((d) => d.id === parseInt(selectedDepartment))?.name}
              </h6>
              {Object.keys(stats).length > 0 ? (
                <Table striped>
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(stats).map(([key, value]) => (
                      <tr key={key}>
                        <td>{key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</td>
                        <td>{typeof value === 'object' ? JSON.stringify(value) : value}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p>No statistics available for this department.</p>
              )}
            </div>
          )}
        </PreviewCard>
      </Block>
    </Content>
  );
};

export default DepartmentStatistics;