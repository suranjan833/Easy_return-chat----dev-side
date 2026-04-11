import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './UsersNotInGroupPage.css';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://chatsupport.fskindia.com";

const UsersNotInGroupPage = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(groupId || '');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('accessToken');

  const handleApiError = (err, navigate) => {
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
      return 'Invalid input.';
    }
    return err.response?.data?.detail || err.message || 'An unexpected error occurred.';
  };

  const fetchGroups = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/groups/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (!Array.isArray(response.data)) {
        setGroups([]);
        setError('Unexpected groups response format.');
        return;
      }
      setGroups(response.data);
    } catch (err) {
      setError(handleApiError(err, navigate));
    }
  };

  const fetchUsersNotInGroup = async () => {
    if (!selectedGroupId || isNaN(selectedGroupId)) {
      setError('Please select a valid group.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/groups/${selectedGroupId}/users_not_in_group`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (!Array.isArray(response.data)) {
        setUsers([]);
        setError('Unexpected users response format.');
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

    if (groupId && groupId !== selectedGroupId) {
      setSelectedGroupId(groupId);
    }

    fetchGroups();
    if (selectedGroupId && !isNaN(selectedGroupId)) {
      fetchUsersNotInGroup();
    } else {
      setLoading(false);
    }
  }, [navigate, token, groupId, selectedGroupId]);

  const handleGroupSelect = (e) => {
    const newGroupId = e.target.value;
    setSelectedGroupId(newGroupId);
    if (newGroupId) {
      navigate(`/groups/${newGroupId}/users-not-in-group`);
    }
  };

  const handleBack = () => {
    if (!selectedGroupId || isNaN(selectedGroupId)) {
      navigate('/app-group-chat');
      return;
    }
    navigate(`/groups/${selectedGroupId}/members`);
  };

  const handleBackToGroups = () => {
    navigate('/app-group-chat');
  };

  const handleAddToGroup = useCallback(async (userId) => {
    if (!selectedGroupId || isNaN(selectedGroupId)) {
      setError('Please select a valid group.');
      return;
    }

    try {
      await axios.post(
        `${BASE_URL}/groups/add_members`,
        { group_id: Number(selectedGroupId), user_ids: [userId] },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      setSuccessMessage('User successfully added to group!');
      setError(null);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(handleApiError(err, navigate));
    }
  }, [selectedGroupId, token, navigate]);

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

  if (!selectedGroupId || isNaN(selectedGroupId)) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Available Users</h1>
              <p className="mt-2 text-gray-600">Select a group to view users not in it</p>
            </div>
            <button
              onClick={handleBackToGroups}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              aria-label="Back to groups"
            >
              <i className="bi bi-arrow-left mr-2"></i>
              Back to Groups
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Select a Group</h2>
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
            {groups.length === 0 ? (
              <div className="text-center py-12">
                <i className="bi bi-people text-gray-400 text-4xl mb-3"></i>
                <p className="text-gray-600 mb-4">No groups available.</p>
                <button
                  onClick={() => navigate('/groups/create')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  aria-label="Create group"
                >
                  Create Group
                </button>
              </div>
            ) : (
              <div className="max-w-md">
                <label htmlFor="groupSelect" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Group
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <i className="bi bi-people-fill text-gray-400"></i>
                  </span>
                  <select
                    id="groupSelect"
                    value={selectedGroupId || ''}
                    onChange={handleGroupSelect}
                    className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                    aria-label="Select a group"
                  >
                    <option value="">-- Select a Group --</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} (ID: {group.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Available Users</h1>
            <p className="mt-2 text-gray-600">Users not in Group ID: {selectedGroupId}</p>
          </div>
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            aria-label="Back to members"
          >
            <i className="bi bi-arrow-left mr-2"></i>
            Back to Members
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Users Available to Add</h2>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
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
                          onClick={() => handleAddToGroup(user.id)}
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
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div>
                        <i className="bi bi-person-x text-gray-400 text-4xl mb-3"></i>
                        <p className="text-gray-600 mb-4">No users available to add.</p>
                        <div className="flex justify-center gap-3">
                          <button
                            onClick={handleBack}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            aria-label="Back to members"
                          >
                            Back to Members
                          </button>
                          <button
                            onClick={handleBackToGroups}
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
        </div>
      </div>
    </div>
  );
};

export default UsersNotInGroupPage;