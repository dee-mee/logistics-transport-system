import React, { useState, useEffect } from 'react';
import { Folder, FileText, AlertTriangle, Clock, CheckCircle, Search, Filter, Download, Eye, Trash2, Plus } from 'lucide-react';
import client from '../api/client';
import DocumentList from '../components/DocumentList';

const Documents = () => {
  const [activeTab, setActiveTab] = useState('all'); // all, users, vehicles, organizations
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const response = await client.get('/documents/documents/statistics/');
      setStatistics(response.data);
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
      // Set default statistics if API fails
      setStatistics({
        total_documents: 0,
        valid_documents: 0,
        expired_documents: 0,
        expiring_soon_documents: 0,
        pending_documents: 0,
        rejected_documents: 0,
        documents_by_type: {},
        documents_by_entity: {}
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEntitySelect = (entityType, entityId, entityName) => {
    setSelectedEntity({ type: entityType, id: entityId, name: entityName });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Document Management</h1>
          <p className="text-gray-600">Manage and track all compliance documents</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      {/* Overall Statistics */}
      {statistics && (
        <div className="grid grid-cols-5 gap-4">
          <div 
            className="bg-white rounded-lg border border-gray-200 p-6 cursor-pointer hover:border-indigo-500 transition-colors"
            onClick={() => { setActiveTab('all'); setSelectedEntity(null); }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Documents</p>
                <p className="text-3xl font-bold text-gray-900">{statistics.total_documents}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div 
            className="bg-white rounded-lg border border-gray-200 p-6 cursor-pointer hover:border-green-500 transition-colors"
            onClick={() => { setActiveTab('valid'); setSelectedEntity(null); }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Valid</p>
                <p className="text-3xl font-bold text-green-600">{statistics.valid_documents}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div 
            className="bg-white rounded-lg border border-gray-200 p-6 cursor-pointer hover:border-yellow-500 transition-colors"
            onClick={() => { setActiveTab('expiring_soon'); setSelectedEntity(null); }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expiring Soon</p>
                <p className="text-3xl font-bold text-yellow-600">{statistics.expiring_soon_documents}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
          <div 
            className="bg-white rounded-lg border border-gray-200 p-6 cursor-pointer hover:border-red-500 transition-colors"
            onClick={() => { setActiveTab('expired'); setSelectedEntity(null); }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expired</p>
                <p className="text-3xl font-bold text-red-600">{statistics.expired_documents}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
          <div 
            className="bg-white rounded-lg border border-gray-200 p-6 cursor-pointer hover:border-gray-500 transition-colors"
            onClick={() => { setActiveTab('pending'); setSelectedEntity(null); }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Verification</p>
                <p className="text-3xl font-bold text-gray-600">{statistics.pending_documents}</p>
              </div>
              <div className="bg-gray-100 p-3 rounded-full">
                <Clock className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Entity Selection Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => { setActiveTab('all'); setSelectedEntity(null); }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Documents
            </button>
            <button
              onClick={() => { setActiveTab('users'); setSelectedEntity(null); }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              User Documents
            </button>
            <button
              onClick={() => { setActiveTab('vehicles'); setSelectedEntity(null); }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'vehicles'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Vehicle Documents
            </button>
            <button
              onClick={() => { setActiveTab('organizations'); setSelectedEntity(null); }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'organizations'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Organization Documents
            </button>
          </nav>
        </div>

        <div className="p-6">
          {selectedEntity ? (
            <DocumentList
              entityType={selectedEntity.type}
              entityId={selectedEntity.id}
              entityName={selectedEntity.name}
            />
          ) : (
            <div className="space-y-6">
              {activeTab === 'all' && (
                <AllDocuments onSelectEntity={handleEntitySelect} />
              )}

              {activeTab === 'valid' && (
                <DocumentsByStatus status="valid" onSelectEntity={handleEntitySelect} />
              )}

              {activeTab === 'expiring_soon' && (
                <DocumentsByStatus status="expiring_soon" onSelectEntity={handleEntitySelect} />
              )}

              {activeTab === 'expired' && (
                <DocumentsByStatus status="expired" onSelectEntity={handleEntitySelect} />
              )}

              {activeTab === 'pending' && (
                <DocumentsByStatus status="pending" onSelectEntity={handleEntitySelect} />
              )}

              {activeTab === 'users' && (
                <UserDocuments onSelectEntity={handleEntitySelect} />
              )}

              {activeTab === 'vehicles' && (
                <VehicleDocuments onSelectEntity={handleEntitySelect} />
              )}

              {activeTab === 'organizations' && (
                <OrganizationDocuments onSelectEntity={handleEntitySelect} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Component to display documents by status
const DocumentsByStatus = ({ status, onSelectEntity }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDocumentsByStatus();
  }, [status]);

  const getDisplayStatus = (status) => {
    // Handle both underscore and hyphen formats
    if (status === 'expiring_soon') return 'expiring_soon';
    return status;
  };

  const getStatusLabel = (status) => {
    const labels = {
      'valid': 'Valid',
      'expired': 'Expired', 
      'expiring_soon': 'Expiring Soon',
      'pending': 'Pending Verification',
      'rejected': 'Rejected'
    };
    return labels[status] || status;
  };

  const fetchDocumentsByStatus = async () => {
    try {
      const displayStatus = getDisplayStatus(status);
      const response = await client.get('/documents/documents/', {
        params: { status: displayStatus }
      });
      const docData = response.data.results || response.data;
      setDocuments(Array.isArray(docData) ? docData : []);
    } catch (err) {
      console.error('Failed to fetch documents by status:', err);
      setError('Failed to load documents: ' + err.message);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">
      <AlertCircle className="w-16 h-16 mx-auto mb-4" />
      <p className="text-lg">{error}</p>
    </div>;
  }

  if (documents.length === 0) {
    return <div className="text-center py-12 text-gray-500">
      <Folder className="w-16 h-16 mx-auto mb-4 text-gray-400" />
      <p className="text-lg">No {getStatusLabel(status)} documents found</p>
      <p className="text-sm mt-2">Documents with this status will appear here</p>
    </div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">{getStatusLabel(status)} Documents ({documents.length})</h3>
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {documents.map((doc) => (
            <li key={doc.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-indigo-600 truncate">{doc.title}</p>
                    <p className="text-sm text-gray-500">
                      {doc.entity_type} - {doc.document_type} - {getStatusLabel(doc.status)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {doc.file && (
                    <button
                      onClick={() => window.open(doc.file, '_blank')}
                      className="text-indigo-600 hover:text-indigo-900 text-sm"
                    >
                      View
                    </button>
                  )}
                  <button
                    onClick={() => onSelectEntity({ type: doc.entity_type, id: doc.entity_id, name: doc.title })}
                    className="text-gray-600 hover:text-gray-900 text-sm"
                  >
                    Details
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// Component to display all documents
const AllDocuments = ({ onSelectEntity }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAllDocuments();
  }, []);

  const fetchAllDocuments = async () => {
    try {
      const response = await client.get('/documents/documents/');
      const docData = response.data.results || response.data;
      setDocuments(Array.isArray(docData) ? docData : []);
    } catch (err) {
      console.error('Failed to fetch all documents:', err);
      setError('Failed to load documents: ' + err.message);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">
      <AlertCircle className="w-16 h-16 mx-auto mb-4" />
      <p className="text-lg">{error}</p>
    </div>;
  }

  if (documents.length === 0) {
    return <div className="text-center py-12 text-gray-500">
      <Folder className="w-16 h-16 mx-auto mb-4 text-gray-400" />
      <p className="text-lg">No documents found</p>
      <p className="text-sm mt-2">Upload documents to get started</p>
    </div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">All Documents ({documents.length})</h3>
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {documents.map((doc) => (
            <li key={doc.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-indigo-600 truncate">{doc.title}</p>
                    <p className="text-sm text-gray-500">
                      {doc.entity_type} - {doc.document_type} - {doc.status}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {doc.file && (
                    <button
                      onClick={() => window.open(doc.file, '_blank')}
                      className="text-indigo-600 hover:text-indigo-900 text-sm"
                    >
                      View
                    </button>
                  )}
                  <button
                    onClick={() => onSelectEntity({ type: doc.entity_type, id: doc.entity_id, name: doc.title })}
                    className="text-gray-600 hover:text-gray-900 text-sm"
                  >
                    Details
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// Component to display list of users with their document status
const UserDocuments = ({ onSelectEntity }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await client.get('/documents/documents/entities/?entity_type=user');
      const userData = response.data || [];
      setUsers(Array.isArray(userData) ? userData : []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users: ' + err.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <p className="ml-4">Loading users...</p>
    </div>;
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-600">
      {error}
    </div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Select a User</h3>
      <p className="text-sm text-gray-500">Found {users.length} users</p>
      {users.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Folder className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p>No users found</p>
          <p className="text-sm mt-2">You may not have permission to view users or no users exist.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {users.map((user) => (
            <div
              key={user.id}
              onClick={() => onSelectEntity('user', user.id, user.name)}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md cursor-pointer transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">👤</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Component to display list of vehicles with their document status
const VehicleDocuments = ({ onSelectEntity }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await client.get('/documents/documents/entities/?entity_type=vehicle');
      const vehicleData = response.data || [];
      setVehicles(Array.isArray(vehicleData) ? vehicleData : []);
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
      setError('Failed to load vehicles: ' + err.message);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <p className="ml-4">Loading vehicles...</p>
    </div>;
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-600">
      {error}
    </div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Select a Vehicle</h3>
      <p className="text-sm text-gray-500">Found {vehicles.length} vehicles</p>
      {vehicles.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Folder className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p>No vehicles found</p>
          <p className="text-sm mt-2">You may not have permission to view vehicles or no vehicles exist.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              onClick={() => onSelectEntity('vehicle', vehicle.id, vehicle.name)}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md cursor-pointer transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">🚗</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{vehicle.name}</p>
                  <p className="text-sm text-gray-500">{vehicle.make} {vehicle.model}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Component to display list of organizations with their document status
const OrganizationDocuments = ({ onSelectEntity }) => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await client.get('/documents/documents/entities/?entity_type=organization');
      const orgData = response.data || [];
      setOrganizations(Array.isArray(orgData) ? orgData : []);
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
      setError('Failed to load organizations: ' + err.message);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <p className="ml-4">Loading organizations...</p>
    </div>;
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-600">
      {error}
    </div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Select an Organization</h3>
      <p className="text-sm text-gray-500">Found {organizations.length} organizations</p>
      {organizations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Folder className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p>No organizations found</p>
          <p className="text-sm mt-2">You may not have permission to view organizations or no organizations exist.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {organizations.map((org) => (
            <div
              key={org.id}
              onClick={() => onSelectEntity('organization', org.id, org.name)}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md cursor-pointer transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">🏢</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{org.name}</p>
                  <p className="text-sm text-gray-500">{org.industry || 'Organization'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Documents;
