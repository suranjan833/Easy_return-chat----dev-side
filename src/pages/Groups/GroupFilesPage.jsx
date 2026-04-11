import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './GroupFilesPage.css';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://chatsupport.fskindia.com';

const GroupFilesPage = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloadingFiles, setDownloadingFiles] = useState({});
  const token = localStorage.getItem('accessToken');

  const handleApiError = (err, navigate) => {
    if (err.code === 'ERR_NETWORK') {
      return 'Network error: Unable to connect to the server. Please check your connection or try again later.';
    }
    if (err.response?.status === 401) {
      localStorage.removeItem('accessToken');
      navigate('/auth-login');
      return 'Session expired. Please log in again.';
    }
    if (err.response?.status === 404) {
      return 'File upload endpoint not found. Please verify the server configuration or contact support.';
    }
    if (err.response?.status === 422) {
      const details = err.response.data.detail;
      if (Array.isArray(details)) {
        return details.map(e => e.msg).join(', ');
      }
      return 'Invalid group ID or input.';
    }
    return err.response?.data?.detail || err.message || 'An unexpected error occurred.';
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return 'N/A';
    }
  };

  const getFilenameFromUrl = (url) => {
    if (!url || typeof url !== 'string') return 'Unknown';
    try {
      const parts = url.split('/');
      return parts[parts.length - 1] || 'Unknown';
    } catch {
      return 'Unknown';
    }
  };

  const fetchFiles = async () => {
    if (!groupId || isNaN(groupId)) {
      setError('Invalid group ID.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await axios.get(`${BASE_URL}/groups/${groupId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!Array.isArray(response.data)) {
        setFiles([]);
        setError('Unexpected response format from server.');
        return;
      }
      const fileMessages = response.data
        .filter(msg => msg.message_type === 'file' && msg.attachment)
        .map(msg => ({
          id: msg.id || msg.timestamp || `temp-${Date.now()}`,
          filename: getFilenameFromUrl(msg.attachment),
          uploaded_at: msg.timestamp,
          attachment: msg.attachment,
        }));
      setFiles(fileMessages);
      setError(null);
    } catch (err) {
      setError(handleApiError(err, navigate));
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setError('No authentication token found. Please log in.');
      navigate('/auth-login');
      return;
    }

    fetchFiles();
  }, [navigate, token, groupId]);

  const handleDownloadFile = async (file) => {
    if (!file.filename || !file.attachment) {
      setError('Invalid file data.');
      return;
    }

    try {
      setDownloadingFiles(prev => ({ ...prev, [file.id]: true }));

      const response = await axios.get(`${BASE_URL}/groups/upload-files/${file.filename}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob',
      });

      const contentType = response.headers['content-type'];
      const allowedTypes = [
        'image/jpeg', 'image/png', 'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!allowedTypes.includes(contentType)) {
        throw new Error('Unsupported file type received.');
      }

      const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setError(null);
    } catch (err) {
      setError(handleApiError(err, navigate));
    } finally {
      setDownloadingFiles(prev => ({ ...prev, [file.id]: false }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const allowedFormats = [
      'image/jpeg', 'image/png', 'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size exceeds 5MB limit.');
        setSelectedFile(null);
        return;
      }
      if (!allowedFormats.includes(file.type)) {
        setError('Invalid file format. Allowed formats: jpg, jpeg, png, pdf, doc, docx.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setError(null);
    } else {
      setSelectedFile(null);
    }
  };

  const handleUploadFile = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('groupId', groupId);

    try {
      setUploading(true);
      const uploadUrl = `${BASE_URL}/groups/${groupId}/upload-files/`.replace(/\/+$/, '');


      const response = await axios.post(uploadUrl, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccessMessage('File uploaded successfully!');
      setError(null);
      setSelectedFile(null);
      setTimeout(() => setSuccessMessage(null), 5000);
      fetchFiles();
    } catch (err) {
      setError(handleApiError(err, navigate));
    } finally {
      setUploading(false);
    }
  };

  const handleBack = () => {
    navigate('/app-group-chat');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Group Files</h1>
            <p className="mt-2 text-gray-600">Files for Group ID: {groupId}</p>
          </div>
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            aria-label="Back to groups"
          >
            <i className="bi bi-arrow-left mr-2" aria-hidden="true"></i>
            Back to Groups
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Upload File</h2>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md flex items-center">
              <i className="bi bi-exclamation-triangle-fill text-red-500 mr-3" aria-hidden="true"></i>
              <p className="text-red-700">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-600 transition-colors"
                aria-label="Close error alert"
              >
                <i className="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </div>
          )}
          {successMessage && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-md flex items-center">
              <i className="bi bi-check-circle-fill text-green-500 mr-3" aria-hidden="true"></i>
              <p className="text-green-700">{successMessage}</p>
              <button
                onClick={() => setSuccessMessage(null)}
                className="ml-auto text-green-500 hover:text-green-600 transition-colors"
                aria-label="Close success alert"
              >
                <i className="bi bi-x-lg" aria-hidden="true"></i>
              </button>
            </div>
          )}
          <div className="max-w-md">
            <label htmlFor="fileUpload" className="block text-sm font-medium text-gray-700 mb-2">
              Select File
            </label>
            <div className="relative">
              <input
                type="file"
                id="fileUpload"
                accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                onChange={handleFileChange}
                disabled={uploading}
                className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                aria-label="Select a file to upload"
              />
              <p className="mt-2 text-sm text-gray-500">
                Max 5MB. Allowed formats: jpg, jpeg, png, pdf, doc, docx.
              </p>
            </div>
            <button
              onClick={handleUploadFile}
              disabled={uploading || !selectedFile}
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
              aria-label="Upload selected file"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <i className="bi bi-upload mr-2" aria-hidden="true"></i>
                  Upload File
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Uploaded Files</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filename</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded At</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {files.length > 0 ? (
                  files.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">#{file.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                            <i className="bi bi-file-earmark-fill text-blue-600" aria-hidden="true"></i>
                          </div>
                          <span className="font-medium text-gray-900">{file.filename}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{formatTimestamp(file.uploaded_at)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDownloadFile(file)}
                          disabled={downloadingFiles[file.id]}
                          className="inline-flex items-center px-3 py-1 border border-blue-500 text-blue-600 font-medium rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:text-blue-400 disabled:border-blue-400 disabled:cursor-not-allowed"
                          title={`Download ${file.filename}`}
                          aria-label={`Download ${file.filename}`}
                        >
                          {downloadingFiles[file.id] ? (
                            <>
                              <svg className="animate-spin h-5 w-5 mr-2 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Downloading...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-download mr-1" aria-hidden="true"></i>
                              Download
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <div>
                        <i className="bi bi-file-earmark-x text-gray-400 text-4xl mb-3" aria-hidden="true"></i>
                        <p className="text-gray-600 mb-4">No files in this group.</p>
                        <div className="flex justify-center gap-3">
                          <button
                            onClick={handleBack}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            aria-label="Back to groups"
                          >
                            Back to Groups
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupFilesPage;