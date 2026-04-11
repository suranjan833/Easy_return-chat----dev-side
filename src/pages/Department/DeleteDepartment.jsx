// src/RouteComponent/Department/DeleteDepartment.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Content from '@/layout/content/Content';
import Head from '@/layout/head/Head';
import { Button, Row, Col } from 'reactstrap';
import {
  Block,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  PreviewCard,
  OverlineTitle,
} from '@/GlobalComponents/Component';
import axios from 'axios';
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const DeleteDepartment = () => {
  const { departmentId } = useParams();
  const navigate = useNavigate();
  const [department, setDepartment] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDepartment = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await axios.get(`${BASE_URL}/departments/${departmentId}`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        setDepartment(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching department:', err);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in again.');
          navigate('/auth-login');
        } else {
          setError('Failed to load department data.');
        }
        setLoading(false);
      }
    };
    fetchDepartment();
  }, [departmentId, navigate]);

  const handleDelete = async () => {
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      // Assuming a DELETE endpoint exists
      await axios.delete(`${BASE_URL}/departments/${departmentId}`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      alert('Department Deleted Successfully!');
      navigate('/list-departments');
    } catch (err) {
      console.error('Error deleting department:', err);
      if (err.response?.status === 401) {
        setError('Unauthorized: Please log in again.');
        navigate('/auth-login');
      } else {
        setError('An error occurred while deleting the department.');
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Content>
      <Head title="Delete Department" />
      <Block size="lg">
        <BlockHead>
          <BlockHeadContent>
            <BlockTitle tag="h5">Delete Department</BlockTitle>
          </BlockHeadContent>
        </BlockHead>
        <PreviewCard>
          <OverlineTitle tag="span" className="preview-title-lg">
            Confirm Deletion
          </OverlineTitle>
          {error && <div className="alert alert-danger">{error}</div>}
          <div>
            <p>
              Are you sure you want to delete the department <strong>{department?.name}</strong>? This action cannot be undone.
            </p>
            <Row className="gy-4">
              <Col sm="12">
                <Button color="danger" onClick={handleDelete}>
                  Confirm Delete
                </Button>
                <Button
                  color="secondary"
                  onClick={() => navigate('/list-departments')}
                  style={{ marginLeft: '10px' }}
                >
                  Cancel
                </Button>
              </Col>
            </Row>
          </div>
        </PreviewCard>
      </Block>
    </Content>
  );
};

export default DeleteDepartment;