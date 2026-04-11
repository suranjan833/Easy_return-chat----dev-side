import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const fetchSiteName = async (siteId, token) => {
  try {
    if (!siteId) return 'N/A';
    const response = await axios.get(`${BASE_URL}/sites/${siteId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    return response.data.domain || 'Unknown Site';
  } catch (err) {
    console.error('Error fetching site name:', err);
    return 'N/A';
  }
};

export const fetchRoleName = async (roleId, token) => {
  try {
    if (!roleId) return 'N/A';
    const response = await axios.get(`${BASE_URL}/roles/${roleId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    return response.data.name || 'Unknown Role';
  } catch (err) {
    console.error('Error fetching role name:', err);
    return 'N/A';
  }
};