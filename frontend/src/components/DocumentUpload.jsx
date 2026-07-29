import React, { useState } from 'react';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';

const DocumentUpload = ({ 
  entityType, 
  entityId, 
  documentType, 
  onUploadComplete, 
  onCancel,
  existingDocument = null 
}) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: existingDocument?.title || '',
    description: existingDocument?.description || '',
    document_number: existingDocument?.document_number || '',
    issuing_authority: existingDocument?.issuing_authority || '',
    issue_date: existingDocument?.issue_date || '',
    expiry_date: existingDocument?.expiry_date || '',
    reminder_days_before: existingDocument?.reminder_days_before || 30,
    document_type: existingDocument?.document_type || documentType || 'national_id'
  });

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

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Only PDF, JPG, PNG, and DOC files are allowed');
        return;
      }
      
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      setFile(selectedFile);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setUploading(true);

    try {
      const formDataObj = new FormData();
      formDataObj.append('entity_type', entityType);
      formDataObj.append('entity_id', entityId);
      formDataObj.append('document_type', formData.document_type);
      formDataObj.append('title', formData.title);
      formDataObj.append('description', formData.description);
      formDataObj.append('document_number', formData.document_number || 'N/A');
      formDataObj.append('issuing_authority', formData.issuing_authority || 'N/A');
      formDataObj.append('issue_date', formData.issue_date || '');
      formDataObj.append('expiry_date', formData.expiry_date || '');
      formDataObj.append('reminder_days_before', formData.reminder_days_before);
      
      if (file) {
        formDataObj.append('file', file);
      }

      const response = await fetch('/api/documents/documents/', {
        method: 'POST',
        body: formDataObj,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Upload error:', errorData);
        const errorMessage = errorData.detail || errorData.file || Object.values(errorData).join(', ') || 'Upload failed';
        throw new Error(errorMessage);
      }

      const data = await response.json();
      onUploadComplete(data);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {existingDocument ? 'Update Document' : 'Upload Document'}
            </h2>
            <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Type *
            </label>
            <select
              name="document_type"
              value={formData.document_type}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              {documentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document File *
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  PDF, JPG, PNG, DOC up to 10MB
                </p>
              </div>
            </div>
            {file && (
              <div className="mt-2 text-sm text-gray-600">
                Selected: {file.name}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Document title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Document description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document Number
              </label>
              <input
                type="text"
                name="document_number"
                value={formData.document_number}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="e.g., ID number, License number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issuing Authority
              </label>
              <input
                type="text"
                name="issuing_authority"
                value={formData.issuing_authority}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="e.g., KRA, NTSA"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue Date
              </label>
              <input
                type="date"
                name="issue_date"
                value={formData.issue_date}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                name="expiry_date"
                value={formData.expiry_date}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reminder Days Before Expiry
            </label>
            <input
              type="number"
              name="reminder_days_before"
              value={formData.reminder_days_before}
              onChange={handleInputChange}
              min="1"
              max="365"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : existingDocument ? 'Update' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentUpload;