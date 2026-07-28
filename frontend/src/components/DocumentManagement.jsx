import { useState, useEffect } from 'react';
import { Plus, X, Search, Filter, MoreVertical, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge';

function AddDocumentModal({ onClose, onCreated, vehicles }) {
  const [form, setForm] = useState({ 
    vehicle: '', document_type: 'registration', title: '', 
    document_number: '', issue_date: '', expiry_date: '' 
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await client.post("/fleet/documents/", form);
      onCreated();
    } catch {
      setError("Couldn't add that document — please check the form data.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg text-ink">Add document</h2>
          <button onClick={onClose} className="text-ink-700/50 hover:text-ink"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="text-sm text-rust bg-rust-light rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Vehicle</label>
            <select required value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm">
              <option value="">Select vehicle</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.plate_number}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Document type</label>
            <select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm">
              <option value="registration">Registration</option>
              <option value="insurance">Insurance</option>
              <option value="inspection">Inspection</option>
              <option value="permit">Permit</option>
              <option value="maintenance">Maintenance Record</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Title</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Document number</label>
            <input value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Issue date</label>
              <input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">Expiry date</label>
              <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" disabled={busy}
            className="w-full bg-ink text-white rounded-lg py-2.5 text-sm font-medium hover:bg-ink-700 transition-colors disabled:opacity-50">
            {busy ? "Adding…" : "Add document"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function DocumentManagement() {
  const [documents, setDocuments] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('all');

  async function load() {
    try {
      const [docsRes, vehiclesRes] = await Promise.all([
        client.get("/fleet/documents/").catch(() => ({ data: [] })),
        client.get("/fleet/vehicles/").catch(() => ({ data: [] })),
      ]);

      setDocuments(docsRes.data.results ?? docsRes.data);
      setVehicles(vehiclesRes.data.results ?? vehiclesRes.data);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  }

  useEffect(() => {
    load();
    // Refresh data every 60 seconds
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  const filteredDocuments = filter === 'all' 
    ? documents 
    : documents.filter(d => d.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-navy mb-1">Document Management</h2>
          <p className="text-sm text-gray-500">Track vehicle registrations, insurance, and permits</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-ink text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-ink-700 transition-colors">
          <Plus size={16} /> Add document
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilter('all')}
          className={`text-sm font-medium px-3 py-1.5 rounded-full ${filter === 'all' ? "bg-[#1e3a8a] text-white" : "bg-gray-100 text-gray-700"}`}>
          All ({documents.length})
        </button>
        <button onClick={() => setFilter('valid')}
          className={`text-sm font-medium px-3 py-1.5 rounded-full ${filter === 'valid' ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700"}`}>
          Valid
        </button>
        <button onClick={() => setFilter('expiring_soon')}
          className={`text-sm font-medium px-3 py-1.5 rounded-full ${filter === 'expiring_soon' ? "bg-yellow-600 text-white" : "bg-gray-100 text-gray-700"}`}>
          Expiring Soon
        </button>
        <button onClick={() => setFilter('expired')}
          className={`text-sm font-medium px-3 py-1.5 rounded-full ${filter === 'expired' ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700"}`}>
          Expired
        </button>
      </div>

      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-gray-400" />
            <input 
              type="text" 
              placeholder="Search documents..." 
              className="text-sm border-0 focus:ring-0 px-0 w-64"
            />
          </div>
          <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <Filter size={16} /> Filter
          </button>
        </div>
        
        {filteredDocuments.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-500">No documents found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="px-5 py-3 font-medium">Vehicle</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Document Number</th>
                <th className="px-5 py-3 font-medium">Issue Date</th>
                <th className="px-5 py-3 font-medium">Expiry Date</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((doc) => (
                <tr key={doc.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-700">{doc.vehicle_plate}</td>
                  <td className="px-5 py-3 text-gray-700 capitalize">{doc.document_type?.replace('_', ' ')}</td>
                  <td className="px-5 py-3 text-gray-700 flex items-center gap-2">
                    <FileText size={16} className="text-gray-400" />
                    {doc.title}
                  </td>
                  <td className="px-5 py-3 text-gray-700 font-mono text-xs">{doc.document_number || "—"}</td>
                  <td className="px-5 py-3 text-gray-700">{doc.issue_date || "—"}</td>
                  <td className="px-5 py-3 text-gray-700">{doc.expiry_date || "—"}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-5 py-3">
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <MoreVertical size={16} className="text-gray-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && <AddDocumentModal onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); load(); }} vehicles={vehicles} />}
    </div>
  );
}