import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Table, Spinner, Alert, Modal, Card, Badge, Pagination } from 'react-bootstrap';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const SiteList = () => {
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, siteId: null, siteDomain: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;
  const searchInputRef = useRef(null);
  const token = localStorage.getItem('accessToken');
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://chatsupport.fskindia.com';


  useEffect(() => {
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    const fetchSites = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${BASE_URL}/sites/?skip=${(currentPage - 1) * itemsPerPage}&limit=${itemsPerPage}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }
        );
        const sitesData = Array.isArray(response.data.records) ? response.data.records : [];
        setSites(sitesData);
        setTotalItems(response.data.total || sitesData.length); // Assuming API returns total
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
  }, [navigate, token, currentPage]);

  const filteredSites = sites.filter(
    (site) =>
      site.domain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.id?.toString().includes(searchTerm)
  );

  const handleCreateSite = () => navigate('/sites/create');
  const handleViewSite = (siteId) => navigate(`/sites/${siteId}`);
  const handleEditSite = (siteId) => navigate(`/edit-site/${siteId}`);
  const handleVerifySite = (siteId) => navigate(`/sites/verify?siteId=${siteId}`);
  const handleViewUsers = (siteId) => navigate(`/site/${siteId}/users`);
  const handleViewAgents = (siteId) => navigate(`/site/${siteId}/agents`);
  const handleViewManagers = (siteId) => navigate(`/site/${siteId}/managers`);

  const openDeleteModal = (siteId, siteDomain) => {
    setDeleteModal({ isOpen: true, siteId, siteDomain });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, siteId: null, siteDomain: '' });
  };

  const handleDeleteSite = async () => {
    if (!deleteModal.siteId) {
      setError('Invalid site ID.');
      closeDeleteModal();
      return;
    }

    setDeleting(true);
    try {
      await axios.delete(`${BASE_URL}/sites/${deleteModal.siteId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      setSites(sites.filter((site) => site.id !== deleteModal.siteId));
      setSuccess(`Site "${deleteModal.siteDomain}" deleted successfully.`);
      setTimeout(() => setSuccess(null), 3000); // Clear success after 3s
      setError(null);
    } catch (err) {
      console.error('Error deleting site:', err);
      if (err.response?.status === 401) {
        setError('Unauthorized: Please log in again.');
        localStorage.removeItem('accessToken');
        navigate('/auth-login');
      } else if (err.response?.status === 404) {
        setError('Site not found.');
      } else if (err.response?.status === 422) {
        setError(err.response.data.detail?.map((e) => e.msg).join(', ') || 'Invalid site ID.');
      } else {
        setError(err.response?.data?.detail || 'Failed to delete site.');
      }
    } finally {
      setDeleting(false);
      closeDeleteModal();
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const renderPagination = () => (
    <Pagination className="mt-3 justify-content-center">
      <Pagination.First
        onClick={() => setCurrentPage(1)}
        disabled={currentPage === 1}
      />
      <Pagination.Prev
        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
        disabled={currentPage === 1}
      />
      {[...Array(totalPages).keys()].map((page) => (
        <Pagination.Item
          key={page + 1}
          active={page + 1 === currentPage}
          onClick={() => setCurrentPage(page + 1)}
        >
          {page + 1}
        </Pagination.Item>
      ))}
      <Pagination.Next
        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
        disabled={currentPage === totalPages}
      />
      <Pagination.Last
        onClick={() => setCurrentPage(totalPages)}
        disabled={currentPage === totalPages}
      />
    </Pagination>
  );

  if (loading) {
    return (
      <Container className="my-5 d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 text-muted">Loading sites...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center mt-5">
            <div>
              <h3 className="fw-bold mb-1 mt-2">Site Management</h3>
              <p className="text-muted mb-0">View and manage all your sites</p>
            </div>
            <Button
              variant="primary"
              onClick={handleCreateSite}
              className="d-flex align-items-center"
            >
              <i className="bi bi-plus-lg me-2"></i> Add New Site
            </Button>
          </div>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h5 className="fw-bold mb-1">All Sites</h5>
                  <small className="text-muted">
                    Showing {filteredSites.length} {filteredSites.length === 1 ? 'site' : 'sites'} of {totalItems}
                  </small>
                </div>
                <div className="w-25">
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="bi bi-search text-muted"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      placeholder="Search by domain or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      ref={searchInputRef}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="danger" className="border-0 bg-danger bg-opacity-10">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert variant="success" className="border-0 bg-success bg-opacity-10">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  {success}
                </Alert>
              )}

              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>ID</th>
                      <th>Domain</th>
                      <th>Status</th>
                      <th>Created At</th>
                      <th >Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSites.length > 0 ? (
                      filteredSites.map((site) => (
                        <tr key={site.id}>
                          <td className="fw-semibold">#{site.id}</td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="bg-primary bg-opacity-10 p-2 rounded me-3">
                                <i className="bi bi-globe text-primary"></i>
                              </div>
                              <span className="fw-medium">{site.domain}</span>
                            </div>
                          </td>
                          <td>
                            <Badge bg={site.verified ? 'success' : 'warning'} pill>
                              {site.verified ? 'Verified' : 'Pending'}
                            </Badge>
                          </td>
                          <td>
                            <small className="text-muted">
                              {new Date(site.created_at).toLocaleString()}
                            </small>
                          </td>
                          <td className="text-end">
                            {!site.verified && (
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => handleVerifySite(site.id)}
                                className="me-2"
                                title="Verify Site"
                              >
                                <i className="bi bi-check-circle me-1"></i> Verify
                              </Button>
                            )}
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleViewSite(site.id)}
                              className="me-2"
                              title="View Site"
                            >
                              <i className="bi bi-eye me-1"></i> View
                            </Button>
                            <Button
                              variant="outline-warning"
                              size="sm"
                              onClick={() => handleEditSite(site.id)}
                              className="me-2"
                              title="Edit Site"
                            >
                              <i className="bi bi-pencil me-1"></i> Edit
                            </Button>
                            <Button
                              variant="outline-info"
                              size="sm"
                              onClick={() => handleViewUsers(site.id)}
                              className="me-2"
                              title="View Users"
                            >
                              <i className="bi bi-people me-1"></i> Users
                            </Button>
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => handleViewAgents(site.id)}
                              className="me-2"
                              title="View Agents"
                            >
                              <i className="bi bi-person-shield me-1"></i> Agents
                            </Button>
                            <Button
                              variant="outline-dark"
                              size="sm"
                              onClick={() => handleViewManagers(site.id)}
                              className="me-2"
                              title="View Managers"
                            >
                              <i className="bi bi-person-gear me-1"></i> Managers
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => openDeleteModal(site.id, site.domain)}
                              disabled={deleting}
                              title="Delete Site"
                            >
                              <i className="bi bi-trash me-1"></i> Delete
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center py-5">
                          <div className="py-3">
                            <i className="bi bi-globe text-muted fs-1"></i>
                            <p className="mt-2 text-muted">No sites found</p>
                            {searchTerm ? (
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="mt-2"
                                onClick={handleClearSearch}
                              >
                                Clear Search
                              </Button>
                            ) : (
                              <Button
                                variant="primary"
                                size="sm"
                                className="mt-2"
                                onClick={handleCreateSite}
                              >
                                <i className="bi bi-plus-lg me-1"></i> Create Site
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
              {totalPages > 1 && renderPagination()}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Delete Confirmation Modal */}
      <Modal show={deleteModal.isOpen} onHide={closeDeleteModal} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-4">
          <div className="d-flex flex-column align-items-center text-center">
            <div className="bg-danger bg-opacity-10 p-3 rounded-circle mb-3">
              <i className="bi bi-exclamation-triangle-fill text-danger fs-4"></i>
            </div>
            <p className="mb-0">
              Are you sure you want to delete the site <strong>"{deleteModal.siteDomain}"</strong>?<br />
              This action cannot be undone.
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="outline-secondary" onClick={closeDeleteModal} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteSite} disabled={deleting}>
            {deleting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Deleting...
              </>
            ) : (
              'Delete Site'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default SiteList;