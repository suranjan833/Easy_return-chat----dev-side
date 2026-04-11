import React, { useState, useEffect } from 'react';
import { useChatContext } from './ChatContext';

const ChatPanels = () => {
  const { panels, removeChatPanel } = useChatContext();
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Check sidebar state
  useEffect(() => {
    const checkSidebarState = () => {
      const body = document.body;
      setSidebarHidden(body.classList.contains('sidebar-hidden'));
    };

    // Initial check
    checkSidebarState();

    // Create observer to watch for class changes
    const observer = new MutationObserver(checkSidebarState);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    // Listen for window resize
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleClosePanel = (pairId) => {
    if (removeChatPanel) {
      removeChatPanel(pairId);

    }
  };

  // Calculate panel dimensions and positions
  const getPanelLayout = (index, totalPanels) => {
    if (totalPanels === 0) return null;

    const sidebarWidth = sidebarHidden ? 0 : 290; // sidebar-width-normal from variables
    const availableWidth = windowDimensions.width - sidebarWidth;
    const availableHeight = windowDimensions.height - 80; // Account for header

    let panelWidth, panelHeight, panelLeft, panelTop;

    if (totalPanels === 1) {
      // Single panel: cover most of the screen
      panelWidth = Math.min(availableWidth - 40, 800);
      panelHeight = Math.min(availableHeight - 40, 600);
      panelLeft = sidebarWidth + (availableWidth - panelWidth) / 2;
      panelTop = (availableHeight - panelHeight) / 2;
    } else if (totalPanels === 2) {
      // Two panels: side by side
      panelWidth = Math.min((availableWidth - 60) / 2, 600);
      panelHeight = Math.min(availableHeight - 40, 600);
      panelLeft = sidebarWidth + 20 + (index * (panelWidth + 20));
      panelTop = (availableHeight - panelHeight) / 2;
    } else {
      // Three or more panels: grid layout
      const cols = Math.ceil(Math.sqrt(totalPanels));
      const rows = Math.ceil(totalPanels / cols);
      
      panelWidth = Math.min((availableWidth - (cols + 1) * 20) / cols, 500);
      panelHeight = Math.min((availableHeight - (rows + 1) * 20) / rows, 500);
      
      const col = index % cols;
      const row = Math.floor(index / cols);
      
      panelLeft = sidebarWidth + 20 + col * (panelWidth + 20);
      panelTop = 20 + row * (panelHeight + 20);
    }

    // Ensure panels don't go off-screen
    panelLeft = Math.max(sidebarWidth + 20, Math.min(panelLeft, availableWidth - panelWidth - 20));
    panelTop = Math.max(20, Math.min(panelTop, availableHeight - panelHeight - 20));

    return {
      width: panelWidth,
      height: panelHeight,
      left: panelLeft,
      top: panelTop
    };
  };

  const totalPanels = panels?.length || 0;

  return (
    <>
      {panels?.map((panel, index) => {
        const layout = getPanelLayout(index, totalPanels);
        if (!layout) return null;

        // Add CSS classes for different panel sizes
        let panelClass = 'chat-box bg-white rounded-3 shadow-sm';
        if (totalPanels === 1) panelClass += ' chat-panel-single';
        else if (totalPanels === 2) panelClass += ' chat-panel-double';
        else panelClass += ' chat-panel-grid';

        return (
          <div
            key={panel.pairId}
            className={panelClass}
            style={{
              position: 'fixed',
              left: layout.left,
              top: layout.top,
              width: layout.width,
              height: layout.height,
              zIndex: 2000 + index,
              display: 'flex',
              flexDirection: 'column',
              border: '2px solid #e0e0e0',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease'
            }}
          >
            <div className="d-flex align-items-center p-3 border-bottom bg-light">
              <h5 className="m-0 flex-grow-1" style={{ fontSize: '16px', fontWeight: '600' }}>
                {panel.pairName || 'Chat'}
              </h5>
              <button
                className="btn btn-sm btn-outline-danger p-1"
                onClick={() => handleClosePanel(panel.pairId)}
                aria-label={`Close chat panel ${panel.pairName}`}
                style={{ borderRadius: '50%', width: '32px', height: '32px' }}
              >
                <i className="bi bi-x"></i>
              </button>
            </div>
            <div 
              className="flex-grow-1 overflow-auto p-3" 
              style={{ 
                backgroundColor: '#f8f9fa',
                minHeight: 0
              }}
            >
              {panel.messages?.length > 0 ? (
                panel.messages.map((msg, msgIndex) => (
                  <div
                    key={msg.id || `msg-${msgIndex}`}
                    className={`mb-3 ${msg.sender_id === panel.user1Id ? 'text-end' : 'text-start'}`}
                  >
                    <div
                      className={`d-inline-block p-3 rounded-3 ${msg.sender_id === panel.user1Id ? 'bg-primary text-white' : 'bg-white text-dark border'}`}
                      style={{ 
                        maxWidth: '80%',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      <div className="mb-1">{msg.content}</div>
                      <small className={`d-block ${msg.sender_id === panel.user1Id ? 'text-white-50' : 'text-muted'}`} style={{ fontSize: '11px' }}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </small>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted py-4">
                  <i className="bi bi-chat-dots" style={{ fontSize: '2rem', opacity: 0.5 }}></i>
                  <div className="mt-2">No messages yet.</div>
                </div>
              )}
            </div>
          </div>
        );
      })}
      
      {/* Debug info - remove in production */}
      <div
        style={{
          position: 'fixed',
          top: '100px',
          left: sidebarHidden ? '20px' : '310px',
          zIndex: 2500,
          background: 'rgba(255, 165, 0, 0.9)',
          color: 'black',
          padding: '10px',
          fontWeight: 'bold',
          fontSize: '14px',
          border: '2px solid black',
          borderRadius: '8px',
          maxWidth: '300px'
        }}
      >
        <div><strong>Debug Info:</strong></div>
        <div>Sidebar: {sidebarHidden ? 'Hidden' : 'Visible'}</div>
        <div>Panels: {totalPanels}</div>
        <div>Window: {windowDimensions.width} × {windowDimensions.height}</div>
        <div>Available: {windowDimensions.width - (sidebarHidden ? 0 : 290)} × {windowDimensions.height - 80}</div>
        <div>Layout: {totalPanels === 1 ? 'Single' : totalPanels === 2 ? 'Double' : 'Grid'}</div>
      </div>
    </>
  );
};

export default ChatPanels;