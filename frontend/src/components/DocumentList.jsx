import React, { useState, useEffect } from 'react';
import { FileText, Calendar, AlertTriangle, CheckCircle, Clock, Download, Trash2, Eye, Filter } from 'lucide-react';
import axios from 'axios';
import DocumentUpload from './DocumentUpload';

const DocumentList = ({ entityType, entityId, entityName }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, valid, expiring_soon, expired, pending
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState('');

  const documentTypes = [
    { value: 'national_id', label: 'National ID', icon: '🆔' },
    { value: 'kra_pin', label: 'KRA PIN', icon: '📋' },
    { value: 'kra_certificate', label: 'KRA Certificate', icon: '📄' },
    { value: 'driving_license', label: 'Driving License', icon: '🪪' },
    { value: 'profile_photo', label: 'Profile Photo', icon: '👤' },
    { value: 'certificate_of_good_conduct', label: 'Certificate of Good Conduct', icon: '✅' },
    { value: 'passport', label: 'Passport', icon: '🛂' },
    { value: 'medical_certificate', label: 'Medical Certificate', icon: '🏥' },
    { value: 'insurance', label: 'Insurance', icon: '🛡️' },
    { value: 'registration', label: 'Registration', icon: '📝' },
    { value: 'number_plate', label: 'Number Plate', icon: '🚗' },
    { value: 'inspection_certificate', label: 'Inspection Certificate', icon: '🔍' },
    { value: 'road_worthiness', label: 'Road Worthiness', icon: '✓' },
    { value: 'logbook', label: 'Logbook', icon: '📖' },
  ];

  useEffect(() => {
    fetchDocuments();
  }, [entityType, entityId]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/documents/documents/', {
        params: { entity_type: entityType, entity_id: entityId },
      });
      const docData = response.data.results || response.data;
      setDocuments(Array.isArray(docData) ? docData : []);
    } catch (err) {
      setError('Failed to load documents');
      console.error(err);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (newDocument) => {
    setDocuments([...documents, newDocument]);
    setShowUploadModal(false);
  };

  const handleDelete = async (documentId) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await axios.delete(`/api/documents/documents/${documentId}/`);
      setDocuments(documents.filter(doc => doc.id !== documentId));
    } catch (err) {
      setError('Failed to delete document');
      console.error(err);
    }
  };

  const handleVerify = async (documentId, isVerified) => {
    try {
      await axios.post(`/api/documents/documents/${documentId}/verify/`, {
        is_verified: isVerified,
        verification_notes: isVerified ? 'Document verified' : 'Document rejected'
      });
      fetchDocuments();
    } catch (err) {
      setError('Failed to verify document');
      console.error(err);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'expired':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'expiring_soon':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-500" />;
      case 'rejected':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'valid':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'expiring_soon':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (filter === 'all') return true;
    return doc.status === filter;
  });

  const getDocumentTypeIcon = (type) => {
    const docType = documentTypes.find(t => t.value === type);
    return docType ? docType.icon : '📄';
  };

  const getDocumentTypeLabel = (type) => {
    const docType = documentTypes.find(t => t.value === type);
    return docType ? docType.label : type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
          <p className="text-gray-600">{entityName} - Document Management</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-600">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 border-b-2 font-medium ${filter === 'all' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          All ({documents.length})
        </button>
        <button
          onClick={() => setFilter('valid')}
          className={`px-4 py-2 border-b-2 font-medium ${filter === 'valid' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Valid ({documents.filter(d => d.status === 'valid').length})
        </button>
        <button
          onClick={() => setFilter('expiring_soon')}
          className={`px-4 py-2 border-b-2 font-medium ${filter === 'expiring_soon' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Expiring Soon ({documents.filter(d => d.status === 'expiring_soon').length})
        </button>
        <button
          onClick={() => setFilter('expired')}
          className={`px-4 py-2 border-b-2 font-medium ${filter === 'expired' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Expired ({documents.filter(d => d.status === 'expired').length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 border-b-2 font-medium ${filter === 'pending' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Pending ({documents.filter(d => d.status === 'pending').length})
        </button>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No documents found</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiry Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDocuments.map((document) => (
                <tr key={document.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-xl">
                        {getDocumentTypeIcon(document.document_type)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{document.title}</div>
                        <div className="text-sm text-gray-500">{document.document_number || 'No number'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{getDocumentTypeLabel(document.document_type)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(document.status)}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(document.status)}`}>
                        {document.status.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-900">
                      <Calendar className="w-4 h-4" />
                      {document.expiry_date ? new Date(document.expiry_date).toLocaleDateString() : 'No expiry'}
                    </div>
                    {document.days_until_expiry !== null && document.days_until_expiry >= 0 && (
                      <span className="text-xs text-gray-500">
                        ({document.days_until_expiry} days)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      {document.file && (
                        <button
                          onClick={() => window.open(document.file, '_blank')}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      {document.file && (
                        <button
                          onClick={() => window.open(document.file, '_blank')}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {!document.is_verified && document.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleVerify(document.id, true)}
                            className="text-green-600 hover:text-green-900"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleVerify(document.id, false)}
                            className="text-red-600 hover:text-red-900"
                            title="Reject"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(document.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showUploadModal && (
        <DocumentUpload
          entityType={entityType}
          entityId={entityId}
          documentType={selectedDocumentType}
          onUploadComplete={handleUploadComplete}
          onCancel={() => setShowUploadModal(false)}
        />
      )}
    </div>
  );
};

export default DocumentList;