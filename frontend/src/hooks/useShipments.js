import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

export function useShipments(params = {}) {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams(params).toString();
      const res = await client.get(`/orders/shipments/${query ? `?${query}` : ''}`);
      setShipments(res.data?.results ?? []);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => { fetch(); }, [fetch]);

  return { shipments, loading, error, refetch: fetch };
}
