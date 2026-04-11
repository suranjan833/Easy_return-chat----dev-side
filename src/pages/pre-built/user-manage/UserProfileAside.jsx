import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Icon, UserAvatar } from '@/components/Component';
import { findUpper } from '@/utils/Utils';
import { DropdownItem, UncontrolledDropdown, DropdownMenu, DropdownToggle } from 'reactstrap';
import axios from 'axios';
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const UserProfileAside = ({ updateSm, sm }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data from GET /users/me
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          throw new Error('No access token found');
        }

        const response = await axios.get(`${BASE_URL}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        const user = response.data;
        
        // Store user data in localStorage for other components to use
        localStorage.setItem('user', JSON.stringify({
          name: `${user.first_name} ${user.last_name}`.trim(),
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          // Add any other user fields you need
        }));

        setProfile({
          name: `${user.first_name} ${user.last_name}`.trim() || 'Unknown User',
          email: user.email || 'No email provided',
          // Add any other profile fields you want to display
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user data:', err);
        if (err.response?.status === 401) {
          setError('Session expired. Please log in again.');
          // Clear invalid token and redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          navigate('/auth-login');
        } else {
          setError(err.message || 'Failed to load user data.');
        }
        setLoading(false);
      }
    };
    
    // Check if we already have user data in localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setProfile({
          name: user.name || `${user.first_name} ${user.last_name}`.trim() || 'Unknown User',
          email: user.email || 'No email provided',
        });
        setLoading(false);
      } catch (e) {
        // If parsing fails, fetch fresh data
        fetchUser();
      }
    } else {
      fetchUser();
    }
  }, [navigate]);

  // Handle sidebar toggle state
  useEffect(() => {
    if (sm) {
      document.body.classList.add('toggle-shown');
    } else {
      document.body.classList.remove('toggle-shown');
    }
  }, [sm]);

  if (loading) return <div className="text-center p-3">Loading profile...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="card-inner-group">
      <div className="card-inner">
        <div className="user-card">
          <UserAvatar text={findUpper(profile.name)} theme="primary" />
          <div className="user-info">
            <span className="lead-text">{profile.name}</span>
            <span className="sub-text">{profile.email}</span>
          </div>
          <div className="user-action">
            <UncontrolledDropdown>
              <DropdownToggle tag="a" className="btn btn-icon btn-trigger me-n2">
                <Icon name="more-v"></Icon>
              </DropdownToggle>
              <DropdownMenu end>
                <ul className="link-list-opt no-bdr">
                  <li>
                    <DropdownItem
                      tag="a"
                      href="#dropdownitem"
                      onClick={(ev) => {
                        ev.preventDefault();
                        alert('Photo upload functionality will be implemented soon.');
                      }}
                    >
                      <Icon name="camera-fill"></Icon>
                      <span>Change Photo</span>
                    </DropdownItem>
                  </li>
                  <li>
                    <DropdownItem
                      tag="a"
                      href="#dropdownitem"
                      onClick={(ev) => {
                        ev.preventDefault();
                        navigate('/list-users');
                      }}
                    >
                      <Icon name="edit-fill"></Icon>
                      <span>Update Profile</span>
                    </DropdownItem>
                  </li>
                </ul>
              </DropdownMenu>
            </UncontrolledDropdown>
          </div>
        </div>
      </div>
      
      <div className="card-inner">
        <div className="user-account-info py-0">
          <h6 className="overline-title-alt">Account Details</h6>
          <div className="user-balance">
            Welcome back, <strong>{profile.name.split(' ')[0]}</strong>
          </div>
          <div className="user-balance-sub">
            Registered email: <span>{profile.email}</span>
          </div>
        </div>
      </div>
{/*       
      <div className="card-inner p-0">
        <ul className="link-list-menu">
          <li onClick={() => updateSm(false)}>
            <NavLink to={`/user-profile-regular`} className={({ isActive }) => isActive ? 'active' : ''}>
              <Icon name="user-fill-c"></Icon>
              <span>Personal Information</span>
            </NavLink>
          </li>
          <li onClick={() => updateSm(false)}>
            <NavLink to={`/user-profile-notification`} className={({ isActive }) => isActive ? 'active' : ''}>
              <Icon name="bell-fill"></Icon>
              <span>Notifications</span>
            </NavLink>
          </li>
          <li onClick={() => updateSm(false)}>
            <NavLink to={`/user-profile-activity`} className={({ isActive }) => isActive ? 'active' : ''}>
              <Icon name="activity-round-fill"></Icon>
              <span>Account Activity</span>
            </NavLink>
          </li>
          <li onClick={() => updateSm(false)}>
            <NavLink to={`/user-profile-setting`} className={({ isActive }) => isActive ? 'active' : ''}>
              <Icon name="lock-alt-fill"></Icon>
              <span>Security Settings</span>
            </NavLink>
          </li>
        </ul>
      </div> */}
    </div>
  );
};

export default UserProfileAside;