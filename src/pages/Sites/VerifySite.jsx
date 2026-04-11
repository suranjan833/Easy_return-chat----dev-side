import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://chatsupport.fskindia.com';

const VerifySite = () => {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState('');
  const [sites, setSites] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }


    const fetchSites = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/sites/?skip=0&limit=10`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Cache-Control': 'no-cache'
          },
        });
        const sitesData = (response.data.records || response.data).map(site => ({
          ...site,
          verified: site.id === 3 ? false : !!site.verified, // Temp fix for Site 3
          api_key: site.api_key || 'N/A'
        }));
        setSites(sitesData);
        setError(null);


      } catch (err) {
        console.error('Error fetching sites:', err);
        if (err.response?.status === 401) {
          setError('Session expired. Please log in again.');
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

  useEffect(() => {
    let timeout;
    if (success) {
      timeout = setTimeout(() => setSuccess(null), 3000);
    }
    return () => clearTimeout(timeout);
  }, [success]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!apiKey) {
      setError('API key is required.');
      return;
    }

    if (apiKey.length < 3) {
      setError('API key appears to be too short.');
      return;
    }

    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    try {
      setSubmitting(true);
      const response = await axios.post(
        `${BASE_URL}/sites/verify?api_key=${encodeURIComponent(apiKey)}`, // Reverted to query param
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );


      setSuccess(`Site "${response.data.domain}" verified successfully!`);
      setApiKey('');

      setTimeout(async () => {
        try {
          const sitesResponse = await axios.get(`${BASE_URL}/sites/?skip=0&limit=10`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            },
          });
          const sitesData = (sitesResponse.data.records || sitesResponse.data).map(site => ({
            ...site,
            verified: site.id === 3 ? false : !!site.verified, // Temp fix
            api_key: site.api_key || 'N/A'
          }));
          setSites(sitesData);
        } catch (err) {
          console.error('Error refreshing sites:', err);
        }
      }, 500);
    } catch (err) {
      console.error('Error verifying site:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        localStorage.removeItem('accessToken');
        navigate('/auth-login');
      } else if (err.response?.status === 403) {
        setError('Forbidden: You do not have permission to verify sites. Contact admin.');
      } else if (err.response?.status === 404) {
        setError('No site found for the provided API key.');
      } else if (err.response?.status === 422) {
        const validationErrors = err.response.data.detail?.map((error) => error.msg).join(', ');
        setError(`Validation Error: ${validationErrors || 'Invalid API key or request format.'}`);
      } else {
        setError(err.response?.data?.detail || 'An error occurred while verifying the site.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Content>
        <Head title="Verify Site" />
        <div className="text-center">
          <Spinner color="primary" />
          <p>Loading...</p>
        </div>
      </Content>
    );
  }

  return (
    <Content>
      <Head title="Verify Site" />
      <Block size="lg">
        <BlockHead className="d-flex justify-content-between align-items-center">
          <BlockHeadContent>
            <BlockTitle tag="h5">Verify Site</BlockTitle>
          </BlockHeadContent>
          <Button
            color="light"
            outline
            onClick={() => navigate('/sites/list')}
            className="btn-dim"
          >
            <Icon name="arrow-left"></Icon>
            <span>Back to Site List</span>
          </Button>
        </BlockHead>
        <PreviewCard>
          <OverlineTitle tag="span" className="preview-title-lg">
            Site Verification
          </OverlineTitle>
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <form onSubmit={handleSubmit}>
            <Row className="gy-4">
              <Col sm="6">
                <div className="form-group">
                  <Label htmlFor="apiKey" className="form-label">
                    API Key
                  </Label>
                  <div className="form-control-wrap position-relative">
                    <div className="form-icon form-icon-left">
                      <Icon name="key" />
                    </div>
                    <Input
                      id="apiKey"
                      name="apiKey"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter API key"
                      type="text"
                      required
                      disabled={submitting}
                    />
                    {apiKey && (
                      <Button
                        color="light"
                        outline
                        className="btn-icon position-absolute end-0"
                        onClick={() => setApiKey('')}
                        disabled={submitting}
                      >
                        <Icon name="cross" />
                      </Button>
                    )}
                  </div>
                  <small className="form-text text-muted">
                    Enter the API key associated with the site you want to verify
                  </small>
                </div>
              </Col>
              <Col sm="12">
                <Button
                  color="primary"
                  type="submit"
                  disabled={submitting || loading || !apiKey}
                  className="me-2"
                >
                  {submitting ? <Spinner size="sm" /> : 'Verify Site'}
                </Button>
                <Button
                  color="light"
                  outline
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

        <PreviewCard className="mt-4">
          <OverlineTitle tag="span" className="preview-title-lg">
            Existing Sites
          </OverlineTitle>
          <div className="table-responsive">
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Domain</th>
                  <th>Verified</th>
                  <th>API Key</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {sites.length > 0 ? (
                  sites.map((site) => (
                    <tr key={site.id}>
                      <td>{site.id}</td>
                      <td>{site.domain}</td>
                      <td>
                        {site.verified ? (
                          <span className="badge badge-success">Yes</span>
                        ) : (
                          <span className="badge badge-danger">No</span>
                        )}
                        <small className="text-muted d-block">
                          Verified: {site.verified === true ? 'true' : 'false'}
                        </small>
                      </td>
                      <td>
                        <code>{site.api_key}</code>
                      </td>
                      <td>{site.created_at ? new Date(site.created_at).toLocaleString() : 'N/A'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center">
                      No sites found.
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

export default VerifySite;