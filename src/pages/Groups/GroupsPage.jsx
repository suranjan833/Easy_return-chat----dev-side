import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Spinner, Alert } from 'react-bootstrap';
import { getGroups } from '../../Services/api.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import debounce from 'lodash/debounce';

const GroupPage = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const token = localStorage.getItem('accessToken');
  const userId = localStorage.getItem('userId');

  // Conditional logging for development only
  const log = process.env.NODE_ENV === 'development' ? console.log : () => { };

  useEffect(() => {
    const isValidUserId = userId && /^\d+$/.test(userId);
    if (!token || !isValidUserId) {
      setError('Invalid session. Please log in again.');
      setLoading(false);
      navigate('/auth-login');
      return;
    }

    const fetchGroups = async () => {
      try {
        setLoading(true);
        const fetchedGroups = await getGroups({ search: searchTerm });
        log('Raw API Response:', fetchedGroups);
        if (!Array.isArray(fetchedGroups)) {
          throw new Error('Expected an array of groups');
        }
        const validGroups = fetchedGroups.filter(
          (group) => group && typeof group === 'object' && Number.isInteger(group.id)
        );
        setGroups(validGroups);
        setError(null);
      } catch (err) {
        const errorMessage = err.response?.data?.detail
          ? Array.isArray(err.response.data.detail)
            ? err.response.data.detail.map((d) => d.msg).join(', ')
            : err.response.data.detail
          : err.message || 'Failed to load groups';
        setError(errorMessage);
        if (err.response?.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('userId');
          navigate('/auth-login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [navigate, token, userId, searchTerm]);

  const debouncedSearch = useCallback(
    debounce((value) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  const handleCreateGroup = () => {
    navigate('/groups/create');
  };

  const handleGroupClick = (group) => {
    navigate(`/groups/${group.id}/messages`, {
      state: { groupName: group.name, avatar_url: group.avatar_url },
    });
  };

  const getGroupInitials = (name) => {
    if (!name || typeof name !== 'string') return 'G';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }
    return words
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('');
  };

  if (loading) {
    return (
      <Container className="my-5 d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 text-muted">Loading groups...</p>
        </div>
      </Container>
    );
  }

  return (
    <div className="d-flex" style={{ height: '100vh', padding: '10px', marginTop: '60px', fontFamily: "'Inter', sans-serif" }}>
      <div className="d-flex flex-column bg-white shadow-sm" style={{ width: '350px', border: '12px solid #e9ecef0' }}>
        <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
          <h2 className="mb-0" style={{ fontSize: '1.5rem', color: '#1a1a1a' }}>
            Groups
          </h2>
          <Button
            variant="primary"
            onClick={handleCreateGroup}
            className="d-flex align-items-center"
            aria-label="Create a new group"
          >
            <i className="bi bi-plus-lg me-2" aria-hidden="true"></i> Create Group
          </Button>
        </div>

        <div className="p-3 border-bottom">
          <div className="input-group rounded-3 overflow-hidden">
            <span className="input-group-text border-0 mx-1 my-1">
              <i className="bi bi-search" style={{ color: '#6c757d', fontSize: '17px' }}></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search groups..."
              onChange={(e) => debouncedSearch(e.target.value)}
              aria-label="Search groups by name or ID"
              style={{ fontSize: '14px', border: 'none' }}
            />
          </div>
        </div>

        <div className="flex-grow-1 overflow-auto">
          {groups.length === 0 ? (
            <div className="text-center text-muted p-3">
              <p>No groups found.</p>
              <Button variant="primary" size="sm" onClick={handleCreateGroup} aria-label="Create a new group">
                Create Group
              </Button>
            </div>
          ) : (
            groups.map((group) => (
              <div
                key={group.id}
                className="d-flex align-items-center p-3 border-bottom d-pointer"
                onClick={() => handleGroupClick(group)}
                style={{ transition: 'background-color 0.2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f3f5')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div className="position-relative me-3">
                  {group.avatar_url ? (
                    <img
                      src={group.avatar_url}
                      alt={group.name || 'Group avatar'}
                      className="rounded-circle"
                      style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white"
                      style={{ width: '40px', height: '40px', fontSize: '16px' }}
                    >
                      {getGroupInitials(group.name)}
                    </div>
                  )}
                </div>
                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between align-items-center">
                    <strong className="text-dark" style={{ fontSize: '14px' }}>
                      {group.name || 'Unnamed Group'}
                    </strong>
                  </div>
                  <small className="text-muted text-truncate" style={{ maxWidth: '150px', fontSize: '12px' }}>
                    {group.description
                      ? group.description.length > 20
                        ? group.description.substring(0, 20) + '...'
                        : group.description
                      : 'No description'}
                  </small>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center ms-3 bg-white rounded-3 shadow-sm">
        <i className="bi bi-chat-square" style={{ fontSize: '5rem', color: '#dee2e6' }}></i>
        <h4 className="mt-3 text-muted">Select a group to start messaging</h4>
      </div>

      {error && (
        <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1050 }}>
          <Alert
            variant="danger"
            className="border-0 bg-danger bg-opacity-10"
            onClose={() => setError(null)}
            dismissible
          >
            <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true"></i>
            {error}
          </Alert>
        </div>
      )}
    </div>
  );
};

export default GroupPage;