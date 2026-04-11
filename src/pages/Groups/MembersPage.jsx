import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './MembersPage.css';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://chatsupport.fskindia.com";

const MembersPage = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const [members, setMembers] = useState([]);
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

  const fetchMembers = async () => {
    if (!groupId || isNaN(groupId)) {
      setError('Invalid group ID.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/groups/${groupId}/members`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (!Array.isArray(response.data)) {
        setMembers([]);
        setError('Unexpected members response format.');
        return;
      }
      setMembers(response.data);
      setError(null);
    } catch (err) {
      setError(handleApiError(err, navigate));
      setMembers([]);
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

    fetchMembers();
  }, [navigate, token, groupId]);

  const handleRemoveFromGroup = useCallback(async (userId) => {
    if (!groupId || isNaN(groupId)) {
      setError('Invalid group ID.');
      return;
    }

    try {
      await axios.delete(`${BASE_URL}/groups/remove_members`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        data: {
          group_id: Number(groupId),
          user_ids: [userId],
        },
      });
      setMembers(prevMembers => prevMembers.filter(member => member.id !== userId));
      setSuccessMessage('User successfully removed from group!');
      setError(null);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(handleApiError(err, navigate));
    }
  }, [groupId, token, navigate]);

  const handleBack = () => {
    navigate('/app-group-chat');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Group Members</h1>
            <p className="mt-2 text-gray-600">Members of Group ID: {groupId}</p>
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
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Current Members</h2>

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
                {members.length > 0 ? (
                  members.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">#{member.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                            <i className="bi bi-person-fill text-blue-600"></i>
                          </div>
                          <span className="font-medium text-gray-900">
                            {member.first_name} {member.last_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{member.email || 'No email'}</td>
                      <td className="px-6 py-4 text-gray-600">{member.role?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRemoveFromGroup(member.id)}
                          className="inline-flex items-center px-3 py-1 border border-red-500 text-red-600 font-medium rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                          title="Remove from Group"
                          aria-label={`Remove ${member.first_name} ${member.last_name} from group`}
                        >
                          <i className="bi bi-person-dash mr-1"></i>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div>
                        <i className="bi bi-people text-gray-400 text-4xl mb-3"></i>
                        <p className="text-gray-600 mb-4">No members in this group.</p>
                        <div className="flex justify-center gap-3">
                          <button
                            onClick={() => navigate(`/groups/${groupId}/add-members`)}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            aria-label="Add members"
                          >
                            Add Members
                          </button>
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
        </div>
      </div>
    </div>
  );
};

export default MembersPage;