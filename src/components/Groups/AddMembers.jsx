import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Input, FormGroup, Label } from 'reactstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const BASE_URL = "https://chatsupport.fskindia.com";

const handleApiError = (err, navigate) => {
  console.error('API Error:', err);
  if (err.response?.status === 401) {
    localStorage.removeItem('accessToken');
    navigate('/auth-login');
    return 'Unauthorized: Please log in again.';
  }
  return err.response?.data?.detail || err.message || 'An unexpected error occurred.';
};

const AddMembersModal = ({ isOpen, toggle, group, onMembersAdded }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const token = localStorage.getItem('accessToken');
  const groupId = group?.id;

  const fetchedOnOpenRef = useRef(false); // Add this ref

  const fetchUsers = async () => {
    if (!groupId || isNaN(groupId)) {
      setError('Invalid group ID.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/groups/${groupId}/users_not_in_group`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (!Array.isArray(response.data)) {
        setUsers([]);
        setError('Unexpected response format from server.');
        return;
      }
 
      // Filter out users already in the group based on group_members property (using email for robustness)
      const groupMemberEmails = new Set(group?.group_members?.map(member => member.email));
      const availableUsers = response.data.filter(user => !groupMemberEmails.has(user.email));
      setUsers(availableUsers);
      setError(null);
    } catch (err) {
      setError(handleApiError(err, navigate));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    if (isOpen) {
      // Only fetch if the modal just opened and we haven't fetched yet for this open cycle
      if (!fetchedOnOpenRef.current) {
        fetchUsers();
        fetchedOnOpenRef.current = true; // Mark as fetched
      }
    } else {
      // Reset state and ref when modal closes
      setSelectedUserIds([]);
      setSearchTerm('');
      setError(null);
      setSuccessMessage(null);
      fetchedOnOpenRef.current = false; // Reset for next open
    }
  }, [isOpen, token, groupId, navigate]);

  // useEffect(() => {
  //   if (isOpen) {
  //     console.log('Current Group in AddMembersModal:', group);
  //     console.log('Users fetched (should be non-members):', users);
  //   }
  // }, [isOpen, group, users]);

  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id?.toString().includes(searchTerm)
    );
  }, [users, searchTerm]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUserIds(filteredUsers.map(user => user.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleAddMembers = async () => {
    if (!groupId || isNaN(groupId)) {
      setError('Invalid group ID.');
      return;
    }

    if (selectedUserIds.length === 0) {
      setError('Please select at least one user to add.');
      return;
    }

    try {
      setLoading(true);
      await axios.post(
        `${BASE_URL}/groups/add_members`,
        {
          group_id: Number(groupId),
          user_ids: selectedUserIds,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );
      setSuccessMessage('Users successfully added to the group!');
      setError(null);
      setSelectedUserIds([]);
      setTimeout(() => setSuccessMessage(null), 5000);
      onMembersAdded(groupId, selectedUserIds);
      toggle(); // Close the modal after successful addition
    } catch (err) {
      setError(handleApiError(err, navigate));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} centered size="lg">
      <ModalHeader toggle={toggle}>Add Members to {group?.name}</ModalHeader>
      <ModalBody>
        {error && <div className="alert alert-danger">{error}</div>}
        {successMessage && <div className="alert alert-success">{successMessage}</div>}
        <Input
          type="text"
          placeholder="Search users by name or email..."
          className="mb-3"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {loading ? (
          <p>Loading users...</p>
        ) : filteredUsers.length === 0 ? (
          <p>No users found or all available users are already in the group.</p>
        ) : (
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <FormGroup check className="mb-2">
              <Input
                type="checkbox"
                id="selectAllUsers"
                checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                onChange={handleSelectAll}
              />
              <Label check htmlFor="selectAllUsers" className="ml-2 font-weight-bold">
                Select All ({selectedUserIds.length}/{filteredUsers.length})
              </Label>
            </FormGroup>
            <hr />
            {filteredUsers.map((user) => (
              <FormGroup check key={user.id} className="mb-2">
                <Input
                  type="checkbox"
                  id={`user-${user.id}`}
                  checked={selectedUserIds.includes(user.id)}
                  onChange={() => handleSelectUser(user.id)}
                />
                <Label check htmlFor={`user-${user.id}`} className="ml-2">
                  {user.first_name} {user.last_name} ({user.email})
                </Label>
              </FormGroup>
            ))}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="primary" onClick={handleAddMembers} disabled={selectedUserIds.length === 0 || loading}>
          {loading ? 'Adding...' : `Add Selected (${selectedUserIds.length})`}
        </Button>{' '}
        <Button color="secondary" onClick={toggle}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default AddMembersModal;
