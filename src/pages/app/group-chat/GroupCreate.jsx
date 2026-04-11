import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadFile } from './Group services/api.js';
import axios from 'axios';
import './CreateGroupPage.css';
import { Button } from 'reactstrap';
import GroupDetailsModal from '../../../components/Groups/GroupDetailsModal.jsx';
import AddMembersModal from '../../../components/Groups/AddMembers.jsx';



const BASE_URL = "https://chatsupport.fskindia.com";

const CreateGroupPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', avatar: null }); // Removed group_creater
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null); // New state for editing
  const [showAddMembersModal, setShowAddMembersModal] = useState(false); // State for AddMembersModal
  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    const fetchGroups = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${BASE_URL}/groups/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        setGroups(Array.isArray(response.data) ? response.data : []);
        setError(null);
      } catch (err) {
        console.error('Error fetching groups:', err);
        if (err.response?.status === 401) {
          setError('Unauthorized: Please log in again.');
          localStorage.removeItem('accessToken');
          navigate('/auth-login');
        } else {
          setError(err.response?.data?.detail || 'Failed to load groups.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [navigate, token, success]);

  const filteredGroups = groups.filter(group =>
    group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.id?.toString().includes(searchTerm)
  );

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'avatar') {
      const file = files[0];
      if (file) {
        if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
          setError('Please select a JPEG or PNG image.');
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          setError('File size exceeds 5MB limit.');
          return;
        }
        setFormData({ ...formData, avatar: file });
        const reader = new FileReader();
        reader.onload = () => setAvatarPreview(reader.result);
        reader.readAsDataURL(file);
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.name) {
      setError('Group name is required.');
      return;
    }
    // Removed group_creater validation as the input field has been removed.

    try {
      setSubmitting(true);
      let groupId;
      let finalAvatarUrl = editingGroup?.avatar_url || null; // Start with existing avatar URL

      // 1. Handle avatar upload if a new file is selected
      if (formData.avatar) {
        // If editing, upload the new avatar first
        if (editingGroup) {
          groupId = editingGroup.id;
          const uploadResponse = await uploadFile(formData.avatar, groupId);
          finalAvatarUrl = uploadResponse.url;
        }
        // If creating, the group ID is not yet known, so upload after group creation
      } else if (editingGroup && avatarPreview === null) {
        // If editing and avatar was explicitly cleared (no new file selected)
        finalAvatarUrl = null;
      }

      // Determine the group ID and initial PUT/POST payload
      let groupPayload = {
        name: formData.name,
        avatar_url: finalAvatarUrl, // Use the determined avatar URL
      };

      if (editingGroup) {
        groupId = editingGroup.id;
        // Perform PUT request for group details
        await axios.patch(
          `${BASE_URL}/groups/${groupId}`,
          groupPayload,
          {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } else {
        // Create new group
        const createResponse = await axios.post(
          `${BASE_URL}/groups/`,
          { ...groupPayload, id: 0 }, // id: 0 for new creation
          {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        groupId = createResponse.data.id;

        // If creating and a new avatar was selected, upload it now that we have groupId
        if (formData.avatar && !finalAvatarUrl) { // If finalAvatarUrl wasn't set from initial upload (i.e., it's a new group)
          const uploadResponse = await uploadFile(formData.avatar, groupId);
          finalAvatarUrl = uploadResponse.url;
          // Update the group with the new avatar URL
          await axios.patch( // Changed to PATCH for partial update
            `${BASE_URL}/groups/${groupId}`,
            { ...groupPayload, avatar_url: finalAvatarUrl },
            {
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            }
          );
        }
      }

      setSuccess(`Group ${editingGroup ? 'updated' : 'created'} successfully!`);
      setFormData({ name: '', group_creater: '', avatar: null });
      setAvatarPreview(null);
      setEditingGroup(null); // Exit edit mode
    } catch (err) {
      console.error(`Error ${editingGroup ? 'updating' : 'creating'} group:`, err);
      if (err.response?.status === 401) {
        setError('Unauthorized: Please log in again.');
        localStorage.removeItem('accessToken');
        navigate('/auth-login');
      } else if (err.response?.status === 422) {
        setError(err.response.data.detail?.map((e) => e.msg).join(', ') || 'Invalid input.');
      } else {
        setError(err.response?.data?.detail || `Failed to ${editingGroup ? 'update' : 'create'} group.`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleModal = () => setShowModal(!showModal);
  const toggleAddMembersModal = () => setShowAddMembersModal(!showAddMembersModal);

  const handleViewGroup = (group) => {
    setSelectedGroup(group);
    setShowModal(true);
  };

  const handleClear = () => {
    setFormData({ name: '', avatar: null }); // Removed group_creater
    setAvatarPreview(null);
    setError(null);
    setSuccess(null);
    setEditingGroup(null); // Clear editing state on clear
    setShowAddMembersModal(false); // Close add members modal
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      avatar: null, // Keep avatar null, it will only be set if a new file is selected
    });
    setAvatarPreview(group.avatar_url || null); // Show current avatar if available
    window.scrollTo(0, 0); // Scroll to top to show the form
  };

  const handleCancelEdit = () => {
    setEditingGroup(null);
    setFormData({ name: '', group_creater: '', avatar: null });
    setAvatarPreview(null);
    setError(null);
    setSuccess(null);
  };

  const handleAddMembersClick = (group) => {
    setSelectedGroup(group);
    setShowAddMembersModal(true);
  };

  const handleMembersAdded = (groupId, newMemberIds) => {
    // Optionally refresh the groups list or update the specific group's members
    // For simplicity, we'll refetch all groups here.
    // In a real app, you might update the state more efficiently.
    const fetchGroups = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/groups/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        setGroups(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Error refetching groups after adding members:', err);
      }
    };
    fetchGroups();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{editingGroup ? 'Edit Group' : 'Create New Group'}</h1>
          <p className="mt-2 text-gray-600">{editingGroup ? `Editing group: ${editingGroup.name}` : 'Add a new group to your organization with ease'}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">{editingGroup ? 'Edit Group Information' : 'Group Information'}</h2>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md flex items-center">
              <i className="bi bi-exclamation-triangle-fill text-red-500 mr-3"></i>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-md flex items-center">
              <i className="bi bi-check-circle-fill text-green-500 mr-3"></i>
              <p className="text-green-700">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <i className="bi bi-people-fill text-gray-400"></i>
                  </span>
                  <input
                    type="text"
                    id="groupName"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter group name"
                    required
                    disabled={submitting}
                    className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>


              <div>
                <label htmlFor="groupAvatar" className="block text-sm font-medium text-gray-700 mb-2">
                  Group Avatar
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <i className="bi bi-image text-gray-400"></i>
                  </span>
                  <input
                    type="file"
                    id="groupAvatar"
                    name="avatar"
                    onChange={handleChange}
                    accept="image/png,image/jpeg,image/jpg"
                    disabled={submitting}
                    className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                    aria-label="Upload group avatar"
                  />
                </div>
                {avatarPreview && (
                  <div className="mt-3 flex items-center">
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-12 h-12 rounded-full object-cover border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, avatar: null });
                        setAvatarPreview(null);
                      }}
                      className="ml-3 text-red-500 hover:text-red-600 transition-colors"
                      aria-label="Remove avatar"
                    >
                      <i className="bi bi-x-circle text-lg"></i>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center p-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {editingGroup ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <i className={`bi bi-${editingGroup ? 'save' : 'plus-circle'} mr-2`}></i>
                    {editingGroup ? 'Update Group' : 'Create Group'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={submitting}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:bg-gray-200 disabled:cursor-not-allowed"
              >
                <i className="bi bi-eraser mr-2"></i>
                Clear
              </button>
              {editingGroup && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={submitting}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors disabled:bg-gray-200 disabled:cursor-not-allowed"
                >
                  <i className="bi bi-x-circle mr-2"></i>
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Existing Groups</h2>
              <p className="text-sm text-gray-600">Showing {filteredGroups.length} {filteredGroups.length === 1 ? 'group' : 'groups'}</p>
            </div>
            <div className="w-full max-w-xs">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <i className="bi bi-search text-gray-400"></i>
                </span>
                <input
                  type="text"
                  placeholder="Search groups..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => (
                    <tr key={group.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">#{group.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {group.avatar_url ? (
                            <img
                              src={group.avatar_url}
                              alt={`${group.name} avatar`}
                              className="w-10 h-10 rounded-full object-cover mr-3 border border-gray-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center mr-3 text-sm font-medium">
                              {group.name ? group.name.slice(0, 2).toUpperCase() : 'G'}
                            </div>
                          )}
                          <span className="font-medium text-gray-900">{group.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                          Active
                        </span>
                      </td>
                        <td className="text-end"> {/* Added text-end for alignment */}
                          <div className="d-flex justify-content-end"> {/* Added flex container */}
                            <Button
                              color="outline-dark" 
                              size="sm"
                              onClick={() => handleViewGroup(group)}
                              className="me-2"
                              title="View Group Details"
                            >
                              <i className="bi bi-eye me-1"></i> View
                            </Button>
                            <Button
                         color="outline-dark" 
                              size="sm"
                              onClick={() => handleEditGroup(group)}
                              className="me-2"
                              title="Edit Group"
                            >
                              <i className="bi bi-pencil me-1"></i> Edit
                            </Button>
                         
                        
                            <Button
                              color="outline-dark" // Changed variant to color
                              size="sm"
                              onClick={() => handleAddMembersClick(group)}
                              title="Add Member"
                            >
                              <i className="bi bi-person-gear me-1"></i> Add Member
                            </Button>
                          </div>
                          </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center"> {/* Changed colspan from 5 to 4 */}
                      <div>
                        <i className="bi bi-people text-gray-400 text-4xl mb-3"></i>
                        <p className="text-gray-600 mb-4">No groups found</p>
                        {searchTerm ? (
                          <button
                            onClick={() => setSearchTerm('')}
                            className="inline-flex px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                          >
                            Clear search
                          </button>
                        ) : (
                          <button
                            onClick={() => window.scrollTo(0, 0)}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                          >
                            <i className="bi bi-plus-lg mr-2"></i>
                            Create Group
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <GroupDetailsModal isOpen={showModal} toggle={toggleModal} group={selectedGroup} />
      <AddMembersModal
        isOpen={showAddMembersModal}
        toggle={toggleAddMembersModal}
        group={selectedGroup}
        onMembersAdded={handleMembersAdded}
      />
    </div>
  );
};

export default CreateGroupPage;
