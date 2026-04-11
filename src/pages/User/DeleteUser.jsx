import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Content from "@/layout/content/Content";
import Head from "@/layout/head/Head";
import { Button, Row, Col, Spinner } from "reactstrap";
import {
  Block,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  PreviewCard,
  OverlineTitle,
} from "@/components/Component";
import axios from 'axios';
const BASE_URL = import.meta.env.VITE_API_BASE_URL;


const DeleteUser = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Fetch user data on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${BASE_URL}/users/${userId}`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        setUser(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching user:', err);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in again.');
          localStorage.removeItem('accessToken');
          navigate('/auth-login');
        } else {
          setError(err.response?.data?.detail || 'Failed to load user data.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId, navigate]);

  // Handle deletion
  const handleDelete = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    setError(null);
    setDeleting(true);

    try {
      await axios.delete(`${BASE_URL}/users/${userId}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      alert('User deleted successfully!');
      navigate('/users/list'); // Updated route for consistency
    } catch (err) {
      console.error('Error deleting user:', err);
      if (err.response?.status === 401) {
        setError('Unauthorized: Please log in again.');
        localStorage.removeItem('accessToken');
        navigate('/auth-login');
      } else if (err.response?.status === 404) {
        setError('User not found. It may have already been deleted.');
      } else {
        setError(err.response?.data?.detail || 'An error occurred while deleting the user.');
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Content>
        <Head title="Delete User" />
        <div className="text-center">
          <Spinner color="primary" />
          <p>Loading user data...</p>
        </div>
      </Content>
    );
  }

  return (
    <Content>
      <Head title="Delete User" />
      <Block size="lg">
        <BlockHead>
          <BlockHeadContent>
            <BlockTitle tag="h5">Delete User</BlockTitle>
          </BlockHeadContent>
        </BlockHead>
        <PreviewCard>
          <OverlineTitle tag="span" className="preview-title-lg">
            Confirm Deletion
          </OverlineTitle>
          {error && <div className="alert alert-danger">{error}</div>}
          
          <div className="p-4">
            {user ? (
              <>
                <p className="lead">
                  Are you sure you want to permanently delete this user?
                </p>
                <div className="user-details mb-4">
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Name:</strong> {user.first_name} {user.last_name}</p>
                  <p><strong>Role:</strong> {user.role?.name || 'N/A'}</p>
                  <p><strong>Status:</strong> {user.is_active ? 'Active' : 'Inactive'}</p>
                </div>
                <p className="text-danger">
                  <strong>Warning:</strong> This action cannot be undone. All user data will be permanently removed.
                </p>
              </>
            ) : (
              <p>User information not available</p>
            )}
            
            <Row className="mt-4">
              <Col sm="12">
                <Button
                  color="danger"
                  onClick={handleDelete}
                  disabled={deleting || !user}
                >
                  {deleting ? <Spinner size="sm" /> : 'Confirm Deletion'}
                </Button>
                <Button
                  color="secondary"
                  onClick={() => navigate('/users/list')}
                  className="ms-3"
                  disabled={deleting}
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

export default DeleteUser;