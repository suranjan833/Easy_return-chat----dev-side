import axios from 'axios';

const SUPPORT_DESK_BASE_URL = import.meta.env.VITE_SUPPORT_DESK_API_BASE_URL || 'https://supportdesk.fskindia.com';
const WS_BASE_URL = import.meta.env.VITE_SUPPORT_DESK_WS_BASE_URL || 'wss://supportdesk.fskindia.com';

const SupportApiClient = axios.create({
  baseURL: SUPPORT_DESK_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

SupportApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    //log('Request Interceptor - Token:', token ? 'Present' : 'Missing');
    if (token) {
      if (typeof token !== 'string' || token.trim() === '') {
        log('Invalid token found in localStorage');
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } else {
      log('No access token found in localStorage');
    }
    if (config.headers['Content-Type'] === 'multipart/form-data') {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    log('Request interceptor error:', error);
    return Promise.reject(error);
  }
);


// Conditional logging for development only
export const log = process.env.NODE_ENV === 'development' ? console.log : () => { };

// Handle API errors consistently
const handleApiError = (error) => {
  // CHANGE: Handle malformed server responses and improve logging
  log('[widget.js] API Error:', {
    response: error.response || null,
    message: error.message || 'No message',
    code: error.code || null,
    config: error.config || null,
  });
  if (error.code === 'ERR_NETWORK') {
    throw new Error('Network error: Unable to connect to the server. Please check your connection.');
  }
  if (error.response?.status === 401) {
    log('[widget.js] 401 Unauthorized - Token may be invalid:', {
      headers: error.config?.headers,
    });
    throw new Error('Unauthorized access. Please verify your credentials or log in again.');
  }
  if (error.response?.status === 403) {
    log('[widget.js] 403 Forbidden - Check permissions:', {
      headers: error.config?.headers,
      data: error.config?.data,
      response: error.response?.data,
    });
    throw new Error('Forbidden access. Please verify your permissions or contact support.');
  }
  if (error.response?.status === 404) {
    log('[widget.js] 404 Not Found:', {
      response: error.response?.data || null,
      ticket_number: error.config?.url?.match(/ticket_number=([^&]+)/)?.[1] || 'unknown',
    });
    // Handle server messages like "Ticket not found" or "support request not found"
    const serverMessage =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Resource not found';
    throw new Error(`${serverMessage}. Please check ticket details or contact support.`);
  }
  if (error.response?.status === 422) {
    log('[widget.js] 422 Unprocessable Content:', JSON.stringify(error.response?.data, null, 2));
    const details = error.response?.data?.detail;
    if (Array.isArray(details)) {
      throw new Error(details.map((e) => e.msg).join(', '));
    }
    throw new Error(details || 'Invalid input provided. Please check the request data.');
  }
  // Fallback for unexpected responses
  const fallbackMessage =
    error.response?.data?.detail ||
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    'An unexpected error occurred.';
  throw new Error(`${fallbackMessage}. Please try again or contact support.`);
};

// Retry logic with debounce
let lastSubmission = 0;
const DEBOUNCE_MS = 5000; // 5 seconds debounce
const withRetry = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i < retries - 1) {
        log(`[widget.js] Retry ${i + 1}/${retries}:`, err);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
};

export const initiateSupportRequest = async (formData) => {
  try {
    if (!formData.department_id) {
      throw new Error('Department ID is required.');
    }
    const now = Date.now();
    if (now - lastSubmission < DEBOUNCE_MS) {

      throw new Error('Please wait a few seconds before creating another ticket.');
    }
    const authData = JSON.parse(localStorage.getItem('auth') || '{}');
    const email = authData.sub || formData.user_info?.email || 'user@example.com';
    
    const token = localStorage.getItem('accessToken');
    const apiKey = import.meta.env.VITE_API_KEY;
    if (!token && !apiKey) {
      console.error('[widget.js] Missing both token and API key');
      throw new Error('Authentication credentials missing. Please log in or check API configuration.');
    }
    
    let duplicateTicket = null;
    try {
      const existingTickets = await SupportApiClient.get('/support-messages/support_requests', {
        params: { agent_email: email },
      });
      duplicateTicket = existingTickets.data.find((ticket) => {
        const ticketCreated = new Date(ticket.created_at).getTime();
        const formCreated = formData.created_at ? new Date(formData.created_at).getTime() : now;
        const timeDiff = Math.abs(ticketCreated - formCreated);
        return (
          ticket.name === formData.user_info?.name &&
          ticket.mobile === formData.user_info?.mobile &&
          ticket.issue_description === formData.issue?.description &&
          timeDiff < 60000
        );
      });
      if (duplicateTicket) {
        return duplicateTicket;
      }
    } catch (err) {
      console.warn('[widget.js] Duplicate check failed, proceeding with ticket creation:', err.message);
    }

    try {
      const payload = {
        name: formData.user_info?.name || 'User',
        email,
        mobile: formData.user_info?.mobile || '9878765432',
        department_id: formData.department_id,
        issue_description: formData.issue?.description || 'No description provided',
        priority: formData.issue?.priority || 'MEDIUM',
      };

      const response = await SupportApiClient.post('/support/initiate-support-request', payload);

      lastSubmission = now;
      if (response.data.token) {
        localStorage.setItem('accessToken', response.data.token);
      }
      localStorage.setItem('ticket_number', response.data.ticket_number);
      return {
        ticket_number: response.data.ticket_number,
        websocket_url: response.data.websocket_url,
        agent_email: response.data.agent_email || null,
        token: response.data.token,
        status: 'initiated',
        site_id: response.data.site_id || null,
      };
    } catch (error) {
      if (error.response?.status === 403) {
        console.error('[widget.js] 403 Forbidden on initiateSupportRequest:', {
          headers: error.response?.headers,
          data: error.response?.data,
          status: error.response?.status,
          requestHeaders: error.config?.headers,
          payload: JSON.stringify(formData, null, 2),
          errorMessage: error.response?.data?.detail || 'No detail provided',
        });
        throw new Error(`Forbidden: Unable to create ticket. ${error.response?.data?.detail || 'Please verify your credentials or contact support.'}`);
      }
      if (error.response?.status === 404) {
        console.error('[widget.js] 404 No available agents:', {
          response: error.response?.data,
          ticket_number: error.config?.url?.match(/ticket_number=([^&]+)/)?.[1] || 'unknown',
        });
        throw new Error('No available agents. Please try again later.');
      }
      if (error.response?.status === 422) {
        console.error('[widget.js] 422 Validation error:', {
          response: error.response?.data,
          payload: JSON.stringify(formData, null, 2),
        });
        const details = error.response?.data?.detail;
        throw new Error(Array.isArray(details) ? details.map((e) => e.msg).join(', ') : details || 'Invalid input provided.');
      }
      throw error;
    }
  } catch (error) {
    console.error('[widget.js] Initiate Support Request Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      requestHeaders: error.config?.headers,
    });
    throw new Error(error.message || 'Failed to create ticket. Please try again or contact support.');
  }
};

export const getSiteDetails = async (site_id) => {
  try {
    const siteIdStr = String(site_id); // Convert to string to handle numeric site_id
    if (!siteIdStr || siteIdStr.trim() === '') {
      throw new Error('Invalid site ID provided.');
    }
    const endpoint = `https://chatsupport.fskindia.com/sites/${siteIdStr}`;

    const token = localStorage.getItem('accessToken');
    const response = await withRetry(async () => {
      return await SupportApiClient.get(endpoint, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined, // Use Authorization token
        },
      });
    });
   // console.log('[widget.js] [Testticket] getSiteDetails Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('[widget.js] [Testticket] getSiteDetails Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      site_id,
    });
    throw handleApiError(error);
  }
};
export const getSocketUrl = async (ticketNumber, agentEmail, agentName) => {

    try {
        const response = await axios.get(`https://supportdesk.fskindia.com/support/join-support-request/${ticketNumber}/${encodeURIComponent(agentEmail)}/${encodeURIComponent(agentName)}`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
            },
        });

                          
        // Validate response
        if (!response.data.websocket_url) {
            console.error('[widget.js] No websocket_url in response:', response.data);
            throw new Error('No WebSocket URL provided by server');
        }

        // Extract token from response.data.token or websocket_url query parameter
        let token = response.data.token;
        let websocketUrl = response.data.websocket_url;
        if (!token && websocketUrl.includes('?token=')) {
            const url = new URL(websocketUrl);
            token = url.searchParams.get('token');
            
        }
        if (!token) {
            console.error('[widget.js] No token in getSocketUrl response or websocket_url:', response.data);
            throw new Error('No token provided by server');
        }

        const isDevelopment = process.env.NODE_ENV === 'development';
        websocketUrl = isDevelopment ? websocketUrl : websocketUrl.replace(/^ws:\/\//, 'wss://');


        return {
            ...response.data,
            websocket_url: websocketUrl,
            token
        };
    } catch (error) {
        console.error('[widget.js] getSocketUrl error:', {
            message: error.message,
            status: error.response?.status,
            response: error.response?.data,
        });
        throw error;
    }
};


export const getMessages = async ({ ticket_number }) => {
  try {
    if (!ticket_number) {
      throw new Error('Ticket number is required.');
    }
    const response = await withRetry(async () => {
      const res = await SupportApiClient.get('/support-messages/messages', {
        params: { ticket_number },
      });
      if (!Array.isArray(res.data)) {
        throw new Error('Expected an array of messages');
      }
      return res;
    });
    // log('[widget.js] getMessages Response:', response.data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const requestHumanAgent = async ({ ticket_number, agent_email }) => {
  try {
    if (!ticket_number) {
      throw new Error('Ticket number is required.');
    }
    if (!agent_email) {
      throw new Error('Agent email is required for human handoff.');
    }
    const response = await withRetry(async () => {
      return await SupportApiClient.post(
        '/support/handoff-to-human',
        { site_id: '10', agent_email, ticket_number },
        { params: { ticket_number } }
      );
    });
    log('[widget.js] requestHumanAgent Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('[widget.js] requestHumanAgent Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      ticket_number,
      agent_email,
    });
    throw handleApiError(error);
  }
};

export const closeConversation = async ({ ticket_number, user_feedback, close_by_agent }) => {
  try {
    if (!ticket_number) {
      throw new Error('Ticket number is required.');
    }

    // Validate ticket existence
    const authData = JSON.parse(localStorage.getItem('auth') || '{}');
    const email = authData.sub || 'agent@gmail.com';
    const tickets = await getSupportRequests({ agent_email: email });
    const ticket = tickets.find((t) => t.ticket_number === ticket_number);
    if (!ticket) {
      throw new Error(`Ticket ${ticket_number} not found in client-side data.`);
    }
    if (ticket.status !== 'initiated' && ticket.status !== 'agent_engaged'&& ticket.status !== 'transferred') {
      throw new Error(`Ticket is in "${ticket.status}" status and cannot be closed.`);
    }

    const endpoint = '/support/close-conversation';
    const config = {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        'X-API-Key': import.meta.env.VITE_API_KEY,
        'X-User-Email': email,
      },
      params: {
        ticket_number,
        user_feedback,
        close_by_agent: close_by_agent ? 'true' : 'false',
      }
    };
    log('[widget.js] closeConversation Request:', {
      url: `${endpoint}?ticket_number=${encodeURIComponent(ticket_number)}&user_feedback=${encodeURIComponent(user_feedback)}&close_by_agent=${close_by_agent}`,
      headers: config.headers,
      site_id: localStorage.getItem('site_id') || '10',
    });
    const response = await withRetry(async () => {
      return await SupportApiClient.post(
        endpoint,
        { user_feedback }, 
        config
      );
    });
    log('[widget.js] closeConversation Response:', response.data);
    return response.data;
  } catch (error) {
    log('[widget.js] closeConversation Error:', {
      message: error.message,
      status: error.status,
      response: error.response,
      code: error.code,
    });
    throw handleApiError(error);
  }
};

export const getShortcuts = async (site_id) => {
  try {
    const response = await withRetry(async () => {
      return await SupportApiClient.get(`/support-messages/shortcuts/${site_id}`);
    });
   // log('[widget.js] getShortcuts Response:', response.data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const searchShortcuts = async (site_id, query) => {
  try {
    const response = await withRetry(async () => {
      return await SupportApiClient.get(`/support-messages/shortcuts/search/${site_id}`, {
        params: { query },
      });
    });
  //  log('[widget.js] searchShortcuts Response:', response.data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const createShortcut = async (data) => {
  try {
    const response = await withRetry(async () => {
      return await SupportApiClient.post('/support-messages/shortcuts', data);
    });
   // log('[widget.js] createShortcut Response:', response.data);
    return response.data;
  } catch (error) {
    // CHANGE: Updated logging to reflect correct field names (shortcut_name, message_content)
    if (error.response && error.response.status === 422) {
      console.error('[widget.js] createShortcut 422 Error Details:', {
        message: error.message,
        response: error.response.data,
        requestData: {
          shortcut_name: data.shortcut_name,
          message_content: data.message_content,
          site_id: data.site_id
        }
      });
    }
    throw handleApiError(error);
  }
};
export const updateShortcut = async (shortcut_id, data) => {
  try {
    const response = await withRetry(async () => {
      return await SupportApiClient.put(
        `/support-messages/shortcuts/${shortcut_id}`,
        null,
        {
          params: {
            site_id: data.site_id,
            shortcut_name: data.shortcut_name,
            message_content: data.message_content
          }
        }
      );
    });
 //   log('[widget.js] updateShortcut Response:', response.data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 422) {
      console.error('[widget.js] updateShortcut 422 Error Details:', {
        message: error.message,
        response: error.response.data,
        requestData: {
          shortcut_name: data.shortcut_name,
          message_content: data.message_content,
          site_id: data.site_id,
          shortcut_id
        }
      });
    }
    throw handleApiError(error);
  }
};

export const deleteShortcut = async (shortcut_id) => {
  try {
    const response = await withRetry(async () => {
      return await SupportApiClient.delete(`/support-messages/shortcuts/${shortcut_id}`);
    });
  //  log('[widget.js] deleteShortcut Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('[widget.js] deleteShortcut Error:', {
      message: error.message,
      response: error.response?.data,
      shortcut_id
    });
    throw handleApiError(error);
  }
};

export const getSupportRequests = async ({ agent_email, ticket_number, site_id, username, user_email, status, created_at, limit = 40, offset = 0 } = {}) => {
  try {
    const params = {
      limit,
      offset,
    };
    if (ticket_number) params.ticket_number = ticket_number;
    if (site_id && site_id !== '0') params.site_id = site_id;
    if (agent_email) params.agent_email = agent_email;
    if (username) params.username = username;
    if (user_email) params.user_email = user_email;
    if (status) params.status = status;
    if (created_at) params.created_at = created_at; // Add created_at to params
    // console.log('[widget.js] getSupportRequests params:', {
    //   agent_email,
    //   ticket_number,
    //   site_id,
    //   limit,
    //   offset,
    // });
    const response = await withRetry(async () => {
      return await SupportApiClient.get('/support-messages/support_requests', {
        params,
        headers: {
          'X-User-Email': agent_email || 'user@example.com', // CHANGE: Use provided agent_email or fallback
        },
      });
    });
    // console.log('[widget.js] getSupportRequests Response:', {
    //   tickets: response.data,
    //   count: response.data.length,
    //   site_ids: [...new Set(response.data.map((ticket) => ticket.site_id?.toString()).filter(Boolean))],
    //   ticket_numbers: response.data.map((ticket) => ticket.ticket_number),
    //   agent_emails: [...new Set(response.data.map((ticket) => ticket.agent_email).filter(Boolean))],
    // });
    return response.data;
  } catch (error) {
    console.error('[widget.js] getSupportRequests error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw handleApiError(error);
  }
};

export const uploadSupportFile = async (file, ticketNumber) => {
  try {
    if (!file) {
      throw new Error('No file selected.');
    }
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Supported files: JPG, PNG, PDF.');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size exceeds 5MB limit.');
    }
    if (!ticketNumber) {
      throw new Error('Invalid ticket number.');
    }

    // Generate a unique filename
    const extension = file.name.split('.').pop();
    const filename = `${ticketNumber}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${extension}`;
    
    // Convert file to base64
    const base64Content = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });

  //  log('[widget.js] uploadSupportFile: File encoded as base64', { filename, ticketNumber });
    return {
      filename,
      content: base64Content,
    };
  } catch (error) {
  //  log('[widget.js] uploadSupportFile Error:', error);
    throw error;
  }
};
// external api start
export const checkExternalApiStatus = async ({ ticket_number, req_type, key, txnid }) => {
  try {
    if (!ticket_number) {
      throw new Error('Ticket number is required.');
    }
    if (!req_type || !['ITR', 'GSTRETURN', 'GSTREG', 'PAN', 'INSURANCE', 'BSPR', 'BCERT'].includes(req_type)) {
      throw new Error('Invalid request type. Allowed: ITR, GSTRETURN, GSTREG, PAN, INSURANCE, BSPR, BCERT.');
    }
    if (!key || !['status', 'refund', 'priortised'].includes(key)) {
      throw new Error('Invalid key. Allowed: status, refund, priortised.');
    }
    if (!txnid || typeof txnid !== 'string' || txnid.trim() === '') {
      throw new Error('Invalid transaction ID.');
    }

    const payload = {
      ticket_number,
      req_type,
      key,
      txnid,
    };
    log('[widget.js] checkExternalApiStatus Request:', JSON.stringify(payload, null, 2));
    const response = await withRetry(async () => {
      return await SupportApiClient.post('/support/external-api-status', payload);
    });
    log('[widget.js] checkExternalApiStatus Response:', response.data);
    return response.data;
  } catch (error) {
    // Define payload for error logging
    const payload = {
      ticket_number,
      req_type,
      key,
      txnid,
    };
    console.error('[widget.js] checkExternalApiStatus Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      payload,
    });
    throw handleApiError(error);
  }
};
//external api end
// Support Desk API methods (unchanged parts omitted)

// connectWebSocket function

export const connectWebSocket = (ticketNumber, token, onMessage, onOpen, onClose, onError, websocketUrl) => {
  if (!token) {
    console.error('[widget.js] [connectWebSocket] No token provided for ticket:', ticketNumber);
    if (onError) onError(new Error('No token provided'));
    return null; // Prevent WebSocket connection attempt
  }
  if (!websocketUrl) {
    console.error('[widget.js] [connectWebSocket] No WebSocket URL provided for ticket:', ticketNumber);
    if (onError) onError(new Error('No WebSocket URL provided'));
    return null;
  }


  const ws = new WebSocket(websocketUrl);

  ws.onopen = () => {

    if (onOpen) onOpen();
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);

      if (message.content === 'Invalid token. Authentication failed.') {
        console.error('[widget.js] Server rejected token:', token.substring(0, 20) + '...');
        if (onError) onError(new Error('Invalid token. Authentication failed.'));
        ws.close();
        return;
      }
      if (onMessage) onMessage(message);
    } catch (error) {
      console.error('[widget.js] Error parsing WebSocket message:', error);
      if (onError) onError(error);
    }
  };

  ws.onclose = (event) => {

    if (onClose) onClose(event);
  };

  ws.onerror = (error) => {
    console.error('[widget.js] WebSocket error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    // Additional debugging for connection issues
    if (onError) onError(error);
  };

  return ws;
};
// Services/widget.js

export const getHistoricalTicketsByEmail = async ({ user_email, limit = 20, offset = 0, status = 'initiated,agent_engaged,resolved,closed' } = {}) => {
  try {
    if (!user_email || typeof user_email !== 'string' || !user_email.includes('@')) {
      throw new Error('Invalid or missing user_email');
    }

    const params = {
      user_email: user_email.trim().toLowerCase(),
      limit,
      offset,
      status,
    };
    const response = await withRetry(async () => {
      return await SupportApiClient.get('/support-messages/support_requests', {
        params,
        headers: {
          'X-User-Email': user_email, // Use user_email for consistency
        },
      });
    });


    return response.data;
  } catch (error) {
    console.error('[widget.js] getHistoricalTicketsByEmail error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw handleApiError(error);
  }
};
const addTokenInterceptor = (client) =>
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('accessToken');
      const apiKey = import.meta.env.VITE_API_KEY || '90N1TcGbz1Ia37BRjSVQAig_4S6eZ7q2';
      const authData = JSON.parse(localStorage.getItem('auth') || '{}');
      const userEmail = authData.sub || 'user@example.com'; // CHANGE: Remove agent_email fallback
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        config.headers['X-API-Key'] = apiKey;
      }
      config.headers['X-User-Email'] = userEmail;
      return config;
    },
    (error) => {
      log('[widget.js] Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

addTokenInterceptor(SupportApiClient);
export default SupportApiClient;
