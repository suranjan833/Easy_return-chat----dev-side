import React, { useState, useEffect } from 'react';
import { Table, Button, Spinner, Alert, Badge } from 'reactstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ActiveUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [sitesList, setSitesList] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    const fetchAllData = async () => {
      try {
        // Fetch roles
        const rolesRes = await axios.get(`${BASE_URL}/roles/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRoles(rolesRes.data);

        // Fetch departments
        const deptRes = await axios.get(`${BASE_URL}/departments/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDepartmentsList(deptRes.data);

        // Fetch sites
        const sitesRes = await axios.get(`${BASE_URL}/sites/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSitesList(sitesRes.data);

        // Fetch active users with department information
        const usersRes = await axios.get(`${BASE_URL}/users/active`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            expand: 'departments' // Ensure departments are included in response
          }
        });
        
        // Check different possible response structures
        let usersData = [];
        if (Array.isArray(usersRes.data)) {
          usersData = usersRes.data;
        } else if (Array.isArray(usersRes.data.records)) {
          usersData = usersRes.data.records;
        } else if (Array.isArray(usersRes.data.data)) {
          usersData = usersRes.data.data;
        }
        
        setUsers(usersData);
        setLoading(false);
      } catch (err) {
        setError(err.message || 'Failed to fetch data.');
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Function to get department names for a user
  const getUserDepartments = (user) => {
    // Check different possible department data structures
    if (user.departments && Array.isArray(user.departments)) {
      return user.departments.map(dept => dept.name).join(', ');
    }
    if (user.department_ids && Array.isArray(user.department_ids)) {
      return user.department_ids.map(id => {
        const dept = departmentsList.find(d => d.id === id);
        return dept ? dept.name : 'Unknown';
      }).join(', ');
    }
    return 'None';
  };

  // Function to get department badges for a user
  const getUserDepartmentBadges = (user) => {
    if (user.departments && Array.isArray(user.departments)) {
      return user.departments.map(dept => (
        <Badge color="primary" className="me-1" key={dept.id}>
          {dept.name}
        </Badge>
      ));
    }
    if (user.department_ids && Array.isArray(user.department_ids)) {
      return user.department_ids.map(id => {
        const dept = departmentsList.find(d => d.id === id);
        return dept ? (
          <Badge color="primary" className="me-1" key={id}>
            {dept.name}
          </Badge>
        ) : null;
      });
    }
    return <Badge color="secondary">None</Badge>;
  };

  const handleView = (userId) => {
    navigate(`/users/${userId}`);
  };

  const handleEdit = (userId) => {
    navigate(`/users/${userId}/edit`);
  };

  const handleDelete = (userId) => {
    navigate(`/delete-user/${userId}`);
  };

  const navigateToListUsers = () => {
    navigate('/list-users');
  };

  if (loading) {
    return (
      <div className="text-center p-4">
        <Spinner color="primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert color="danger">
        {error}
      </Alert>
    );
  }

  return (
    <div className="p-4" style={{ marginTop: "70px" }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>Active Users</h4>
        <Button color="primary" onClick={navigateToListUsers}>
          View All Users
        </Button>
      </div>
      
      {users.length === 0 ? (
        <Alert color="info">No active users found.</Alert>
      ) : (
        <Table responsive hover>
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Role</th>
              <th>Sites</th>
              <th>Departments</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.email}</td>
                <td>{user.first_name || '-'}</td>
                <td>{user.last_name || '-'}</td>
                
                <td>
                  <Badge color="info">
                    {roles.find(role => role.id === user.role_id)?.name || 'N/A'}
                  </Badge>
                </td>
                
                <td>
                  {user.site_ids?.length ? (
                    user.site_ids.map(id => {
                      const site = sitesList.find(s => s.id === id);
                      return site ? (
                        <Badge color="secondary" className="me-1" key={id}>
                          {site.name}
                        </Badge>
                      ) : null;
                    })
                  ) : 'None'}
                </td>
                
                <td>
                  {getUserDepartmentBadges(user)}
                </td>
                
                <td>
                  <Badge color={user.is_active ? 'success' : 'danger'}>
                    {user.is_active ? 'Yes' : 'No'}
                  </Badge>
                </td>
                
                <td>
                  <Button
                    color="info"
                    size="sm"
                    className="me-1"
                    onClick={() => handleView(user.id)}
                  >
                    View
                  </Button>
                  <Button
                    color="warning"
                    size="sm"
                    className="me-1"
                    onClick={() => handleEdit(user.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    color="danger"
                    size="sm"
                    onClick={() => handleDelete(user.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default ActiveUsers;