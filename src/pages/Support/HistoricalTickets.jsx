import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {getMessages } from '../../Services/widget'; 
import { toast } from 'react-toastify';
import './SupportChatWidget.css';
import axios from 'axios';
const HistoricalTickets = ({ userEmail, currentTicketNumber }) => {
  const [historicalTickets, setHistoricalTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedHistoricalTicket, setSelectedHistoricalTicket] = useState(null);
  const [historicalMessages, setHistoricalMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const chatBodyRef = useRef(null);

   const withRetry = async (fn, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };



useEffect(() => {
  if (!userEmail || typeof userEmail !== 'string' || !userEmail.includes('@')) {
    console.warn('[HistoricalTickets] Invalid or missing userEmail:', { userEmail });
    toast.error('Invalid user email. Cannot fetch historical tickets.');
    setHistoricalTickets([]);
    setSelectedHistoricalTicket(null);
    setHistoricalMessages([]);
    return;
  }

  const fetchHistoricalTickets = async () => {
    setLoading(true);
    try {
      const trimmedEmail = userEmail.trim().toLowerCase();
      const params = {
        user_email: trimmedEmail,
        limit: 20,
        offset: 0,
      };

      const response = await withRetry(async () => {
        return await axios.get(`https://supportdesk.fskindia.com/support-messages/support_requests`, {
          params,
          headers: {
            'X-User-Email': trimmedEmail,
          },
        });
      });

      const data = response.data;

      // console.log('[HistoricalTickets] Raw API response:', {
      //   data,
      //   responseLength: data?.length || 0,
      //   tickets: data?.map((t) => ({
      //     id: t.id,
      //     email: t.email,
      //     started_at: t.started_at,
      //   })),
      // });

      if (!Array.isArray(data)) {
        console.error('[HistoricalTickets] Invalid API response format:', { data });
        toast.error('Invalid ticket data received from server.');
        setHistoricalTickets([]);
        return;
      }

      const filteredTickets = data
        .filter((ticket) => {
          const ticketEmail = ticket.email?.trim().toLowerCase();
          const isValidTicket = ticketEmail === trimmedEmail && ticket.id !== currentTicketNumber;
          if (!isValidTicket) {
            console.warn('[HistoricalTickets] Filtered out ticket:', {
              ticketEmail,
              ticketId: ticket.id,
              matchesCurrent: ticket.id === currentTicketNumber,
            });
          }
          return isValidTicket;
        })
        .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));

      // console.log('[HistoricalTickets] Filtered historical tickets:', {
      //   userEmail: trimmedEmail,
      //   count: filteredTickets.length,
      //   ticketIds: filteredTickets.map((t) => t.id),
      //   tickets: filteredTickets.map((t) => ({
      //     id: t.id,
      //     email: t.email,
      //     started_at: t.started_at,
      //   })),
      // });

      setHistoricalTickets(filteredTickets);

      if (filteredTickets.length === 0) {
        toast.info(`No other historical tickets found for ${trimmedEmail}.`);
      }
    } catch (err) {
      console.error('[HistoricalTickets] Fetch historical tickets error:', {
        message: err.message,
        status: err.response?.status,
        response: err.response?.data,
      });
      toast.error('Failed to fetch historical tickets: ' + (err.message || 'Unknown error'));
      setHistoricalTickets([]);
    } finally {
      setLoading(false);
    }
  };

  fetchHistoricalTickets();
}, [userEmail, currentTicketNumber]);

  useEffect(() => {
    if (!selectedHistoricalTicket) {
      setHistoricalMessages([]);
      return;
    }

    // Fetch messages for selected ticket
    const fetchHistoricalMessages = async () => {
      setLoadingMessages(true);
      try {
        // console.log('[HistoricalTickets] Fetching messages for ticket:', {
        //   ticketNumber: selectedHistoricalTicket.ticket_number,
        // });
        const data = await getMessages({ ticket_number: selectedHistoricalTicket.ticket_number });

        // Validate message data
        if (!Array.isArray(data)) {
          // console.error('[HistoricalTickets] Invalid messages response format:', { data });
          toast.error('Invalid message data received from server.');
          setHistoricalMessages([]);
          return;
        }

        setHistoricalMessages(data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
        // console.log('[HistoricalTickets] Messages fetched:', {
        //   count: data.length,
        //   ticketNumber: selectedHistoricalTicket.ticket_number,
        // });
      } catch (err) {
        console.error('[HistoricalTickets] Fetch messages error:', {
          message: err.message,
          status: err.response?.status,
          response: err.response?.data,
        });
        toast.error('Failed to fetch messages: ' + (err.message || 'Unknown error'));
        setHistoricalMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchHistoricalMessages();
  }, [selectedHistoricalTicket]);

  useEffect(() => {
    // Auto-scroll to latest message
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [historicalMessages]);

  const formatMessageDate = (timestamp) => {
    const messageDate = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const isToday =
      messageDate.getDate() === today.getDate() &&
      messageDate.getMonth() === today.getMonth() &&
      messageDate.getFullYear() === today.getFullYear();
    const isYesterday =
      messageDate.getDate() === yesterday.getDate() &&
      messageDate.getMonth() === yesterday.getMonth() &&
      messageDate.getFullYear() === yesterday.getFullYear();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    return messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getSenderLabel = (msg) => {
    const senderType = msg.sender_type
      ? msg.sender_type.charAt(0).toUpperCase() + msg.sender_type.slice(1)
      : 'Unknown';
    let senderDisplay = msg.sender_email || 'N/A';
    if (msg.sender_type === 'user' && selectedHistoricalTicket?.name) {
      senderDisplay = selectedHistoricalTicket.name;
    } else if (msg.sender_type === 'agent' && selectedHistoricalTicket?.agent_name) {
      senderDisplay = selectedHistoricalTicket.agent_name;
    }
    return `${senderType} (${senderDisplay})`;
  };

  return (
    <div className="historical-tickets-container d-flex">
      <div className="historical-tickets-list p-3" style={{ width: '40%', borderRight: '1px solid #dee2e6', marginTop: '10px' }}>
        <h6 className="mb-3" style={{ fontSize: '1rem' }}>
          Historical Tickets for <span className="text-primary">{userEmail || 'User'}</span>
        </h6>
        {loading ? (
          <div className="text-center py-3">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : historicalTickets.length === 0 ? (
          <p className="text-muted text-center py-3">No historical tickets found.</p>
        ) : (
          <div className="ticket-list" style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {historicalTickets.map((ticket) => (
              <div
                key={ticket.ticket_number}
                className={`ticket-card mb-2 p-3 border rounded shadow-sm ${
                  selectedHistoricalTicket?.ticket_number === ticket.ticket_number
                    ? 'active border-primary border-2'
                    : 'border-light'
                } ${
                  ticket.status.toLowerCase() === 'initiated'
                    ? 'bg-info bg-opacity-10'
                    : ticket.status.toLowerCase() === 'agent_engaged'
                    ? 'bg-success bg-opacity-10'
                    : ticket.status.toLowerCase() === 'resolved'
                    ? 'bg-primary bg-opacity-10'
                    : 'bg-danger bg-opacity-10'
                }`}
                onClick={() => setSelectedHistoricalTicket(ticket)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSelectedHistoricalTicket(ticket);
                  }
                }}
                aria-label={`Select historical ticket ${ticket.ticket_number}`}
                style={{ cursor: 'pointer' }}
              >
                <div className="ticket-header d-flex justify-content-between align-items-center mb-1">
                  <strong className="text-dark">{ticket.name || 'N/A'}</strong>
                  <span
                    className={`badge ${
                      ticket.status.toLowerCase() === 'initiated'
                        ? 'bg-info'
                        : ticket.status.toLowerCase() === 'agent_engaged'
                        ? 'bg-success'
                        : ticket.status.toLowerCase() === 'resolved'
                        ? 'bg-primary'
                        : 'bg-danger'
                    } text-white`}
                  >
                    {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                  </span>
                </div>
                <p className="ticket-issue text-muted mb-1" style={{ fontSize: '0.875rem' }}>
                  {ticket.issue_description || 'No description'}
                </p>
                <small className="text-secondary d-block mt-2" style={{ fontSize: '0.75rem' }}>
                  Created: {new Date(ticket.created_at || Date.now()).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true,
                  })}
                </small>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="historical-tickets-chat" style={{ width: '60%', paddingLeft: '10px' }}>
        {selectedHistoricalTicket ? (
          <div className="card chat-card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <strong>{selectedHistoricalTicket.name || 'N/A'}</strong>
              <span
                className={`badge ms-2 ${
                  selectedHistoricalTicket.status.toLowerCase() === 'initiated'
                    ? 'bg-info'
                    : selectedHistoricalTicket.status.toLowerCase() === 'agent_engaged'
                    ? 'bg-success'
                    : selectedHistoricalTicket.status.toLowerCase() === 'resolved'
                    ? 'bg-primary'
                    : 'bg-danger'
                }`}
              >
                {selectedHistoricalTicket.status.charAt(0).toUpperCase() + selectedHistoricalTicket.status.slice(1)}
              </span>
            </div>
            <div className="bg-light border-bottom p-2">
              <p className="ticket-issue mb-0">
                <strong>Issue: </strong>{selectedHistoricalTicket.issue_description || 'No description available'}
              </p>
            </div>
            <div className="card-body chat-body p-3" ref={chatBodyRef} style={{ maxHeight: '250px', overflowY: 'auto', backgroundColor: '#f8f9fa' }}>
              {loadingMessages ? (
                <div className="text-center py-2">
                  <div className="spinner-border spinner-border-sm text-primary" role="status">
                    <span className="visually-hidden">Loading messages...</span>
                  </div>
                </div>
              ) : historicalMessages.length === 0 ? (
                <p className="text-muted text-center py-2">No messages for this ticket.</p>
              ) : (
                <div className="chat-messages d-flex flex-column">
                  {historicalMessages.reduce((acc, msg, index) => {
                    const currentDate = formatMessageDate(msg.timestamp);
                    const prevMsg = historicalMessages[index - 1];
                    const prevDate = prevMsg ? formatMessageDate(prevMsg.timestamp) : null;

                    if (index === 0 || currentDate !== prevDate) {
                      acc.push(
                        <div key={`date-${msg.timestamp}`} className="date-separator text-center my-2 w-100">
                          <span className="badge bg-secondary text-white">{currentDate}</span>
                        </div>
                      );
                    }

                    const isAgentOrBot = msg.sender_type === 'agent' || msg.sender_type === 'bot';
                    const isSystem = msg.sender_type === 'system';
                    
                    let messageClass = '';
                    let messageAlign = '';
                    let messageBg = '';
                    let messageTextColor = '';
                    let senderLabelColor = '';

                    if (isAgentOrBot) {
                      messageClass = 'message-right';
                      messageAlign = 'align-self-end';
                      messageBg = 'bg-primary';
                      messageTextColor = 'text-white';
                      senderLabelColor = 'text-dark'; // Changed to text-dark for better visibility against primary background
                    } else if (isSystem) {
                      messageClass = 'message-system';
                      messageAlign = 'align-self-center';
                      messageBg = 'bg-secondary bg-opacity-10';
                      messageTextColor = 'text-dark';
                      senderLabelColor = 'text-muted';
                    } else {
                      messageClass = 'message-left';
                      messageAlign = 'align-self-start';
                      messageBg = 'bg-light border border-light';
                      messageTextColor = 'text-dark';
                      senderLabelColor = 'text-muted';
                    }

                    acc.push(
                      <div
                        key={msg.id || index}
                        className={`message p-2 my-1 rounded-3 shadow-sm ${messageClass} ${messageAlign}`}
                        style={{ maxWidth: '85%', minWidth: '100px' }}
                      >
                        {msg.parent_message_id && (
                          <div className="reply-reference small text-muted mb-1">
                            Replying to: {historicalMessages.find((m) => m.id === msg.parent_message_id)?.content?.slice(0, 50) || 'Message not found'}
                          </div>
                        )}
                        {!isSystem && <div className={`message-sender small fw-bold mb-1 ${senderLabelColor}`}>{getSenderLabel(msg)}</div>}
                        <div className={`message-content p-2 rounded-3 ${messageBg} ${messageTextColor}`}>
                          {msg.message_type === 'text' && (
                            <p className="mb-0">{msg.content}</p>
                          )}
                          {msg.message_type === 'file_upload' && (
                            <a
                              href={msg.content}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="file-link d-flex align-items-center p-2 rounded bg-white border border-secondary text-decoration-none text-dark"
                              style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              title={msg.filename}
                            >
                              <i className="bi bi-paperclip me-2"></i>
                              <span>{msg.filename.length > 15 ? `${msg.filename.slice(0, 12)}...` : msg.filename}</span>
                            </a>
                          )}
                          {msg.message_type === 'notification' && (
                            <p className="mb-0 text-info">{msg.content}</p>
                          )}
                          <small className={`mt-1 ${senderLabelColor}`} style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                            {new Date(msg.timestamp).toLocaleString('en-US', {
                              hour: 'numeric',
                              minute: 'numeric',
                              hour12: true,
                            })}
                          </small>
                        </div>
                      </div>
                    );
                    return acc;
                  }, [])}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-muted text-center py-2">Select a historical ticket to view its chat.</p>
        )}
      </div>
    </div>
  );
};

HistoricalTickets.propTypes = {
  userEmail: PropTypes.string.isRequired,
  currentTicketNumber: PropTypes.string,
};

export default HistoricalTickets;
