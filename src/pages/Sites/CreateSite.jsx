import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Label, Input, Row, Col, Button, Spinner, Badge } from 'reactstrap';
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

const CreateSite = () => {
  const navigate = useNavigate();
  // CHANGE: Added bot_replies to formData state with default value false
  const [formData, setFormData] = useState({ domain: '', bot_replies: false });
  const [sites, setSites] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const token = localStorage.getItem('accessToken');

  // Fetch sites on mount
  useEffect(() => {
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    const fetchSites = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${BASE_URL}/sites/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        // Debug the API response

        
        // Handle different response structures
        const sitesData = Array.isArray(response.data) 
          ? response.data 
          : Array.isArray(response.data.records) 
            ? response.data.records 
            : Array.isArray(response.data.data) 
              ? response.data.data 
              : [];
              
        setSites(sitesData);
        setError(null);
      } catch (err) {
        console.error('Error fetching sites:', err);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in again.');
          localStorage.removeItem('accessToken');
          navigate('/auth-login');
        } else {
          setError(err.response?.data?.message || 'Failed to load sites. Please try again.');
        }
        setSites([]); // Ensure sites is always an array
      } finally {
        setLoading(false);
      }
    };

    fetchSites();
  }, [navigate, token, success]); // Added success to dependencies to refresh after creation

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    // CHANGE: Handle checkbox input for bot_replies
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

    try {
      setSubmitting(true);
      const response = await axios.post(
        `${BASE_URL}/sites/`,
        {
          domain: formData.domain,
          // CHANGE: Include bot_replies in POST payload
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

      setSuccess('Site created successfully!');
      setFormData({ domain: '', bot_replies: false }); // CHANGE: Reset bot_replies to false
      // Refresh sites list
      const sitesResponse = await axios.get(`${BASE_URL}/sites/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const refreshedSites = Array.isArray(sitesResponse.data) 
        ? sitesResponse.data 
        : Array.isArray(sitesResponse.data.records) 
          ? sitesResponse.data.records 
          : [];
      setSites(refreshedSites);
    } catch (err) {
      console.error('Error creating site:', err);
      if (err.response?.status === 401) {
        setError('Unauthorized: Please log in again.');
        localStorage.removeItem('accessToken');
        navigate('/auth-login');
      } else if (err.response?.status === 422) {
        const validationErrors = err.response.data.detail?.map((error) => error.msg).join(', ');
        setError(`Validation Error: ${validationErrors || 'Please check the input field.'}`);
      } else {
        setError(err.response?.data?.message || 'An error occurred while creating the site.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Content>
        <Head title="Create Site" />
        <div className="text-center py-4">
          <Spinner color="primary" />
          <p className="mt-2">Loading sites...</p>
        </div>
      </Content>
    );
  }

  return (
    <Content>
      <Head title="Create Site" />
      <Block size="lg">
        <BlockHead>
          <BlockHeadContent>
            <BlockTitle tag="h4">Create New Site</BlockTitle>
          </BlockHeadContent>
        </BlockHead>
        
        <PreviewCard>
          <OverlineTitle tag="h5" className="preview-title-lg ">
            <Icon name="plus" className="me-2" />
            Site Details
          </OverlineTitle>
          
          {error && (
            <div className="alert alert-danger d-flex align-items-center">
              <Icon name="alert-circle" className="me-2" />
              {error}
            </div>
          )}
          
          {success && (
            <div className="alert alert-success d-flex align-items-center">
              <Icon name="check-circle" className="me-2" />
              {success}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <Row className="gy-3">
              <Col sm="6">
                <div className="form-group">
                  <Label htmlFor="domain" className="form-label">
                    Domain Name
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
                  <small className="text-muted">Enter the full domain name (e.g., example.com)</small>
                </div>
              </Col>
              {/* CHANGE: Added checkbox for enabling/disabling bot replies */}
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
                  <small className="text-muted">Toggle to enable or disable bot replies for this site</small>
                </div>
              </Col>
              <Col sm="12" className='p-2'>
                <div className="d-flex gap-2">
                  <Button
                    color="primary"
                    type="submit"
                    disabled={submitting} style={{height:"30px"}}
                  >
                    {submitting ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Creating...
                      </>
                    ) : (
                      'Create Site'
                    )}
                  </Button>
                  <Button
                    color="light"
                    type="button"
                    style={{height:"30px"}}
                    // CHANGE: Reset bot_replies when clearing form
                    onClick={() => setFormData({ domain: '', bot_replies: false })}
                    disabled={submitting}
                  >
                    Clear
                  </Button>
                </div>
              </Col>
            </Row>
          </form>
        </PreviewCard>

        {/* Sites Table */}
        <PreviewCard className="mt-4">
          <OverlineTitle tag="h5" className="preview-title-lg">
            <Icon name="list" className="me-2" />
            Existing Sites ({sites.length})
          </OverlineTitle>
          
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Domain</th>
                  <th>Status</th>
                  {/* CHANGE: Added Bot Replies column */}
                  <th>Bot Replies</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {sites.length > 0 ? (
                  sites.map((site) => (
                    <tr key={site.id}>
                      <td>{site.id}</td>
                      <td className="fw-medium">{site.domain}</td>
                      <td>
                        <Badge color={site.verified ? "success" : "warning"} pill>
                          {site.verified ? "Verified" : "Pending"}
                        </Badge>
                      </td>
                      {/* CHANGE: Display Bot Replies status */}
                      <td>
                        <Badge color={site.bot_replies ? "success" : "secondary"} pill>
                          {site.bot_replies ? "Enabled" : "Disabled"}
                        </Badge>
                      </td>
                      <td>
                        {site.created_at ? new Date(site.created_at).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-4">
                      <Icon name="globe" className="fs-1 text-muted mb-2" />
                      <p className="text-muted">No sites found</p>
                      <Button 
                        color="primary" 
                        size="sm"
                        onClick={() => window.scrollTo(0, 0)}
                      >
                        Create First Site
                      </Button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </PreviewCard>
      </Block>
    </Content>
  );
};

export default CreateSite;