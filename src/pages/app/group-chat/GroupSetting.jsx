import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getGroups, uploadGroupAvatar } from './Group services/api.js';
import './GroupSettingsPage.css';

const GroupSettingsPage = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const location = useLocation();
  const [group, setGroup] = useState({
    id: parseInt(groupId),
    name: location.state?.groupName || 'Unnamed Group',
    avatar_url: location.state?.avatar_url || null,
    description: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [avatarModal, setAvatarModal] = useState({ isOpen: false, groupId: null, groupName: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const token = localStorage.getItem('accessToken');
  const userId = localStorage.getItem('userId');

  // Conditional logging for development only
  const log = process.env.NODE_ENV === 'development' ? console.log : () => {};

useEffect(() => {
  const isValidUserId = userId && /^\d+$/.test(userId);
  if (!token || !isValidUserId || !groupId || isNaN(groupId)) {
    setError('Invalid session or group ID. Please log in again.');
    setLoading(false);
    return;
  }

  const fetchGroup = async () => {
    try {
      setLoading(true);
      const fetchedGroups = await getGroups();
      const currentGroup = fetchedGroups.find((g) => g.id === parseInt(groupId));
      if (currentGroup) {
        setGroup({
          id: currentGroup.id,
          name: currentGroup.name || location.state?.groupName || 'Unnamed Group',
          avatar_url: currentGroup.group_avatar || currentGroup.avatar_url || location.state?.avatar_url || null,
          description: currentGroup.description || 'No description available',
        });
        setError(null);
      } else {
        throw new Error('Group not found');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail
        ? Array.isArray(err.response.data.detail)
          ? err.response.data.detail.map((d) => d.msg).join(', ')
          : err.response.data.detail
        : err.message || 'Failed to load group details';
      setError(errorMessage);
      if (err.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userId');
      }
    } finally {
      setLoading(false);
    }
  };

  fetchGroup();
}, [navigate, token, userId, groupId]);

  const handleViewMembers = () => {
    navigate(`/groups/${groupId}/members`);
  };

  const handleViewUsersNotInGroup = () => {
    navigate(`/groups/${groupId}/users-not-in-group`);
  };

  const handleAddMembers = () => {
    navigate(`/groups/${groupId}/add-members`);
  };

  const handleViewFiles = () => {
    navigate(`/groups/${groupId}/files`);
  };

  const openAvatarModal = () => {
    setAvatarModal({ isOpen: true, groupId: parseInt(groupId), groupName: group.name });
    setSelectedFile(null);
  };

  const closeAvatarModal = () => {
    setAvatarModal({ isOpen: false, groupId: null, groupName: '' });
    setSelectedFile(null);
    setError(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && ['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size exceeds 5MB limit.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setError(null);
    } else {
      setSelectedFile(null);
      setError('Please select a valid image file (JPEG, JPG, or PNG).');
    }
  };

const handleUploadAvatar = async () => {
  const { groupId } = avatarModal;
  if (!Number.isInteger(groupId) || groupId <= 0 || !selectedFile) {
    setError('Invalid group ID or no file selected.');
    return;
  }

  try {
    setUploading(true);
    const response = await uploadGroupAvatar(selectedFile, groupId);
    log('Upload Avatar Response:', response);
    if (!response.avatar_url) {
      throw new Error('Invalid avatar URL in API response');
    }
    // Update group state with the new avatar URL
    setGroup((prev) => ({ ...prev, avatar_url: response.avatar_url }));
    // Refetch group data to ensure consistency
    const fetchedGroups = await getGroups();
    const currentGroup = fetchedGroups.find((g) => g.id === parseInt(groupId));
    if (currentGroup) {
      setGroup({
        id: currentGroup.id,
        name: currentGroup.name || 'Unnamed Group',
        avatar_url: currentGroup.group_avatar || currentGroup.avatar_url || null,
        description: currentGroup.description || 'No description available',
      });
    }
    setError(null);
    closeAvatarModal();
  } catch (err) {
    const errorMessage =
      err.response?.status === 422
        ? err.response.data.detail.map((d) => d.msg).join(', ')
        : err.response?.status === 401
        ? 'Session expired. Please log in again.'
        : err.message || 'Failed to upload avatar';
    setError(errorMessage);
    if (err.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userId');
    }
  } finally {
    setUploading(false);
  }
};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading group settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings for {group.name}</h1>
            <p className="mt-2 text-gray-600">Manage group members and files</p>
          </div>
          <button
            onClick={() => navigate(`/app-group-chat`, { state: { groupName: group.name, avatar_url: group.avatar_url } })}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            aria-label="Go to group chat"
          >
            <i className="bi bi-chat mr-2"></i>
            Back to Chat
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-md flex items-center">
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

        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center mb-8">
            <div className="mr-4">
              {group.avatar_url ? (
                <img
                  src={group.avatar_url}
                  alt={group.name || 'Group avatar'}
                  className="w-16 h-16 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl font-medium">
                  {group.name ? group.name.slice(0, 2).toUpperCase() : 'G'}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">{group.name}</h2>
              <p className="text-sm text-gray-600 mt-1">{group.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={handleViewMembers}
              className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:shadow-md transition-all flex items-center group"
              aria-label={`View members of ${group.name}`}
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
                <i className="bi bi-people text-blue-600 text-lg"></i>
              </div>
              <div className="text-left">
                <h3 className="text-sm font-medium text-gray-900">View Members</h3>
                <p className="text-xs text-gray-500">See all group members</p>
              </div>
            </button>
            <button
              onClick={handleViewUsersNotInGroup}
              className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:shadow-md transition-all flex items-center group"
              aria-label={`View users not in ${group.name}`}
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mr-3 group-hover:bg-gray-200 transition-colors">
                <i className="bi bi-person-x text-gray-600 text-lg"></i>
              </div>
              <div className="text-left">
                <h3 className="text-sm font-medium text-gray-900">View Non-Members</h3>
                <p className="text-xs text-gray-500">See users not in the group</p>
              </div>
            </button>
            <button
              onClick={handleAddMembers}
              className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:shadow-md transition-all flex items-center group"
              aria-label={`Add members to ${group.name}`}
            >
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3 group-hover:bg-green-200 transition-colors">
                <i className="bi bi-person-plus text-green-600 text-lg"></i>
              </div>
              <div className="text-left">
                <h3 className="text-sm font-medium text-gray-900">Add Members</h3>
                <p className="text-xs text-gray-500">Invite new members</p>
              </div>
            </button>
            <button
              onClick={handleViewFiles}
              className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:shadow-md transition-all flex items-center group"
              aria-label={`View files in ${group.name}`}
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
                <i className="bi bi-folder text-blue-600 text-lg"></i>
              </div>
              <div className="text-left">
                <h3 className="text-sm font-medium text-gray-900">View Files</h3>
                <p className="text-xs text-gray-500">Access group files</p>
              </div>
            </button>
            <button
              onClick={openAvatarModal}
              className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:shadow-md transition-all flex items-center group"
              aria-label={`Upload avatar for ${group.name}`}
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
                <i className="bi bi-image text-blue-600 text-lg"></i>
              </div>
              <div className="text-left">
                <h3 className="text-sm font-medium text-gray-900">Upload Avatar</h3>
                <p className="text-xs text-gray-500">Change group avatar</p>
              </div>
            </button>
          </div>
        </div>

        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center transition-opacity duration-300 ${avatarModal.isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} role="dialog" aria-labelledby="avatarModalTitle">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 transform transition-transform duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 id="avatarModalTitle" className="text-xl font-semibold text-gray-900">Upload Group Avatar</h2>
              <button
                onClick={closeAvatarModal}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Close modal"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="mb-4">
              <p className="text-gray-600 mb-3">Upload an avatar for <strong>{avatarModal.groupName}</strong></p>
              <div className="relative">
                <input
                  type="file"
                  id="avatarUpload"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleFileChange}
                  className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                  aria-label="Select an avatar image"
                />
                <p className="mt-2 text-sm text-gray-500">Please select a JPEG, JPG, or PNG image (max 5MB).</p>
              </div>
              {error && (
                <div className="mt-3 bg-red-50 border-l-4 border-red-500 p-3 rounded-md flex items-center">
                  <i className="bi bi-exclamation-triangle-fill text-red-500 mr-2"></i>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeAvatarModal}
                disabled={uploading}
                className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:bg-gray-200 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadAvatar}
                disabled={!selectedFile || uploading}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center"
                aria-label="Upload selected avatar"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </>
                ) : (
                  'Upload Avatar'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupSettingsPage;