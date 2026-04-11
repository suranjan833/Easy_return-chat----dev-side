import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://chatsupport.fskindia.com';
const SUPPORT_DESK_BASE_URL = import.meta.env.VITE_SUPPORT_DESK_API_BASE_URL || 'https://supportdesk.fskindia.com';

const ApiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
});

const SupportApiClient = axios.create({
  baseURL: SUPPORT_DESK_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Conditional logging for development only
const log = process.env.NODE_ENV === 'development' ? console.log : () => {};

// Handle API errors consistently
const handleApiError = (error) => {
  log('API Error:', error.response || error);
  if (error.code === 'ERR_NETWORK') {
    throw new Error('Network error: Unable to connect to the server.');
  }
  if (error.response?.status === 401) {
    log('401 Unauthorized - Check token or backend permissions:', error.response.data);
    throw new Error('Unauthorized access. Please check your credentials or permissions.');
  }
  if (error.response?.status === 403) {
    log('403 Forbidden - Check token or API key:', error.response.data);
    throw new Error('Forbidden access. Please verify your token or API key.');
  }
  if (error.response?.status === 404) {
    throw new Error('Resource not found.');
  }
  if (error.response?.status === 422) {
    log('422 Unprocessable Content - Full Response:', JSON.stringify(error.response.data, null, 2));
    const details = error.response.data.detail;
    if (Array.isArray(details)) {
      throw new Error(details.map((e) => e.msg).join(', '));
    }
    throw new Error(details || 'Invalid input provided.');
  }
  throw new Error(error.response?.data?.detail || error.message || 'An unexpected error occurred.');
};

// Add Bearer token to requests
const addTokenInterceptor = (client) =>
  client.interceptors.request.use(
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

addTokenInterceptor(ApiClient);
addTokenInterceptor(SupportApiClient);

// Retry logic
const withRetry = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
};



// API methods for roles
export const getRoles = async () => {
  try {
    const response = await ApiClient.get('/roles/');
    log('getRoles Response:', response.data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const createRole = async (roleData) => {
  try {
    const response = await ApiClient.post('/roles/create', roleData);
    log('createRole Response:', response.data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// API methods for users
export const loginUser = async (credentials) => {
  try {
    const response = await ApiClient.post('/users/authenticate', credentials);
    log('loginUser Response:', response.data);
    if (!response.data?.access_token) {
      throw new Error('No access token received');
    }
    const userId = response.data.profile?.id || response.data.profile?.user_id;
    if (!userId || isNaN(parseInt(userId, 10))) {
      log('Invalid profile structure:', response.data.profile);
      throw new Error('Invalid user ID in profile');
    }
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getUser = async (userId) => {
  try {
    const response = await ApiClient.get(`/users/${userId}`);
    log('getUser Response:', response.data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const searchUsers = async (query) => {
  try {
    const response = await ApiClient.get('/users/search/', { params: { q: query } });
    log('searchUsers Response:', response.data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};


// API methods for groups
export const getGroupMessages = async (groupId) => {
  try {
    const response = await ApiClient.get(`/groups/${groupId}/messages`);
   // log('getGroupMessages Response:', response.data);
    if (!Array.isArray(response.data)) {
      throw new Error('Expected an array of messages');
    }
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const sendGroupMessage = async (groupId, messageData) => {
  try {
   // log('sendGroupMessage - Parameters:', { groupId, messageData });
    const response = await ApiClient.post(`/groups/${groupId}/messages`, { message: messageData });
    // log('sendGroupMessage Response:', response.data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getGroups = async ({ search = '' } = {}) => {
  try {
    const response = await ApiClient.get('/groups/', {
      params: { _t: Date.now(), search },
    });
    log('getGroups Response:', response.data);
    if (!Array.isArray(response.data)) {
      throw new Error('Expected an array of groups');
    }
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};


// Dedicated function for uploading group avatars
export const uploadGroupAvatar = async (file, groupId) => {
  try {
    if (!file) {
      throw new Error('No file selected.');
    }
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      throw new Error(`Invalid file type: ${file.type}. Please select a JPEG or PNG image.`);
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error(`File size ${file.size} bytes exceeds 5MB limit.`);
    }
    if (!groupId || isNaN(groupId)) {
      throw new Error(`Invalid group ID: ${groupId}.`);
    }

    log('Uploading group avatar:', {
      name: file.name,
      type: file.type,
      size: file.size,
      groupId: groupId,
    });

    const formData = new FormData();
    formData.append('file', file);

    const response = await withRetry(() =>
      ApiClient.post(`/groups/upload_avatar/${groupId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );

    log('uploadGroupAvatar Response:', JSON.stringify(response.data, null, 2));

    // Handle various possible response formats
    const avatarUrl =
      response.data?.avatar_url ||
      response.data?.url ||
      response.data?.filename ||
      response.data?.group_avatar ||
      (response.data?.data && typeof response.data.data === 'string' ? response.data.data : null);

    if (!avatarUrl) {
      throw new Error(
        `Invalid response format: Expected avatar_url, url, filename, or group_avatar. Received: ${JSON.stringify(response.data)}`
      );
    }

    return { avatar_url: avatarUrl };
  } catch (error) {
    if (error.response?.status === 401) {
      try {
        await refreshToken();
        const formData = new FormData();
        formData.append('file', file);
        const response = await ApiClient.post(`/groups/upload_avatar/${groupId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        log('uploadGroupAvatar Retry Response:', JSON.stringify(response.data, null, 2));

        const avatarUrl =
          response.data?.avatar_url ||
          response.data?.url ||
          response.data?.filename ||
          response.data?.group_avatar ||
          (response.data?.data && typeof response.data.data === 'string' ? response.data.data : null);

        if (!avatarUrl) {
          throw new Error(
            `Invalid response format after retry: Expected avatar_url, url, filename, or group_avatar. Received: ${JSON.stringify(response.data)}`
          );
        }

        return { avatar_url: avatarUrl };
      } catch (retryError) {
        throw handleApiError(retryError);
      }
    }
    throw handleApiError(error);
  }
};

// Modified uploadFile for general file uploads (non-avatar)
export const uploadFile = async (file, groupId) => {
  try {
    if (!file) {
      throw new Error('No file selected.');
    }
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      throw new Error(`Invalid file type: ${file.type}. Please select a JPEG or PNG image.`);
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error(`File size ${file.size} bytes exceeds 5MB limit.`);
    }
    if (!groupId || isNaN(groupId)) {
      throw new Error(`Invalid group ID: ${groupId}.`);
    }

    log('Uploading file:', {
      name: file.name,
      type: file.type,
      size: file.size,
      groupId: groupId,
    });

    const formData = new FormData();
    formData.append('file', file);

    const response = await withRetry(() =>
      ApiClient.post(`/groups/upload-files/${groupId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );

    log('uploadFile Response:', response.data);

    if (response.data?.url || response.data?.filename) {
      return { url: response.data.url || response.data.filename };
    }
    throw new Error('Invalid response format: Expected url or filename');
  } catch (error) {
    if (error.response?.status === 401) {
      try {
        await refreshToken();
        const formData = new FormData();
        formData.append('file', file);
        const response = await ApiClient.post(`/groups/upload-files/${groupId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        log('uploadFile Retry Response:', response.data);
        if (response.data?.url || response.data?.filename) {
          return { url: response.data.url || response.data.filename };
        }
        throw new Error('Invalid response format: Expected url or filename');
      } catch (retryError) {
        throw handleApiError(retryError);
      }
    }
    throw handleApiError(error);
  }
};

export const uploadGroupFile = async (file) => {
  const validTypes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (!validTypes.includes(file.type)) {
    throw new Error('Supported files: JPG, PNG, PDF, DOC, DOCX.');
  }

  const formData = new FormData();
  formData.append('file', file);
  try {
    const response = await ApiClient.post('/groups/upload-files/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    log('uploadGroupFile Response:', response.data);
    if (!response.data?.url && !response.data?.filename) {
      throw new Error('Invalid response format: Expected url or filename');
    }
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      try {
        await refreshToken();
        const response = await ApiClient.post('/groups/upload-files/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        log('uploadGroupFile Retry Response:', response.data);
        if (!response.data?.url && !response.data?.filename) {
          throw new Error('Invalid response format: Expected url or filename');
        }
        return response.data;
      } catch (retryError) {
        throw handleApiError(retryError);
      }
    }
    throw handleApiError(error);
  }
};
//End group
// Upload direct message file
export const uploadDirectMessageFile = async (file) => {
  const validTypes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (!validTypes.includes(file.type)) {
    throw new Error('Supported files: JPG, PNG, PDF, DOC, DOCX.');
  }

  const formData = new FormData();
  formData.append('file', file);
  try {
    const response = await ApiClient.post('/messaging/upload-file/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    log('uploadDirectMessageFile Response:', response.data);
    if (!response.data?.url && !response.data?.filename) {
      throw new Error('Invalid response format: Expected url or filename');
    }
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      try {
        await refreshToken();
        const response = await ApiClient.post('/messaging/upload-file/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        log('uploadDirectMessageFile Retry Response:', response.data);
        if (!response.data?.url && !response.data?.filename) {
          throw new Error('Invalid response format: Expected url or filename');
        }
        return response.data;
      } catch (retryError) {
        throw handleApiError(retryError);
      }
    }
    throw handleApiError(error);
  }
};

// Get direct messages
export const getDirectMessages = async (userId1, userId2) => {
  try {
    const response = await ApiClient.get(`/messaging/messages/${userId1}/${userId2}`);
    log('getDirectMessages Response:', response.data);
    if (!Array.isArray(response.data)) {
      throw new Error('Expected an array of messages');
    }
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Edit message
export const editMessage = async (messageId, content) => {
  try {
    const response = await ApiClient.put(`/messaging/edit-message/${messageId}`, { content });
    log('editMessage Response:', response.data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Update message status
export const updateMessageStatus = async (messageId, status) => {
  try {
    const response = await ApiClient.put(`/messaging/messages/${messageId}/status`, { status });
    log('updateMessageStatus Response:', response.data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get unread count
export const getUnreadCount = async () => {
  try {
    const response = await ApiClient.get('/messaging/messages/unread/count');
    log('getUnreadCount Response:', response.data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Mark all messages as read
export const markAllRead = async () => {
  try {
    const response = await ApiClient.put('/messaging/messages/read-all');
    log('markAllRead Response:', response.data);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get recent chats
export const getRecentChats = async () => {
  try {
    const response = await ApiClient.get('/messaging/recent-chats');
    log('getRecentChats Response:', response.data);
    if (!Array.isArray(response.data)) {
      throw new Error('Expected an array of chats');
    }
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Download file
export const downloadFile = async (filename) => {
  try {
    const response = await ApiClient.get(`/messaging/upload-file/${filename}`, {
      responseType: 'blob',
    });
    log('downloadFile Response: Blob received');
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Delete message
export const deleteMessage = async (groupId, messageId) => {
  try {
    log('deleteMessage - Parameters:', { groupId, messageId });
    if (!messageId || isNaN(parseInt(messageId, 10))) {
      throw new Error('Invalid message ID: Must be a valid integer');
    }
    let response;
    try {
      response = await ApiClient.delete(`/groups/${groupId}/messages/${messageId}`);
      log('deleteMessage Response (Group):', response.data);
    } catch (groupErr) {
      if (groupErr.response?.status === 404) {
        log('Group message not found, trying messaging endpoint:', messageId);
        response = await ApiClient.delete(`/messaging/delete-message/${messageId}`);
        log('deleteMessage Response (Messaging):', response.data);
      } else {
        log('deleteMessage Group Error:', groupErr.response?.data);
        throw groupErr;
      }
    }
    return response.data;
  } catch (error) {
    log('deleteMessage Final Error:', error.response?.data || error);
    throw handleApiError(error);
  }
};

export const getAgentInfoByEmail = async (email) => {
  try {
    const token = localStorage.getItem('accessToken');
    const apiKey = import.meta.env.VITE_API_KEY || "90N1TcGbz1Ia37BRjSVQAig_4S6eZ7q2";
    
    // First, get all departments to find agents
    const departmentsResponse = await ApiClient.get('/agents/departments', {
      headers: {
        "x-api-key": apiKey,
      },
    });

    if (!Array.isArray(departmentsResponse.data)) {
      throw new Error('Invalid departments response');
    }

    // Search through all departments for the agent
    for (const department of departmentsResponse.data) {
      if (department.id) {
        try {
          const agentsResponse = await ApiClient.get(`/agents/departments/${department.id}`, {
            headers: {
              "x-api-key": apiKey,
            },
          });

          if (Array.isArray(agentsResponse.data)) {
            const agent = agentsResponse.data.find(agent => agent.email === email);
            if (agent) {
              // Only return if we have a valid name that's different from email
              if (agent.first_name && agent.last_name && 
                  `${agent.first_name} ${agent.last_name}`.trim() !== email) {
                return {
                  id: agent.id,
                  email: agent.email,
                  first_name: agent.first_name,
                  last_name: agent.last_name,
                  phone_number: agent.phone_number,
                  role_id: agent.role_id,
                  is_active: agent.is_active,
                  availability: agent.availability,
                  date_joined: agent.date_joined
                };
              }
            }
          }
        } catch (err) {
          console.warn(`Failed to fetch agents for department ${department.id}:`, err);
          continue;
        }
      }
    }

    return null; // Agent not found or no valid name
  } catch (err) {
    console.error('Error fetching agent info:', err);
    return null;
  }
};

export default ApiClient;