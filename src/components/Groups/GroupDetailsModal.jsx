import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import axios from 'axios';

const GroupDetailsModal = ({ isOpen, toggle, group, onMemberRemoved }) => {
  const [currentGroup, setCurrentGroup] = useState(group);
    const token = localStorage.getItem('accessToken');

  useEffect(() => {
    setCurrentGroup(group);
  }, [group]);

  if (!currentGroup) {
    return null;
  }

  const handleDeleteMember = async (memberId) => {
    try {
      const BASE_URL = "https://chatsupport.fskindia.com";
      await axios.delete(`${BASE_URL}/groups/remove_members`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        data: {
          group_id: currentGroup.id,
          user_ids: [memberId]
        }
      });
      const updatedMembers = currentGroup.group_members.filter(member => member.id !== memberId);
      setCurrentGroup({ ...currentGroup, group_members: updatedMembers });
      if (onMemberRemoved) {
        onMemberRemoved(currentGroup.id, memberId);
      }
    } catch (error) {
      console.error('Error deleting group member:', error);
      // Handle error (e.g., show a toast notification)
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="xl" centered>
      <ModalHeader toggle={toggle} className="border-b-0 pb-2">
        <div className="flex items-center">
          {currentGroup.group_avatar ? (
            <img
              src={currentGroup.group_avatar}
              alt={`${currentGroup.name} avatar`}
              className="w-10 h-10 rounded-full object-cover mr-2 border border-gray-200"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center mr-2 text-lg font-medium">
              {currentGroup.name ? currentGroup.name.slice(0, 1).toUpperCase() : 'G'}
            </div>
          )}
          <h3 className="text-xl font-bold text-gray-900">{currentGroup.name}</h3>
        </div>
      </ModalHeader>
      <ModalBody className="pt-0 mt-2">

        <h4 className="text-xl font-semibold text-gray-900 mb-4">Group Members</h4>
        {currentGroup.group_members && currentGroup.group_members.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-max">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  {/* <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th> */}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentGroup.group_members.map((member) => {
                  const roleName = member.role_id === 1 ? 'Admin' : member.role_id === 2 ? 'Manager' : 'Member';
                  return (
                    <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          {member.profile_picture ? (
                            <img
                              src={member.profile_picture}
                              alt={`${member.first_name} avatar`}
                              className="w-8 h-8 rounded-full object-cover mr-2 border border-gray-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center mr-2 text-xs font-medium">
                              {member.first_name ? member.first_name.slice(0, 1).toUpperCase() : 'U'}
                            </div>
                          )}
                          <span className="font-medium text-gray-900">{member.first_name} {member.last_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600 min-w-max">{member.email}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{member.phone_number}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <Button color="danger" size="sm" onClick={() => handleDeleteMember(member.id)}>
                          Delete
                        </Button>
                      </td>
                      {/* <td className="px-4 py-2 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {roleName}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          member.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {member.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td> */}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600">No members in this group.</p>
        )}
      </ModalBody>
      <ModalFooter className="border-t-0 pt-0">
        <Button color="secondary" onClick={toggle}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default GroupDetailsModal;
