import { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Filter, BarChart3, TrendingUp, DollarSign, Truck, Fuel, Users, AlertCircle } from 'lucide-react';
import axios from 'axios';

function Reports() {
  const [reports, setReports] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [dateRange, setDateRange] = useState('30');
  const [error, setError] = useState('');

  useEffect(() => {
    loadReports();
    loadStatistics();
  }, []);

  async function loadReports() {
    try {
      setLoading(true);
      const response = await axios.get('/api/reports/reports/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      const reportsData = response.data.results || response.data;
      setReports(Array.isArray(reportsData) ? reportsData : []);
    } catch (error) {
      console.error('Error loading reports:', error);
      setError('Failed to load reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadStatistics() {
    try {
      const response = await axios.get('/api/reports/reports/statistics/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      setStatistics(response.data);
    } catch (error) {
      console.error('Error loading statistics:', error);
      // Set default statistics if API fails
      setStatistics({
        total_reports: 0,
        ready_reports: 0,
        pending_reports: 0,
        generating_reports: 0,
        failed_reports: 0,
        generated_today: 0,
        downloads_week: 0,
        active_schedules: 0,
        reports_by_type: {}
      });
    }
  }

  async function generateReport(reportId) {
    try {
      await axios.post(`/api/reports/reports/${reportId}/generate/`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      loadReports();
      loadStatistics();
    } catch (error) {
      console.error('Error generating report:', error);
      setError('Failed to generate report');
    }
  }

  async function downloadReport(reportId) {
    try {
      const response = await axios.get(`/api/reports/reports/${reportId}/download/`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      
      // Handle file download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `report_${reportId}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      // Refresh statistics after download
      loadStatistics();
    } catch (error) {
      console.error('Error downloading report:', error);
      setError('Failed to download report');
    }
  }

  async function createReport(reportType) {
    try {
      const reportData = {
        report_type: reportType,
        name: `${reportType.replace('_', ' ').title()} Report`,
        description: `Automatically generated ${reportType.replace('_', ' ')} report`,
        start_date: new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        file_format: 'csv'
      };

      const response = await axios.post('/api/reports/reports/', reportData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      
      setReports([...reports, response.data]);
      // Automatically generate the report
      await generateReport(response.data.id);
    } catch (error) {
      console.error('Error creating report:', error);
      setError('Failed to create report');
    }
  }

  const reportCategories = [
    { 
      name: 'Document Reports', 
      icon: FileText,
      reports: [
        { type: 'document_compliance', label: 'Document Compliance', description: 'Overview of all documents and their status' },
        { type: 'expiry_tracking', label: 'Expiry Tracking', description: 'Track documents approaching expiry' },
        { type: 'verification_status', label: 'Verification Status', description: 'Documents pending verification' }
      ]
    },
    { 
      name: 'Operational Reports', 
      icon: Truck,
      reports: [
        { type: 'fleet_utilization', label: 'Fleet Utilization', description: 'Vehicle usage and availability' },
        { type: 'driver_performance', label: 'Driver Performance', description: 'Driver metrics and performance' }
      ]
    },
    { 
      name: 'Financial Reports', 
      icon: DollarSign,
      reports: [
        { type: 'revenue_summary', label: 'Revenue Summary', description: 'Revenue and financial overview' },
        { type: 'cost_analysis', label: 'Cost Analysis', description: 'Operational costs breakdown' },
        { type: 'fuel_consumption', label: 'Fuel Consumption', description: 'Fuel usage and efficiency' }
      ]
    },
  ];

  const getReportIcon = (reportType) => {
    const iconMap = {
      'document_compliance': FileText,
      'expiry_tracking': Calendar,
      'verification_status': AlertCircle,
      'fleet_utilization': Truck,
      'driver_performance': Users,
      'revenue_summary': DollarSign,
      'cost_analysis': BarChart3,
      'fuel_consumption': Fuel,
    };
    return iconMap[reportType] || FileText;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Reports & Analytics</h1>
          <p className="text-sm text-gray-500">Generate and download comprehensive reports with real data</p>
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

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a]"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Statistics Cards */}
          {statistics && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="text-[#1e3a8a]" size={20} />
                    <span className="text-sm text-gray-600">Total Reports</span>
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">{statistics.total_reports}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="text-[#1e3a8a]" size={20} />
                    <span className="text-sm text-gray-600">Generated Today</span>
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">{statistics.generated_today}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Download className="text-[#1e3a8a]" size={20} />
                    <span className="text-sm text-gray-600">Downloads This Week</span>
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">{statistics.downloads_week}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="text-[#1e3a8a]" size={20} />
                    <span className="text-sm text-gray-600">Active Schedules</span>
                  </div>
                  <div className="text-2xl font-semibold text-gray-900">{statistics.active_schedules}</div>
                </div>
              </div>
            </div>
          )}

          {/* Report Categories */}
          {reportCategories.map((category) => (
            <div key={category.name}>
              <h2 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
                <category.icon size={20} className="text-[#1e3a8a]" />
                {category.name}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.reports.map((reportTemplate) => {
                  const existingReport = reports.find(r => r.report_type === reportTemplate.type);
                  const Icon = getReportIcon(reportTemplate.type);
                  
                  return (
                    <div
                      key={reportTemplate.type}
                      className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-[#1e3a8a]/10 flex items-center justify-center">
                          <Icon size={20} className="text-[#1e3a8a]" />
                        </div>
                        {existingReport && (
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            existingReport.status === 'ready' 
                              ? 'bg-green-100 text-green-700' 
                              : existingReport.status === 'generating'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {existingReport.status}
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900 mb-1">{reportTemplate.label}</h3>
                      <p className="text-xs text-gray-500 mb-3">{reportTemplate.description}</p>
                      
                      {existingReport ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => generateReport(existingReport.id)}
                            disabled={existingReport.status === 'generating'}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#1e3a8a] text-white rounded-lg text-sm hover:bg-[#1e40af] transition-colors disabled:opacity-50"
                          >
                            <FileText size={14} /> {existingReport.status === 'generating' ? 'Generating...' : 'Regenerate'}
                          </button>
                          {existingReport.status === 'ready' && (
                            <button
                              onClick={() => downloadReport(existingReport.id)}
                              className="flex items-center justify-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                            >
                              <Download size={14} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => createReport(reportTemplate.type)}
                          className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-[#1e3a8a] text-white rounded-lg text-sm hover:bg-[#1e40af] transition-colors"
                        >
                          <FileText size={14} /> Create Report
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Existing Reports List */}
          {reports.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Reports</h2>
              <div className="space-y-3">
                {reports.slice(0, 5).map((report) => {
                  const Icon = getReportIcon(report.report_type);
                  return (
                    <div key={report.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#1e3a8a]/10 flex items-center justify-center">
                          <Icon size={16} className="text-[#1e3a8a]" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{report.name}</p>
                          <p className="text-xs text-gray-500">
                            {report.generated_at ? new Date(report.generated_at).toLocaleDateString() : 'Not generated'} • 
                            {report.row_count} rows
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          report.status === 'ready' 
                            ? 'bg-green-100 text-green-700' 
                            : report.status === 'generating'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {report.status}
                        </span>
                        {report.status === 'ready' && (
                          <button
                            onClick={() => downloadReport(report.id)}
                            className="flex items-center justify-center gap-1 px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                          >
                            <Download size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Reports;