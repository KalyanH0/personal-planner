import { useState, useCallback } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

export function useApi() {
  const [loading, setLoading] = useState(false);

  const request = useCallback(async (method, path, data = null) => {
    setLoading(true);
    try {
      const config = { withCredentials: true };
      let res;
      if (method === 'get') {
        res = await axios.get(`${API}${path}`, config);
      } else if (method === 'post') {
        res = await axios.post(`${API}${path}`, data, config);
      } else if (method === 'put') {
        res = await axios.put(`${API}${path}`, data, config);
      } else if (method === 'patch') {
        res = await axios.patch(`${API}${path}`, data, config);
      } else if (method === 'delete') {
        res = await axios.delete(`${API}${path}`, config);
      }
      return res.data;
    } finally {
      setLoading(false);
    }
  }, []);

  return { request, loading };
}
