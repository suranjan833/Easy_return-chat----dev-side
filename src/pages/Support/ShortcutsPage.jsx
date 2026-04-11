import React, { useState, useEffect } from 'react';
import { getShortcuts, createShortcut, updateShortcut, deleteShortcut } from '../../Services/widget';
import { toast } from 'react-toastify';
import { Accordion, AccordionItem, AccordionHeader, AccordionBody, Pagination, PaginationItem, PaginationLink, Button, Input } from 'reactstrap';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

const ShortcutsPage = () => {
  const [siteId, setSiteId] = useState('');
  const [sites, setSites] = useState([]);
  const [shortcuts, setShortcuts] = useState([]);
  const [filteredShortcuts, setFilteredShortcuts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newShortcut, setNewShortcut] = useState({ shortcut_name: '', message_content: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSiteIdSubmitted, setIsSiteIdSubmitted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [openAccordion, setOpenAccordion] = useState('');
  const [error, setError] = useState(null);
  const [editingShortcut, setEditingShortcut] = useState(null);
  const token = localStorage.getItem('accessToken');
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    if (!token) {
      toast.error('No authentication token found. Please log in.');
      window.location.href = '/auth-login';
      return;
    }

    const fetchSites = async () => {
      try {
        setIsSubmitting(true);
        const response = await axios.get(`${BASE_URL}/sites/?skip=0&limit=100`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        const sitesData = Array.isArray(response.data.records) ? response.data.records : [];
        setSites(sitesData);
        setError(null);
      } catch (err) {
        console.error('Error fetching sites:', err);
        if (err.response?.status === 401) {
          toast.error('Unauthorized: Please log in again.');
          localStorage.removeItem('accessToken');
          window.location.href = '/auth-login';
        } else {
          setError(err.response?.data?.detail || 'Failed to load sites.');
          toast.error(err.response?.data?.detail || 'Failed to load sites.');
        }
      } finally {
        setIsSubmitting(false);
      }
    };

    fetchSites();
  }, [token]);

  const handleSiteSelect = async (e) => {
    const selectedSiteId = e.target.value;
    setSiteId(selectedSiteId);
    if (!selectedSiteId) {
      setIsSiteIdSubmitted(false);
      setShortcuts([]);
      setFilteredShortcuts([]);
      setCurrentPage(1);
      setEditingShortcut(null);
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await getShortcuts(selectedSiteId);
      setShortcuts(data);
      setFilteredShortcuts(data);
      setIsSiteIdSubmitted(true);
      setCurrentPage(1);
      setSearchQuery('');
      setEditingShortcut(null);
      toast.success(`Loaded shortcuts for Site ID: ${selectedSiteId}`);
    } catch (err) {
      toast.error('Failed to fetch shortcuts: ' + (err.message || 'Unknown error'));
      setIsSiteIdSubmitted(false);
      setShortcuts([]);
      setFilteredShortcuts([]);
      setEditingShortcut(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearchInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) {
      setFilteredShortcuts(shortcuts);
      setCurrentPage(1);
    } else {
      const filtered = shortcuts.filter(
        (shortcut) =>
          shortcut.shortcut_name.toLowerCase().includes(trimmedQuery) ||
          shortcut.message_content.toLowerCase().includes(trimmedQuery)
      );
      setFilteredShortcuts(filtered);
      setCurrentPage(1);
    }
  };

  const handleCreateShortcut = async (e) => {
    e.preventDefault();
    if (!isSiteIdSubmitted || !siteId || isNaN(siteId)) {
      toast.error('Please select a valid Site ID before creating a shortcut.');
      return;
    }
    if (!newShortcut.shortcut_name.trim() || !newShortcut.message_content.trim()) {
      toast.error('Shortcut name and content are required.');
      return;
    }
    if (newShortcut.shortcut_name.length > 100) {
      toast.error('Shortcut name cannot exceed 100 characters.');
      return;
    }
    if (newShortcut.message_content.length > 1000) {
      toast.error('Content cannot exceed 1000 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = { ...newShortcut, site_id: Number(siteId) };
      await createShortcut(data);
      toast.success('Shortcut created!');
      setNewShortcut({ shortcut_name: '', message_content: '' });
      const updatedShortcuts = await getShortcuts(siteId);
      setShortcuts(updatedShortcuts);
      setFilteredShortcuts(updatedShortcuts);
      setCurrentPage(1);
    } catch (err) {
      if (err.response && err.response.status === 422) {
        const errorDetails = err.response?.data?.detail || 'Invalid data provided.';
        toast.error(`Failed to create shortcut: ${errorDetails}`);
      } else {
        toast.error(err.message || 'Failed to create shortcut.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateShortcut = async (shortcutId) => {
    if (!editingShortcut.shortcut_name.trim() || !editingShortcut.message_content.trim()) {
      toast.error('Shortcut name and content are required.');
      return;
    }
    if (editingShortcut.shortcut_name.length > 100) {
      toast.error('Shortcut name cannot exceed 100 characters.');
      return;
    }
    if (editingShortcut.message_content.length > 1000) {
      toast.error('Content cannot exceed 1000 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        shortcut_name: editingShortcut.shortcut_name,
        message_content: editingShortcut.message_content,
        site_id: Number(siteId)
      };
      await updateShortcut(shortcutId, data);
      toast.success('Shortcut updated!');
      setEditingShortcut(null);
      const updatedShortcuts = await getShortcuts(siteId);
      setShortcuts(updatedShortcuts);
      setFilteredShortcuts(updatedShortcuts);
      setCurrentPage(1);
    } catch (err) {
      if (err.response && err.response.status === 422) {
        const errorDetails = err.response?.data?.detail || 'Invalid data provided.';
        toast.error(`Failed to update shortcut: ${errorDetails}`);
      } else {
        toast.error(err.message || 'Failed to update shortcut.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteShortcut = async (shortcutId) => {
    if (!window.confirm('Are you sure you want to delete this shortcut?')) {
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteShortcut(shortcutId);
      toast.success('Shortcut deleted!');
      const updatedShortcuts = await getShortcuts(siteId);
      setShortcuts(updatedShortcuts);
      setFilteredShortcuts(updatedShortcuts);
      setCurrentPage(1);
      setEditingShortcut(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete shortcut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditShortcut = (shortcut) => {
    setEditingShortcut({ ...shortcut });
    setOpenAccordion(shortcut.id.toString());
  };

  const handleCopyContent = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Content copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy content: ' + (err.message || 'Unknown error'));
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentShortcuts = filteredShortcuts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredShortcuts.length / itemsPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      setOpenAccordion(null);
    }
  };

  const toggleAccordion = (id) => {
    setOpenAccordion(openAccordion === id ? null : id);
  };

  return (
    <div className="container" style={{ marginTop: '70px' }}>
      <h3>Manage Shortcuts</h3>
      <div className="card mb-3">
        <div className="card-body">
          <h5>Select Site</h5>
          <div className="input-group mb-3">
            <Input
              type="select"
              value={siteId}
              onChange={handleSiteSelect}
              disabled={isSubmitting || sites.length === 0}
              aria-label="Select Site"
            >
              <option value="">Select a site...</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.domain}
                </option>
              ))}
            </Input>
          </div>
          {error && (
            <p className="text-danger mt-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </p>
          )}
        </div>
      </div>
      {isSiteIdSubmitted && (
        <div className="card mb-3">
          <div className="card-body">
            <h5>Create Shortcut</h5>
            <form onSubmit={handleCreateShortcut}>
              <div className="mb-3">
                <label className="form-label">Shortcut Name</label>
                <Input
                  type="text"
                  value={newShortcut.shortcut_name}
                  onChange={(e) => setNewShortcut({ ...newShortcut, shortcut_name: e.target.value })}
                  required
                  disabled={isSubmitting}
                  maxLength={100}
                  aria-label="Shortcut name"
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Content</label>
                <textarea
                  className="form-control"
                  value={newShortcut.message_content}
                  onChange={(e) => setNewShortcut({ ...newShortcut, message_content: e.target.value })}
                  required
                  disabled={isSubmitting}
                  maxLength={1000}
                  rows="4"
                  aria-label="Shortcut content"
                ></textarea>
              </div>
              <Button type="submit" color="primary" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Shortcut'}
              </Button>
            </form>
          </div>
        </div>
      )}
      {isSiteIdSubmitted && (
        <div className="card">
          <div className="card-body">
            <h5>Shortcuts</h5>
            <div className="input-group mb-3">
              <Input
                type="text"
                value={searchQuery}
                onChange={handleSearchInputChange}
                placeholder="Search by name or content..."
                aria-label="Search shortcuts"
                disabled={!isSiteIdSubmitted || isSubmitting}
              />
            </div>
            {filteredShortcuts.length === 0 ? (
              <p className="text-muted">
                {searchQuery ? `No shortcuts found for "${searchQuery}".` : 'No shortcuts available.'}
              </p>
            ) : (
              <>
                <p className="text-muted mb-3">
                  Showing {indexOfFirstItem + 1}–{ Math.min(indexOfLastItem, filteredShortcuts.length) } of { filteredShortcuts.length } shortcuts
                </p>
                <Accordion open={openAccordion} toggle={toggleAccordion}>
                  {currentShortcuts.map((shortcut) => (
                    <AccordionItem key={shortcut.id}>
                      <AccordionHeader targetId={shortcut.id.toString()}>
                        <div className="d-flex justify-content-between w-100 align-items-center">
                          <span>{shortcut.shortcut_name}</span>
                          <div>
                            <i
                              className="bi bi-clipboard me-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyContent(shortcut.message_content);
                              }}
                              style={{ cursor: 'pointer' }}
                            ></i>
                            <i
                              className="bi bi-pencil me-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditShortcut(shortcut);
                              }}
                              style={{ cursor: 'pointer' }}
                            ></i>
                            <i
                              className="bi bi-trash"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteShortcut(shortcut.id);
                              }}
                              style={{ cursor: 'pointer' }}
                            ></i>
                          </div>
                        </div>
                      </AccordionHeader>
                      <AccordionBody accordionId={shortcut.id.toString()}>
                        {editingShortcut && editingShortcut.id === shortcut.id ? (
                          <div className="p-3">
                            <div className="mb-3">
                              <label className="form-label">Shortcut Name</label>
                              <Input
                                type="text"
                                value={editingShortcut.shortcut_name}
                                onChange={(e) =>
                                  setEditingShortcut({ ...editingShortcut, shortcut_name: e.target.value })
                                }
                                required
                                disabled={isSubmitting}
                                maxLength={100}
                                aria-label="Edit shortcut name"
                              />
                            </div>
                            <div className="mb-3">
                              <label className="form-label">Content</label>
                              <textarea
                                className="form-control"
                                value={editingShortcut.message_content}
                                onChange={(e) =>
                                  setEditingShortcut({ ...editingShortcut, message_content: e.target.value })
                                }
                                required
                                disabled={isSubmitting}
                                maxLength={1000}
                                rows="4"
                                aria-label="Edit shortcut content"
                              ></textarea>
                            </div>
                            <Button
                              color="primary"
                              onClick={() => handleUpdateShortcut(shortcut.id)}
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? 'Updating...' : 'Update Shortcut'}
                            </Button>
                            <Button
                              color="secondary"
                              onClick={() => setEditingShortcut(null)}
                              disabled={isSubmitting}
                              className="ms-2"
                            >
                              Cancel 
                            </Button>
                          </div>
                        ) : (
                          <p className="p-3">{shortcut.message_content}</p>
                        )}
                      </AccordionBody>
                    </AccordionItem>
                  ))}
                </Accordion>
                {totalPages > 1 && (
                  <Pagination className="mt-3" aria-label="Shortcuts pagination">
                    <PaginationItem disabled={currentPage === 1}>
                      <PaginationLink previous onClick={() => paginate(currentPage - 1)} />
                    </PaginationItem>
                    {[...Array(totalPages)].map((_, index) => (
                      <PaginationItem key={index + 1} active={currentPage === index + 1}>
                        <PaginationLink onClick={() => paginate(index + 1)}>
                          {index + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem disabled={currentPage === totalPages}>
                      <PaginationLink next onClick={() => paginate(currentPage + 1)} />
                    </PaginationItem>
                  </Pagination>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShortcutsPage;