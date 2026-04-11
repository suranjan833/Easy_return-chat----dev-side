
const MessageInfoModal = ({ isOpen, onClose, message, group }) => {
  // Helper to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return dateString;
    }
  };

  // Determine read status for each member
  const getMemberStatus = (member) => {
    if (member.id === message?.sender_id) return { status: 'Sender', time: message.created_at };

    if (message?.read_by && Array.isArray(message.read_by)) {
      const readInfo = message.read_by.find(r => r.user_id === member.id);
      if (readInfo) {
        return { status: 'Read', time: readInfo.read_at };
      }
    }

    return { status: 'Delivered', time: null };
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 'auto', // Override top
        bottom: 0,   // Stick to bottom
        left: 0,
        width: '100%',
        height: '60%', // Half-open height
        backgroundColor: '#fff',
        zIndex: 2000,
        transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s cubic-bezier(0.1, 0.7, 0.1, 1)', // Smoother animation
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)', // Stronger shadow
        borderTopLeftRadius: '20px', // Rounded corners
        borderTopRightRadius: '20px',
        overflow: 'hidden' // Ensure content respects rounded corners
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#007bff',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        zIndex: 10
      }}>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <i className="bi bi-arrow-left"></i>
        </button>
        <span style={{ fontSize: '18px', fontWeight: '600' }}>Message Info</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#f8f9fa' }}>
        {message && (
          <>
            {/* Message Preview */}
            <div style={{ padding: '20px 16px', backgroundColor: '#fff', marginBottom: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <div style={{
                backgroundColor: '#dcf8c6',
                padding: '12px 16px',
                borderRadius: '8px',
                display: 'inline-block',
                maxWidth: '85%',
                color: '#000',
                boxShadow: '0 1px 1px rgba(0,0,0,0.1)'
              }}>
                {message.content}
                {message.attachment && (
                  <div style={{ marginTop: '8px', fontSize: '12px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i className="bi bi-paperclip"></i>
                    <span>Attachment</span>
                  </div>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '6px', textAlign: 'right', marginRight: '15%' }}>
                {formatDate(message.created_at)}
              </div>
            </div>

            {/* Read Receipts */}
            <div style={{ backgroundColor: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <div style={{
                padding: '16px',
                fontWeight: '600',
                color: '#007bff',
                fontSize: '14px',
                borderBottom: '1px solid #f0f0f0'
              }}>
                Read by
              </div>
              <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
                {group.group_members && group.group_members.map(member => {
                  if (member.id === message.sender_id) return null;

                  const { status, time } = getMemberStatus(member);

                  return (
                    <li key={member.id} style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {member.profile_picture ? (
                          <img
                            src={member.profile_picture}
                            alt={member.first_name}
                            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: '#e9ecef',
                            color: '#495057',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            fontWeight: '600'
                          }}>
                            {member.first_name ? member.first_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: '500', color: '#212529' }}>
                            {member.first_name} {member.last_name}
                          </div>
                          {time && (
                            <div style={{ fontSize: '12px', color: '#868e96' }}>
                              {formatDate(time)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', color: status === 'Read' ? '#28a745' : '#868e96', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {status === 'Read' ? <i className="bi bi-check-all" style={{ fontSize: '16px' }}></i> : <i className="bi bi-check" style={{ fontSize: '16px' }}></i>}
                          {status}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MessageInfoModal;
