import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import LiveFleetMap from '../components/LiveFleetMap';

const LiveMap = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Live Fleet Map</h1>
          <p className="text-sm text-gray-600">Real-time GPS tracking of your fleet vehicles</p>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <LiveFleetMap />
        </div>
      </div>
    </div>
  );
};

export default LiveMap;