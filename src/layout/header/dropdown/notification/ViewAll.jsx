// import React, { useState, useEffect } from 'react';
// import axios from 'axios';

// const ViewAll = () => {
//   const [unreadNotifications, setUnreadNotifications] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   const userEmail = localStorage.getItem('userEmail');

//   useEffect(() => {
//     const fetchNotifications = async () => {
//       try {
//         // Fetch unread notifications
//         const unreadResponse = await axios.get(
//           `https://supportdesk.fskindia.com/support/notifications/unread/${userEmail}`
//         );
//         setUnreadNotifications(unreadResponse.data.notifications);

//         // Fetch all notifications
       
//       } catch (err) {
//         setError('Failed to fetch notifications');
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (userEmail) {
//       fetchNotifications();
//     }
//   }, [userEmail]);

//   const cardStyle = {
//     backgroundColor: '#fff',
//     borderRadius: '8px',
//     boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
//     padding: '20px',
//     margin: '10px',
//     flex: '1',
//     minWidth: '300px',
//   };

//   const containerStyle = {
//     display: 'flex',
//     justifyContent: 'space-around',
//     flexWrap: 'wrap',
//     padding: '20px',
//     margin:'40px'
//   };

//   const notificationItemStyle = {
//     padding: '10px',
//     borderBottom: '1px solid #eee',
//   };

//   const titleStyle = {
//     fontSize: '1.5rem',
//     marginBottom: '15px',
//     color: '#333',
//   };

//   return (
//     <div style={containerStyle}>
  
//       <div style={cardStyle}>
//         <h2 style={titleStyle}>Unread Notifications ({unreadNotifications.length})</h2>
//         {loading && <p>Loading...</p>}
//         {error && <p style={{ color: 'red' }}>{error}</p>}
//         {!loading && !error && unreadNotifications.length === 0 && (
//           <p>No unread notifications</p>
//         )}
//         {unreadNotifications.map((notification) => (
//           <div key={notification.id} style={notificationItemStyle}>
//             <p><strong>Message:</strong> {notification.message}</p>
//             <p><strong>Ticket:</strong> {notification.ticket_number}</p>
//             <p><strong>Created:</strong> {new Date(notification.created_at).toLocaleString()}</p>
//             <p><strong>Site ID:</strong> {notification.site_id}</p>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default ViewAll;