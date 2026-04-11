import axios from "axios";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://chatsupport.fskindia.com";
const ApiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

const log = process.env.NODE_ENV === "development" ? console.log : () => {};

const handleApiError = (error) => {
  console.error("API Error Details:", {
    message: error.message,
    responseStatus: error.response?.status,
    responseData: error.response?.data,
    requestConfig: error.config,
    code: error.code,
    isAxiosError: error.isAxiosError,
  });
  if (error.code === "ERR_NETWORK") {
    throw new Error("Network error: Unable to connect to the server.");
  }
  if (error.response?.status === 401) {
    throw new Error(
      "Unauthorized access. Please check your credentials or permissions.",
    );
  }
  if (error.response?.status === 403) {
    throw new Error("Forbidden access. Please verify your token or API key.");
  }
  if (error.response?.status === 404) {
    throw new Error("Resource not found.");
  }
  if (error.response?.status === 422) {
    const details = error.response.data.detail;
    if (Array.isArray(details)) {
      throw new Error(details.map((e) => e.msg).join(", "));
    }
    throw new Error(details || "Invalid input provided.");
  }
  throw new Error(
    error.response?.data?.detail ||
      error.message ||
      "An unexpected error occurred.",
  );
};

const addTokenInterceptor = (client) =>
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("accessToken");
      if (token && typeof token === "string" && token.trim()) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
      }
      if (config.headers["Content-Type"] === "multipart/form-data") {
        delete config.headers["Content-Type"];
      }
      // log('Request Details:', {
      //   url: config.url,
      //   fullUrl: `${config.baseURL}${config.url}`,
      //   method: config.method,
      //   headers: { ...config.headers.common, ...config.headers },
      // });
      return config;
    },
    (error) => Promise.reject(error),
  );

addTokenInterceptor(ApiClient);

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

// Messaging API Functions
export const getUploadedFile = async (filename) => {
  try {
    const response = await ApiClient.get(`/messaging/upload-file/${filename}`, {
      responseType: "blob",
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
//test for attachment
export const uploadAttachment = async (formData) => {
  try {
    const response = await ApiClient.post("/messaging/files/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Attachment upload error:", error);
    throw handleApiError(error);
  }
};
//test end for attachement
export const getDirectMessages = async (userId1, userId2, skip = 0, limit = 500) => {
  try {
    const response = await withRetry(() =>
      ApiClient.get(
        `/messaging/messages/${parseInt(userId1)}/${parseInt(userId2)}`,
        { params: { skip, limit } },
      ),
    );
    if (!Array.isArray(response.data))
      throw new Error("Expected an array of messages");
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getUnreadCount = async (userId) => {
  try {
    const response = await ApiClient.get("/messaging/messages/unread/count", {
      params: { user_id: parseInt(userId) }, // Convert userId to integer
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const markAllRead = async (userId) => {
  try {
    const response = await ApiClient.put(
      `/messaging/messages/read-all?sender_id=${userId}`,
      {
        sender_id: userId,
      },
    );
    return response.data;
  } catch (error) {
    console.error("markAllRead error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || "Field required");
  }
};

export const getRecentChats = async () => {
  try {
    const response = await withRetry(() =>
      ApiClient.get("/messaging/recent-chats"),
    );
    if (!Array.isArray(response.data))
      throw new Error("Expected an array of chats");
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export default ApiClient;
