import { Navigate } from 'react-router-dom';

// Utility function to check if user has restricted role
const getUserRole = () => {
  try {
    const authData = localStorage.getItem('auth');
    if (authData) {
      const parsedData = JSON.parse(authData);
      return parsedData.user?.role_id || null;
    }
    return null;
  } catch (error) {
    console.error('Error parsing auth data:', error);
    return null;
  }
};

// ProtectedRoute component to wrap individual routes
const ProtectedRoute = ({ element }) => {
  const roleId = getUserRole();
  
  // If role_id is 3, redirect to homepage
  if (roleId === 3) {
    return <Navigate to="/" replace />;
  }
  
  // Render the route's element if access is allowed
  return element;
};

export default ProtectedRoute;