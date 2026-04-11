import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Button,
  Table,
  Spinner,
  Alert,
  Card,
  CardBody,
  Badge,
  Pagination,
  PaginationItem,
  PaginationLink,
  InputGroup,
  InputGroupText,
  Input,
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormGroup,
} from 'reactstrap';
import axios from 'axios';
import { debounce } from 'lodash';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Content from '@/layout/content/Content';
import Head from '@/layout/head/Head';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Managers = () => {
  const navigate = useNavigate();
  const [managers, setManagers] = useState([]);
  const [filteredManagers, setFilteredManagers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, managerId: null, managerEmail: '' });
  const [avatarModal, setAvatarModal] = useState({ isOpen: false, managerId: null, managerName: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    const fetchManagers = async () => {
      try {
        setLoading(true);
        const skip = (currentPage - 1) * itemsPerPage;
        const response = await axios.get(`${BASE_URL}/users/managers?skip=${skip}&limit=${itemsPerPage}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        const data = response.data;
        const validManagers = Array.isArray(data.records || data.data || data)
          ? (data.records || data.data || data).filter(
              (manager) => manager.id && manager.email && manager.first_name && manager.last_name
            )
          : [];
        setManagers(validManagers);
        setFilteredManagers(validManagers);
        setTotalItems(data.total || validManagers.length); // Assumes API returns total count
        setError(null);
      } catch (err) {
        console.error('Error fetching managers:', err);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in again.');
          localStorage.removeItem('accessToken');
          navigate('/auth-login');
        } else {
          setError(err.response?.data?.detail || 'Failed to load managers.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchManagers();
  }, [navigate, token, currentPage, itemsPerPage]);

  // Sorting logic
  const handleSort = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
  };

  const handleSortKeyDown = (e, key) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleSort(key);
      e.preventDefault();
    }
  };

  const sortedManagers = useMemo(() => {
    return [...filteredManagers].sort((a, b) => {
      if (sortConfig.key === 'id') {
        return sortConfig.direction === 'asc' ? a.id - b.id : b.id - a.id;
      }
      if (sortConfig.key === 'email') {
        return sortConfig.direction === 'asc'
          ? a.email.localeCompare(b.email)
          : b.email.localeCompare(a.email);
      }
      if (sortConfig.key === 'first_name') {
        return sortConfig.direction === 'asc'
          ? a.first_name.localeCompare(b.first_name)
          : b.first_name.localeCompare(a.first_name);
      }
      if (sortConfig.key === 'last_name') {
        return sortConfig.direction === 'asc'
          ? a.last_name.localeCompare(b.last_name)
          : b.last_name.localeCompare(a.last_name);
      }
      if (sortConfig.key === 'department') {
        const deptA = a.department?.name || 'N/A';
        const deptB = b.department?.name || 'N/A';
        return sortConfig.direction === 'asc'
          ? deptA.localeCompare(deptB)
          : deptB.localeCompare(deptA);
      }
      return 0;
    });
  }, [filteredManagers, sortConfig]);

  // Search logic
  const handleSearch = debounce((value) => {
    setSearchTerm(value);
  }, 300);

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredManagers(managers);
    } else {
      const filtered = managers.filter(
        (manager) =>
          manager.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (manager.first_name &&
            manager.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (manager.last_name &&
            manager.last_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (manager.id && manager.id.toString().includes(searchTerm)) ||
          (manager.department?.name &&
            manager.department.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredManagers(filtered);
    }
    setCurrentPage(1);
  }, [searchTerm, managers]);

  // Pagination logic
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const renderPaginationItems = () => {
    const items = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let page = startPage; page <= endPage; page++) {
      items.push(
        <PaginationItem key={page} active={page === currentPage}>
          <PaginationLink onClick={() => setCurrentPage(page)}>{page}</PaginationLink>
        </PaginationItem>
      );
    }
    return items;
  };

  // Delete manager
  const handleDelete = async () => {
    const { managerId } = deleteModal;
    if (!managerId) {
      setError('Invalid manager ID.');
      closeDeleteModal();
      return;
    }

    setDeleting(true);
    try {
      await axios.delete(`${BASE_URL}/users/${managerId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      setManagers((prev) => prev.filter((manager) => manager.id !== managerId));
      setFilteredManagers((prev) => prev.filter((manager) => manager.id !== managerId));
      setTotalItems((prev) => prev - 1);
      setError(null);
    } catch (err) {
      console.error('Error deleting manager:', err);
      if (err.response?.status === 401) {
        setError('Unauthorized: Please log in again.');
        localStorage.removeItem('accessToken');
        navigate('/auth-login');
      } else if (err.response?.status === 403) {
        setError('Cannot delete admin user or action forbidden.');
      } else if (err.response?.status === 404) {
        setError('Manager not found.');
      } else if (err.response?.status === 422) {
        setError(err.response.data.detail?.map((e) => e.msg).join(', ') || 'Invalid manager ID.');
      } else {
        setError(err.response?.data?.detail || 'Failed to delete manager.');
      }
    } finally {
      setDeleting(false);
      closeDeleteModal();
    }
  };

  const openDeleteModal = (managerId, managerEmail) => {
    setDeleteModal({ isOpen: true, managerId, managerEmail });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, managerId: null, managerEmail: '' });
  };

  // Profile picture upload
  const openAvatarModal = (managerId, managerName) => {
    setAvatarModal({ isOpen: true, managerId, managerName });
    setSelectedFile(null);
  };

  const closeAvatarModal = () => {
    setAvatarModal({ isOpen: false, managerId: null, managerName: '' });
    setSelectedFile(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && ['image/jpeg', 'image/png'].includes(file.type)) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('File size exceeds 5MB limit.');
        setSelectedFile(null);
      } else {
        setSelectedFile(file);
        setError(null);
      }
    } else {
      setSelectedFile(null);
      setError('Please select a valid image file (JPEG or PNG).');
    }
  };

  const handleUploadAvatar = async () => {
    const { managerId } = avatarModal;
    if (!managerId || !selectedFile) {
      setError('Invalid manager ID or no file selected.');
      closeAvatarModal();
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('user_id', managerId);
      const response = await axios.post(`${BASE_URL}/users/upload-profile-image`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      const profile_picture = response.data.filename || response.data.url;
      setManagers((prev) =>
        prev.map((manager) =>
          manager.id === managerId ? { ...manager, profile_picture } : manager
        )
      );
      setFilteredManagers((prev) =>
        prev.map((manager) =>
          manager.id === managerId ? { ...manager, profile_picture } : manager
        )
      );
      setError(null);
    } catch (err) {
      console.error('Avatar upload error:', err);
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((e) => e.msg).join(', '));
      } else {
        setError('Failed to upload profile picture.');
      }
    } finally {
      setUploading(false);
      closeAvatarModal();
    }
  };

  // Navigation handlers
  const handleCreateManager = () => {
    navigate('/create-user', { state: { preSelectRole: 'manager' } });
  };
  const handleViewManager = (managerId) => navigate(`/users/${managerId}`);
  const handleEditManager = (managerId) =>
    navigate(`/update-user/${managerId}`, { state: { from: '/managers' } });
  const handleAgentDetails = (managerId) => navigate(`/agent-details/${managerId}`);
  const handleUsersBySite = (siteId) => navigate(`/site/${siteId}/users`);
  const handleAgentsBySite = (siteId) => navigate(`/site/${siteId}/agents`);
  const handleManagersBySite = (siteId) => navigate(`/site/${siteId}/managers`);

  if (loading) {
    return (
      <Content>
        <Head title="Managers" />
        <Container
          className="my-5 d-flex justify-content-center align-items-center"
          style={{ minHeight: '60vh' }}
        >
          <div className="text-center">
            <Spinner color="primary" style={{ width: '3rem', height: '3rem' }} />
            <p className="mt-3 text-muted">Loading managers...</p>
          </div>
        </Container>
      </Content>
    );
  }

  return (
    <Content>
      <Head title="Managers" />
      <Container className="py-4">
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h3 className="fw-bold mb-1">Manager Management</h3>
                <p className="text-muted mb-0">View and manage all your managers</p>
              </div>
              <Button
                color="primary"
                onClick={handleCreateManager}
                className="d-flex align-items-center"
              >
                <i className="bi bi-plus-lg me-2"></i> Add New Manager
              </Button>
            </div>
          </Col>
        </Row>

        <Row>
          <Col>
            <Card className="border-0 shadow-sm">
              <CardBody className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div>
                    <h5 className="fw-bold mb-1">All Managers</h5>
                    <small className="text-muted">
                      Showing {filteredManagers.length} of {totalItems}{' '}
                      {totalItems === 1 ? 'manager' : 'managers'}
                    </small>
                  </div>
                  <div className="w-25">
                    <InputGroup>
                      <InputGroupText className="bg-light border-end-0">
                        <i className="bi bi-search text-muted"></i>
                      </InputGroupText>
                      <Input
                        type="text"
                        className="border-start-0"
                        placeholder="Search managers..."
                        onChange={(e) => handleSearch(e.target.value)}
                        aria-label="Search managers by email, name, ID, or department"
                      />
                    </InputGroup>
                  </div>
                </div>

                {error && (
                  <Alert color="danger" className="border-0 bg-danger bg-opacity-10">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {error}
                  </Alert>
                )}

                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th
                          onClick={() => handleSort('id')}
                          onKeyDown={(e) => handleSortKeyDown(e, 'id')}
                          role="button"
                          tabIndex={0}
                        >
                          ID {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th
                          onClick={() => handleSort('email')}
                          onKeyDown={(e) => handleSortKeyDown(e, 'email')}
                          role="button"
                          tabIndex={0}
                        >
                          Email{' '}
                          {sortConfig.key === 'email' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th
                          onClick={() => handleSort('first_name')}
                          onKeyDown={(e) => handleSortKeyDown(e, 'first_name')}
                          role="button"
                          tabIndex={0}
                        >
                          First Name{' '}
                          {sortConfig.key === 'first_name' &&
                            (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th
                          onClick={() => handleSort('last_name')}
                          onKeyDown={(e) => handleSortKeyDown(e, 'last_name')}
                          role="button"
                          tabIndex={0}
                        >
                          Last Name{' '}
                          {sortConfig.key === 'last_name' &&
                            (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th
                          onClick={() => handleSort('department')}
                          onKeyDown={(e) => handleSortKeyDown(e, 'department')}
                          role="button"
                          tabIndex={0}
                        >
                          Department{' '}
                          {sortConfig.key === 'department' &&
                            (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedManagers.length > 0 ? (
                        sortedManagers.map((manager) => (
                          <tr key={manager.id}>
                            <td className="fw-semibold">#{manager.id}</td>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="p-2 rounded me-3">
                                  {manager.profile_picture ? (
                                    <img
                                      src={manager.profile_picture}
                                      alt={`${manager.first_name} ${manager.last_name}`}
                                      style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                                    />
                                  ) : (
                                    <i className="bi bi-person-fill text-primary fs-4"></i>
                                  )}
                                </div>
                                <span className="fw-medium">{manager.email}</span>
                              </div>
                            </td>
                            <td>{manager.first_name}</td>
                            <td>{manager.last_name}</td>
                            <td>{manager.department?.name || 'N/A'}</td>
                            <td>
                              <Badge color={manager.is_active ? 'success' : 'warning'} pill>
                                {manager.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="text-end">
                              <Button
                                color="outline-primary"
                                size="sm"
                                onClick={() => handleViewManager(manager.id)}
                                className="me-2"
                                title="View Manager"
                              >
                                <i className="bi bi-eye me-1"></i> View
                              </Button>
                              <Button
                                color="outline-warning"
                                size="sm"
                                onClick={() => handleEditManager(manager.id)}
                                className="me-2"
                                title="Edit Manager"
                              >
                                <i className="bi bi-pencil me-1"></i> Edit
                              </Button>
                              <Button
                                color="outline-danger"
                                size="sm"
                                onClick={() => openDeleteModal(manager.id, manager.email)}
                                disabled={deleting}
                                className="me-2"
                                title="Delete Manager"
                              >
                                <i className="bi bi-trash me-1"></i> Delete
                              </Button>
                              <Dropdown className="d-inline">
                                <DropdownToggle color="outline-secondary" size="sm" caret className="me-2">
                                  <i className="bi bi-three-dots me-1"></i> More
                                </DropdownToggle>
                                <DropdownMenu>
                                  <DropdownItem
                                    onClick={() =>
                                      openAvatarModal(
                                        manager.id,
                                        `${manager.first_name} ${manager.last_name}`
                                      )
                                    }
                                  >
                                    <i className="bi bi-image me-2"></i> Upload Avatar
                                  </DropdownItem>
                                  <DropdownItem onClick={() => handleAgentDetails(manager.id)}>
                                    <i className="bi bi-user-star me-2"></i> Agent Details
                                  </DropdownItem>
                                  {manager.site_ids?.length > 0 && (
                                    <DropdownItem tag="div">
                                      <DropdownMenu>
                                        {manager.site_ids.map((siteId) => (
                                          <React.Fragment key={siteId}>
                                            <DropdownItem
                                              onClick={() => handleUsersBySite(siteId)}
                                            >
                                              <i className="bi bi-building me-2"></i> Site {siteId} Users
                                            </DropdownItem>
                                            <DropdownItem
                                              onClick={() => handleAgentsBySite(siteId)}
                                            >
                                              <i className="bi bi-user-star me-2"></i> Site {siteId} Agents
                                            </DropdownItem>
                                            <DropdownItem
                                              onClick={() => handleManagersBySite(siteId)}
                                            >
                                              <i className="bi bi-user-shield me-2"></i> Site {siteId} Managers
                                            </DropdownItem>
                                          </React.Fragment>
                                        ))}
                                      </DropdownMenu>
                                    </DropdownItem>
                                  )}
                                </DropdownMenu>
                              </Dropdown>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center py-5">
                            <div className="py-3">
                              <i className="bi bi-people text-muted fs-1"></i>
                              <p className="mt-2 text-muted">
                                {searchTerm ? 'No matching managers found' : 'No managers found'}
                              </p>
                              {searchTerm ? (
                                <Button
                                  color="outline-primary"
                                  size="sm"
                                  className="mt-2"
                                  onClick={() => setSearchTerm('')}
                                >
                                  Clear search
                                </Button>
                              ) : (
                                <Button
                                  color="primary"
                                  size="sm"
                                  className="mt-2"
                                  onClick={handleCreateManager}
                                >
                                  <i className="bi bi-plus-lg me-1"></i> Add New Manager
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>

                {totalItems > 0 && totalPages > 1 && (
                  <div className="d-flex justify-content-between align-items-center mt-4">
                    <Dropdown>
                      <DropdownToggle color="outline-secondary" caret>
                        Items per page: {itemsPerPage}
                      </DropdownToggle>
                      <DropdownMenu>
                        {[5, 10, 20, 50].map((value) => (
                          <DropdownItem
                            key={value}
                            onClick={() => setItemsPerPage(value)}
                            active={itemsPerPage === value}
                          >
                            {value}
                          </DropdownItem>
                        ))}
                      </DropdownMenu>
                    </Dropdown>
                    <Pagination>
                      <PaginationItem disabled={currentPage === 1}>
                        <PaginationLink first onClick={() => setCurrentPage(1)} />
                      </PaginationItem>
                      <PaginationItem disabled={currentPage === 1}>
                        <PaginationLink
                          previous
                          onClick={() => setCurrentPage(currentPage - 1)}
                        />
                      </PaginationItem>
                      {renderPaginationItems()}
                      <PaginationItem disabled={currentPage === totalPages}>
                        <PaginationLink
                          next
                          onClick={() => setCurrentPage(currentPage + 1)}
                        />
                      </PaginationItem>
                      <PaginationItem disabled={currentPage === totalPages}>
                        <PaginationLink last onClick={() => setCurrentPage(totalPages)} />
                      </PaginationItem>
                    </Pagination>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={deleteModal.isOpen} toggle={closeDeleteModal} centered>
          <ModalHeader toggle={closeDeleteModal} className="border-0">
            <h5 className="fw-bold">Confirm Delete</h5>
          </ModalHeader>
          <ModalBody className="py-4">
            <div className="d-flex flex-column align-items-center text-center">
              <div className="bg-danger bg-opacity-10 p-3 rounded-circle mb-3">
                <i className="bi bi-exclamation-triangle-fill text-danger fs-4"></i>
              </div>
              <p className="mb-0">
                Are you sure you want to delete the manager{' '}
                <strong>"{deleteModal.managerEmail}"</strong>?<br />
                This action cannot be undone.
              </p>
            </div>
          </ModalBody>
          <ModalFooter className="border-0">
            <Button color="secondary" onClick={closeDeleteModal} disabled={deleting}>
              Cancel
            </Button>
            <Button color="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Deleting...
                </>
              ) : (
                'Delete Manager'
              )}
            </Button>
          </ModalFooter>
        </Modal>

        {/* Profile Picture Upload Modal */}
        <Modal isOpen={avatarModal.isOpen} toggle={closeAvatarModal} centered>
          <ModalHeader toggle={closeAvatarModal} className="border-0">
            <h5 className="fw-bold">Upload Profile Picture</h5>
          </ModalHeader>
          <ModalBody className="py-4">
            <div className="text-center">
              <p className="mb-3">
                Upload a profile picture for{' '}
                <strong>"{avatarModal.managerName || 'Manager'}"</strong>
              </p>
              <FormGroup>
                <Input type="file" accept="image/jpeg,image/png" onChange={handleFileChange} />
                <small className="text-muted">Select a JPEG or PNG image (max 5MB).</small>
              </FormGroup>
              {selectedFile && (
                <img
                  src={URL.createObjectURL(selectedFile)}
                  alt="Preview"
                  style={{ maxWidth: '100%', maxHeight: '200px', marginTop: '10px' }}
                />
              )}
            </div>
          </ModalBody>
          <ModalFooter className="border-0">
            <Button color="secondary" onClick={closeAvatarModal} disabled={uploading}>
              Cancel
            </Button>
            <Button
              color="primary"
              onClick={handleUploadAvatar}
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Uploading...
                </>
              ) : (
                'Upload Picture'
              )}
            </Button>
          </ModalFooter>
        </Modal>
      </Container>
    </Content>
  );
};

export default Managers;