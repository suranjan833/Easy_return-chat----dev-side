import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Row, Col, Spinner, Table, Badge, Modal, ModalHeader, ModalBody, ModalFooter, Alert } from 'reactstrap';
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

const ViewSite = () => {
  const navigate = useNavigate();
  const { siteId } = useParams();
  const [site, setSite] = useState(null);
  const [departments, setDepartments] = useState([]); // State for departments specific to this site
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null); // New state for success message
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, departmentId: null, departmentName: '' }); // State for delete confirmation modal
  const token = localStorage.getItem('accessToken');

  // Fetch site and associated departments on mount
  useEffect(() => {
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    const fetchData = async () => {
      try {
        const headers = {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        };

        // Fetch site details
        const siteResponse = await axios.get(`${BASE_URL}/sites/${siteId}`, { headers });
        setSite(siteResponse.data);

        // Fetch all departments and filter by site_id
        // Note: If the API supports ?site_id filtering, you can use `${BASE_URL}/departments/?site_id=${siteId}&skip=0&limit=100`
        const deptResponse = await axios.get(`${BASE_URL}/departments/?skip=0&limit=100`, { headers });
        const deptData = Array.isArray(deptResponse.data)
          ? deptResponse.data
          : Array.isArray(deptResponse.data.records)
            ? deptResponse.data.records
            : Array.isArray(deptResponse.data.data)
              ? deptResponse.data.data
              : [];
        // Filter departments to only those matching the current siteId
        const filteredDepartments = deptData.filter(
          (dept) => dept.site_id === parseInt(siteId) || dept.site_id === siteId
        );
        setDepartments(filteredDepartments);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in again.');
          localStorage.removeItem('accessToken');
          navigate('/auth-login');
        } else if (err.response?.status === 404) {
          setError('Site or departments not found.');
        } else {
          setError(err.response?.data?.detail || 'Failed to load site or department details.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, token, siteId]);

  // Handle navigation to department details
  const handleViewDepartment = (departmentId) => {
    navigate(`/view-department/${departmentId}`);
  };

  // Open delete confirmation modal
  const openDeleteModal = (departmentId, departmentName) => {
    setDeleteModal({ isOpen: true, departmentId, departmentName });
  };

  // Close delete confirmation modal
  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, departmentId: null, departmentName: '' });
  };

  // Handle department deletion
  const handleDeleteDepartment = async () => {
    const { departmentId } = deleteModal;
    if (!departmentId || isNaN(departmentId)) {
      setError('Invalid department ID.');
      closeDeleteModal();
      return;
    }

    try {
      await axios.delete(`${BASE_URL}/departments/${departmentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setDepartments((prevDepartments) => prevDepartments.filter((dept) => dept.id !== departmentId));
      setSuccess('Department deleted successfully!');
      setError(null);
      setTimeout(() => setSuccess(null), 3000); // Clear success message after 3 seconds
    } catch (err) {
      console.error('Failed to delete department:', err);
      setError(err.response?.data?.detail || 'Failed to delete department.');
    } finally {
      closeDeleteModal();
    }
  };

  if (loading) {
    return (
      <Content>
        <Head title="View Site" />
        <div className="text-center">
          <Spinner color="primary" />
          <p>Loading...</p>
        </div>
      </Content>
    );
  }

  if (!site) {
    return (
      <Content>
        <Head title="View Site" />
        <Block size="lg">
          <BlockHead>
            <BlockHeadContent>
              <BlockTitle tag="h5">View Site</BlockTitle>
            </BlockHeadContent>
          </BlockHead>
          <PreviewCard>
            {error && <div className="alert alert-danger">{error}</div>}
            <p>No site data available.</p>
          </PreviewCard>
        </Block>
      </Content>
    );
  }

  return (
    <Content>
      <Head title="View Site" />
      <Block size="lg">
        <BlockHead>
          <BlockHeadContent>
            <BlockTitle tag="h5">Site Details</BlockTitle>
          </BlockHeadContent>
        </BlockHead>
        <PreviewCard>
          <OverlineTitle tag="span" className="preview-title-lg">
            Site Information
          </OverlineTitle>
          {error && <div className="alert alert-danger">{error}</div>}
          {success && (
            <Alert color="success" className="border-0 bg-success bg-opacity-10">
              <i className="bi bi-check-circle-fill me-2"></i>
              {success}
            </Alert>
          )}
          <Row className="gy-4">
            <Col sm="6">
              <div className="form-group">
                <label className="form-label">ID</label>
                <div className="form-control-wrap">
                  <p className="form-control-static">{site.id}</p>
                </div>
              </div>
            </Col>
            <Col sm="6">
              <div className="form-group">
                <label className="form-label">Domain</label>
                <div className="form-control-wrap">
                  <p className="form-control-static">{site.domain}</p>
                </div>
              </div>
            </Col>
            <Col sm="6">
              <div className="form-group">
                <label className="form-label">API Key</label>
                <div className="form-control-wrap">
                  <p className="form-control-static">{site.api_key || 'N/A'}</p>
                </div>
              </div>
            </Col>
            <Col sm="6">
              <div className="form-group">
                <label className="form-label">Verified</label>
                <div className="form-control-wrap">
                  <p className="form-control-static">{site.verified ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </Col>
            <Col sm="6">
              <div className="form-group">
                <label className="form-label">Created At</label>
                <div className="form-control-wrap">
                  <p className="form-control-static">{new Date(site.created_at).toLocaleString()}</p>
                </div>
              </div>
            </Col>
            <Col sm="6">
              <div className="form-group">
                <label className="form-label">Updated At</label>
                <div className="form-control-wrap">
                  <p className="form-control-static">{site.updated_at ? new Date(site.updated_at).toLocaleString() : 'N/A'}</p>
                </div>
              </div>
            </Col>
            {/* Display departments associated with this specific site */}
            <Col sm="12">
              <OverlineTitle tag="span" className="preview-title-lg mt-4">
                Associated Departments
              </OverlineTitle>
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>ID</th>
                      <th>Department Name</th>
                      <th>Description</th>
                      <th>Manager</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.length > 0 ? (
                      departments.map((dept) => (
                        <tr key={dept.id}>
                          <td className="fw-semibold">#{dept.id}</td>
                          <td className="fw-medium">{dept.name || 'Unnamed Department'}</td>
                          <td>
                            <small className="text-muted">
                              {dept.description || 'No description available'}
                            </small>
                          </td>
                          <td>
                            {dept.manager && dept.manager.first_name && dept.manager.last_name
                              ? `${dept.manager.first_name} ${dept.manager.last_name}`
                              : 'None'}
                          </td>
                          <td className="text-end d-flex justify-content-end">
                            <Button
                              color="outline-primary"
                              size="sm"
                              onClick={() => handleViewDepartment(dept.id)}
                              title="View Department"
                              className="me-2"
                            >
                              <i className="bi bi-eye me-1"></i> View
                            </Button>
                            <Button
                              color="outline-danger"
                              size="sm"
                              onClick={() => openDeleteModal(dept.id, dept.name)}
                              title="Delete Department"
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
                            <i className="bi bi-building text-muted fs-1"></i>
                            <p className="mt-2 text-muted">No departments associated with this site</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Col>
            <Col sm="12">
              <Button
                color="primary"
                onClick={() => navigate(`/edit-site/${site.id}`)}
                className="me-2"
              >
                Edit Site
              </Button>
              <Button
                color="secondary"
                onClick={() => navigate('/sites/list')}
              >
                Back to Site List
              </Button>
            </Col>
          </Row>
        </PreviewCard>
      </Block>
      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModal.isOpen} toggle={closeDeleteModal} centered>
        <ModalHeader toggle={closeDeleteModal} className="border-0">
          <h5 className="modal-title fw-bold">Confirm Delete</h5>
        </ModalHeader>
        <ModalBody className="py-4">
          <div className="d-flex flex-column align-items-center text-center">
            <div className="bg-danger bg-opacity-10 p-3 rounded-circle mb-3">
              <i className="bi bi-exclamation-triangle-fill text-danger fs-4"></i>
            </div>
            <p className="mb-0">
              Are you sure you want to delete the department <strong>"{deleteModal.departmentName}"</strong>?<br />
              This action cannot be undone.
            </p>
          </div>
        </ModalBody>
        <ModalFooter className="border-0">
          <Button color="outline-secondary" onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button color="danger" onClick={handleDeleteDepartment}>
            Delete Department
          </Button>
        </ModalFooter>
      </Modal>
    </Content>
  );
};

export default ViewSite;
