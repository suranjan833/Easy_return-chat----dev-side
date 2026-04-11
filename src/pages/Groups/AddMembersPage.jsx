import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './AddMembersPage.css';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://chatsupport.fskindia.com";

const AddMembersPage = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('accessToken');

  const handleApiError = (err, navigate) => {
    if (err.code === 'ERR_NETWORK') {
      return 'Network error: Unable to connect to the server. Please check your connection or try again later.';
    }
    if (err.response?.status === 401) {
      localStorage.removeItem('accessToken');
      navigate('/auth-login');
      return 'Session expired. Please log in again.';
    }
    if (err.response?.status === 422) {
      const details = err.response.data.detail;
      if (Array.isArray(details)) {
        return details.map(e => e.msg).join(', ');
      }
      return 'Invalid group ID or input.';
    }
    if (err.response?.status === 404) {
      return 'Resource not found. Please check the group ID or try again.';
    }
    return err.response?.data?.detail || err.message || 'An unexpected error occurred.';
  };

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
      setUsers(response.data);
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

    fetchUsers();
  }, [navigate, token, groupId]);

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
      fetchUsers();
    } catch (err) {
      setError(handleApiError(err, navigate));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/app-group-chat');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add Members</h1>
            <p className="mt-2 text-gray-600">Add users to Group ID: {groupId}</p>
          </div>
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            aria-label="Back to groups"
          >
            <i className="bi bi-arrow-left mr-2"></i>
            Back to Groups
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Available Users</h2>
            <div className="w-full max-w-xs">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <i className="bi bi-search text-gray-400"></i>
                </span>
                <input
                  type="text"
                  className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Search users"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md flex items-center">
              <i className="bi bi-exclamation-triangle-fill text-red-500 mr-3"></i>
              <p className="text-red-700">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-600 transition-colors"
                aria-label="Close error alert"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-md flex items-center">
              <i className="bi bi-check-circle-fill text-green-500 mr-3"></i>
              <p className="text-green-700">{successMessage}</p>
              <button
                onClick={() => setSuccessMessage(null)}
                className="ml-auto text-green-500 hover:text-green-600 transition-colors"
                aria-label="Close success alert"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      aria-label="Select all users"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          aria-label={`Select ${user.first_name} ${user.last_name}`}
                        />
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">#{user.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                            <i className="bi bi-person-fill text-blue-600"></i>
                          </div>
                          <span className="font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{user.email || 'No email'}</td>
                      <td className="px-6 py-4 text-gray-600">{user.role?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedUserIds([user.id]);
                            handleAddMembers();
                          }}
                          className="inline-flex items-center px-3 py-1 border border-green-500 text-green-600 font-medium rounded-md hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                          title="Add to Group"
                          aria-label={`Add ${user.first_name} ${user.last_name} to group`}
                        >
                          <i className="bi bi-person-plus mr-1"></i>
                          Add
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div>
                        <i className="bi bi-person-x text-gray-400 text-4xl mb-3"></i>
                        <p className="text-gray-600 mb-4">
                          {searchTerm ? 'No users found for this search.' : 'No users available to add.'}
                        </p>
                        <div className="flex justify-center gap-3">
                          {searchTerm && (
                            <button
                              onClick={() => setSearchTerm('')}
                              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                              aria-label="Clear search"
                            >
                              Clear Search
                            </button>
                          )}
                          <button
                            onClick={handleBack}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            aria-label="Back to groups"
                          >
                            Back to Groups
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredUsers.length > 0 && (
            <div className="flex justify-end mt-6">
              <button
                onClick={handleAddMembers}
                disabled={selectedUserIds.length === 0 || loading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                aria-label="Add selected members"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding...
                  </>
                ) : (
                  <>
                    <i className="bi bi-person-plus-fill mr-2"></i>
                    Add Selected Members
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddMembersPage;