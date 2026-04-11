import React from 'react';

const Loading = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      {/* Sidebar Skeleton */}
      <div style={{
        width: '250px',
        backgroundColor: '#fff',
        borderRight: '1px solid #e5e7eb',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Sidebar Menu Items Placeholders */}
        <div style={{
          height: '40px',
          backgroundColor: '#e5e7eb',
          borderRadius: '4px',
          animation: 'shimmer 1.5s infinite'
        }}></div>
        <div style={{
          height: '40px',
          backgroundColor: '#e5e7eb',
          borderRadius: '4px',
          animation: 'shimmer 1.5s infinite'
        }}></div>
        <div style={{
          height: '40px',
          backgroundColor: '#e5e7eb',
          borderRadius: '4px',
          animation: 'shimmer 1.5s infinite'
        }}></div>
      </div>

      {/* Main Content Skeleton */}
      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header/Title Placeholder */}
        <div style={{
          height: '60px',
          width: '300px',
          backgroundColor: '#e5e7eb',
          borderRadius: '8px',
          animation: 'shimmer 1.5s infinite'
        }}></div>

        {/* Graph Placeholders */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {/* Graph 1 */}
          <div style={{
            height: '200px',
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '20px',
            animation: 'shimmer 1.5s infinite'
          }}></div>
          {/* Graph 2 */}
          <div style={{
            height: '200px',
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '20px',
            animation: 'shimmer 1.5s infinite'
          }}></div>
        </div>
      </div>

      {/* Shimmer Animation Keyframes */}
      <style>
        {`
          @keyframes shimmer {
            0% {
              background: linear-gradient(to right, #e5e7eb 8%, #f3f4f6 18%, #e5e7eb 33%);
              background-size: 800px 104px;
              background-position: 0 0;
            }
            100% {
              background: linear-gradient(to right, #e5e7eb 8%, #f3f4f6 18%, #e5e7eb 33%);
              background-size: 800px 104px;
              background-position: 400px 0;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Loading;