const API_BASE_URL = 'http://localhost:8080/api/v1';

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('eon_token', token);
  } else {
    localStorage.removeItem('eon_token');
  }
};

export const getAuthToken = () => {
  return localStorage.getItem('eon_token');
};

const defaultHeaders = () => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  login: async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, device: 'Web Browser', os_type: 'Web' })
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    setAuthToken(data.token);
    return data;
  },
  
  register: async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  },

  getFiles: async () => {
    const res = await fetch(`${API_BASE_URL}/files`, {
      headers: defaultHeaders()
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  },

  uploadFile: async (file, onProgress) => {
    // For large files, direct-upload handles the chunking in the backend
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/files/direct-upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${getAuthToken()}`);

      let lastTime = Date.now();
      let lastLoaded = 0;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const currentTime = Date.now();
          const timeDiff = (currentTime - lastTime) / 1000; // seconds
          
          let speed = 0;
          if (timeDiff > 0.5) { // update speed every 0.5s
            const bytesDiff = event.loaded - lastLoaded;
            speed = bytesDiff / timeDiff; // bytes per second
            lastTime = currentTime;
            lastLoaded = event.loaded;
          }

          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(percentComplete, speed, event.loaded, event.total);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(xhr.responseText));
        }
      };

      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(formData);
    });
  },

  downloadFile: async (fileId, fileName, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', `${API_BASE_URL}/files/${fileId}/download`);
      xhr.setRequestHeader('Authorization', `Bearer ${getAuthToken()}`);
      xhr.responseType = 'blob';

      let lastTime = Date.now();
      let lastLoaded = 0;

      xhr.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const currentTime = Date.now();
          const timeDiff = (currentTime - lastTime) / 1000;
          
          let speed = 0;
          if (timeDiff > 0.5) {
            const bytesDiff = event.loaded - lastLoaded;
            speed = bytesDiff / timeDiff;
            lastTime = currentTime;
            lastLoaded = event.loaded;
          }

          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(percentComplete, speed, event.loaded, event.total);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const blob = xhr.response;
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
          resolve();
        } else {
          reject(new Error(xhr.statusText));
        }
      };

      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send();
    });
  },
  
  deleteFile: async (fileId) => {
    const res = await fetch(`${API_BASE_URL}/files/${fileId}`, {
      method: 'DELETE',
      headers: defaultHeaders()
    });
    if (!res.ok) throw new Error(await res.text());
  },

  getDevices: async () => {
    const res = await fetch(`${API_BASE_URL}/devices`, {
      headers: defaultHeaders()
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  },

  createDevice: async (name, osType) => {
    const res = await fetch(`${API_BASE_URL}/devices`, {
      method: 'POST',
      headers: defaultHeaders(),
      body: JSON.stringify({ name, os_type: osType })
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  }
};
