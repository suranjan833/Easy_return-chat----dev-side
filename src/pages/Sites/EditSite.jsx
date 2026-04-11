import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Label, Input, Row, Col, Button, Spinner } from 'reactstrap';
import Content from '@/layout/content/Content';
import Head from '@/layout/head/Head';
import {
  Block,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  PreviewCard,
  OverlineTitle,
  Icon,
} from '@/components/Component';
import axios from 'axios';
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const EditSite = () => {
  const navigate = useNavigate();
  const { siteId } = useParams();
  // CHANGE: Added bot_replies to formData state with default value false
  const [formData, setFormData] = useState({
    domain: '',
    api_key: '',
    verified: false,
    bot_replies: false,
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const token = localStorage.getItem('accessToken');

  // Fetch site details on mount
  useEffect(() => {
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    const fetchSite = async () => {
      try {
        // Assuming GET /sites/{site_id} exists for fetching a single site
        const response = await axios.get(`${BASE_URL}/sites/${siteId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        // CHANGE: Include bot_replies in formData from API response
        setFormData({
          domain: response.data.domain || '',
          api_key: response.data.api_key || '',
          verified: response.data.verified || false,
          bot_replies: response.data.bot_replies || false,
        });
        setError(null);
      } catch (err) {
        console.error('Error fetching site:', err);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in again.');
          localStorage.removeItem('accessToken');
          navigate('/auth-login');
        } else if (err.response?.status === 404) {
          setError('Site not found.');
        } else {
          setError('Failed to load site details. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSite();
  }, [navigate, token, siteId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.domain) {
      setError('Domain is required.');
      return;
    }

    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    try {
      setSubmitting(true);
      const response = await axios.put(
        `${BASE_URL}/sites/${siteId}`,
        {
          domain: formData.domain,
          api_key: formData.api_key,
          verified: formData.verified,
          bot_replies: formData.bot_replies,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );


      setSuccess('Site updated successfully!');
    } catch (err) {
      console.error('Error updating site:', err);
      if (err.response?.status === 401) {
        setError('Unauthorized: Please log in again.');
        localStorage.removeItem('accessToken');
        navigate('/auth-login');
      } else if (err.response?.status === 422) {
        const validationErrors = err.response.data.detail?.map((error) => error.msg).join(', ');
        setError(`Validation Error: ${validationErrors || 'Please check the input fields.'}`);
      } else if (err.response?.status === 404) {
        setError('Site not found.');
      } else {
        setError(err.response?.data?.detail || 'An error occurred while updating the site.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Content>
        <Head title="Edit Site" />
        <div className="text-center">
          <Spinner color="primary" />
          <p>Loading...</p>
        </div>
      </Content>
    );
  }

  return (
    <Content>
      <Head title="Edit Site" />
      <Block size="lg">
        <BlockHead>
          <BlockHeadContent>
            <BlockTitle tag="h5">Edit Site</BlockTitle>
          </BlockHeadContent>
        </BlockHead>
        <PreviewCard>
          <OverlineTitle tag="span" className="preview-title-lg">
            Site Details
          </OverlineTitle>
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <form onSubmit={handleSubmit}>
            <Row className="gy-4">
              <Col sm="6">
                <div className="form-group">
                  <Label htmlFor="domain" className="form-label">
                    Domain
                  </Label>
                  <div className="form-control-wrap">
                    <div className="form-icon form-icon-left">
                      <Icon name="globe" />
                    </div>
                    <Input
                      id="domain"
                      name="domain"
                      value={formData.domain}
                      onChange={handleChange}
                      placeholder="example.com"
                      type="text"
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>
              </Col>
              <Col sm="6">
                <div className="form-group">
                  <Label htmlFor="api_key" className="form-label">
                    API Key
                  </Label>
                  <div className="form-control-wrap">
                    <div className="form-icon form-icon-left">
                      <Icon name="key" />
                    </div>
                    <Input
                      id="api_key"
                      name="api_key"
                      value={formData.api_key}
                      onChange={handleChange}
                      placeholder="Enter API key"
                      type="text"
                      disabled={submitting}
                    />
                  </div>
                </div>
              </Col>
              <Col sm="6">
                <div className="form-group">
                  <Label htmlFor="verified" className="form-label">
                    Verified
                  </Label>
                  <div className="form-control-wrap">
                    <Input
                      id="verified"
                      name="verified"
                      type="checkbox"
                      checked={formData.verified}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </div>
                </div>
              </Col>
              <Col sm="6">
                <div className="form-group">
                  <Label htmlFor="bot_replies" className="form-label">
                    Enable Bot Replies
                  </Label>
                  <div className="form-control-wrap">
                    <Input
                      id="bot_replies"
                      name="bot_replies"
                      type="checkbox"
                      checked={formData.bot_replies}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </div>
                </div>
              </Col>
              <Col sm="12">
                <Button
                  color="primary"
                  type="submit"
                  disabled={submitting || loading}
                  className="me-2"
                >
                  {submitting ? <Spinner size="sm" /> : 'Update Site'}
                </Button>
                <Button
                  color="secondary"
                  type="button"
                  onClick={() => navigate('/sites/list')}
                  disabled={submitting || loading}
                >
                  Cancel
                </Button>
              </Col>
            </Row>
          </form>
        </PreviewCard>
      </Block>
    </Content>
  );
};

export default EditSite;