import { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Filter, BarChart3, TrendingUp, DollarSign, Truck, Fuel, Users } from 'lucide-react';
import client from '../api/client';

function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      setLoading(true);
      const response = await client.get('/reports/reports/').catch(() => ({ data: [] }));
      const reportsData = response.data.results ?? response.data;
      setReports(reportsData);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  }

  async function generateReport(reportId) {
    try {
      await client.post(`/reports/reports/${reportId}/generate/`);
      loadReports();
    } catch (error) {
      console.error('Error generating report:', error);
    }
  }

  async function downloadReport(reportId) {
    try {
      const response = await client.get(`/reports/reports/${reportId}/download/`, { responseType: 'blob' });
      // Handle file download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `report_${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  }

  const reportCategories = [
    { name: 'Operational', reports: ['trips', 'fleet', 'drivers'] },
    { name: 'Financial', reports: ['revenue', 'costs', 'fuel'] },
    { name: 'Performance', reports: ['drivers', 'fleet', 'trips'] },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Reports & Analytics</h1>
          <p className="text-sm text-gray-500">Generate and download comprehensive reports</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <button className="flex items-center gap-2 bg-[#1e3a8a] text-white px-4 py-2 rounded-lg hover:bg-[#1e40af] transition-colors">
            <Filter size={16} /> Advanced Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a]"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {reportCategories.map((category) => (
            <div key={category.name}>
              <h2 className="text-lg font-medium text-gray-900 mb-3">{category.name} Reports</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports
                  .filter(report => category.reports.includes(report.type))
                  .map((report) => {
                    const Icon = report.icon;
                    return (
                      <div
                        key={report.id}
                        className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-lg bg-[#1e3a8a]/10 flex items-center justify-center">
                            <Icon size={20} className="text-[#1e3a8a]" />
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            report.status === 'ready' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {report.status}
                          </span>
                        </div>
                        <h3 className="font-medium text-gray-900 mb-1">{report.name}</h3>
                        <p className="text-xs text-gray-500 mb-3">
                          Last generated: {new Date(report.lastGenerated).toLocaleDateString()}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => generateReport(report.id)}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#1e3a8a] text-white rounded-lg text-sm hover:bg-[#1e40af] transition-colors"
                          >
                            <FileText size={14} /> Generate
                          </button>
                          <button
                            onClick={() => downloadReport(report.id)}
                            className="flex items-center justify-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="text-[#1e3a8a]" size={20} />
                  <span className="text-sm text-gray-600">Total Reports</span>
                </div>
                <div className="text-2xl font-semibold text-gray-900">{reports.length}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="text-[#1e3a8a]" size={20} />
                  <span className="text-sm text-gray-600">Generated Today</span>
                </div>
                <div className="text-2xl font-semibold text-gray-900">3</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="text-[#1e3a8a]" size={20} />
                  <span className="text-sm text-gray-600">Downloads This Week</span>
                </div>
                <div className="text-2xl font-semibold text-gray-900">12</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="text-[#1e3a8a]" size={20} />
                  <span className="text-sm text-gray-600">Active Schedules</span>
                </div>
                <div className="text-2xl font-semibold text-gray-900">5</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;