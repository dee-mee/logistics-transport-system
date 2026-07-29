# Reports System Guide

## How to Generate and Download Reports with Real Data

### Overview
The reports system now generates reports with **real data** from your database instead of dummy data. Reports are generated as CSV files containing actual information from your logistics system.

### Available Report Types

#### Document Reports
1. **Document Compliance Report**
   - Shows all documents and their current status
   - Includes document type, status, entity type, and expiry dates
   - Data source: Document model

2. **Expiry Tracking Report**
   - Lists documents approaching or past expiry
   - Includes document type, entity, expiry date, and status
   - Data source: Document model with expiry filtering

3. **Verification Status Report**
   - Shows documents pending verification
   - Includes document type, entity, creation date
   - Data source: Document model with status='pending'

#### Operational Reports
1. **Fleet Utilization Report**
   - Vehicle usage and availability
   - Includes plate number, type, status, odometer
   - Data source: Vehicle model

2. **Driver Performance Report**
   - Driver metrics and performance data
   - Includes driver name, license, trips, distance, safety score
   - Data source: Driver model

#### Financial Reports
1. **Revenue Summary Report**
   - Revenue and financial overview
   - (Coming soon - requires orders/financial data)

2. **Cost Analysis Report**
   - Operational costs breakdown
   - (Coming soon - requires cost tracking data)

3. **Fuel Consumption Report**
   - Fuel usage and efficiency metrics
   - (Coming soon - requires fuel data integration)

### How to Generate Reports

#### Method 1: Through Web Interface
1. Navigate to **Reports** page in the sidebar
2. Select date range (7 days, 30 days, 90 days, 1 year)
3. Choose a report category:
   - Document Reports
   - Operational Reports
   - Financial Reports
4. Click **"Create Report"** on a report type
5. The system will automatically:
   - Create the report entry
   - Generate data from your database
   - Create a CSV file
   - Mark the report as "Ready"
6. Click **Download** button to get the CSV file

#### Method 2: Through API
```bash
# Create a new report
curl -X POST http://localhost:8000/api/reports/reports/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "document_compliance",
    "name": "Document Compliance Report",
    "description": "Monthly document compliance overview",
    "start_date": "2026-06-29",
    "end_date": "2026-07-29",
    "file_format": "csv"
  }'

# Generate the report
curl -X POST http://localhost:8000/api/reports/reports/{REPORT_ID}/generate/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# Download the report
curl -X GET http://localhost:8000/api/reports/reports/{REPORT_ID}/download/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output report.csv
```

### Report Data Structure

#### Document Compliance Report CSV Format
```csv
Document Type,Status,Entity Type,Expiry Date,Report Generated
national_id,valid,user,N/A,2026-07-29
driving_license,expiring_soon,user,2026-08-15,2026-07-29
insurance,expired,vehicle,2026-07-01,2026-07-29
```

#### Expiry Tracking Report CSV Format
```csv
Document Type,Entity Type,Entity ID,Expiry Date,Status,Report Generated
driving_license,user,uuid-here,2026-08-15,expiring_soon,2026-07-29
insurance,vehicle,uuid-here,2026-07-01,expired,2026-07-29
```

#### Fleet Utilization Report CSV Format
```csv
Plate Number,Vehicle Type,Status,Current Odometer,Report Generated
KAA123B,truck,available,15000,2026-07-29
KCD456C,van,on_trip,8500,2026-07-29
```

#### Driver Performance Report CSV Format
```csv
Driver Name,License Number,Status,Total Trips,Total Distance (km),Safety Score,On-Time Performance (%),Report Generated
John Doe,DL12345,available,45,1250,8.5,92.5,2026-07-29
Jane Smith,DL67890,on_trip,78,2100,9.2,95.0,2026-07-29
```

### Tips for Using Reports

1. **Date Range Selection**
   - Use appropriate date ranges for meaningful data
   - For compliance reports, use 30-90 days
   - For performance reports, use 7-30 days

2. **Data Availability**
   - Reports only show data that exists in your system
   - Ensure documents are uploaded for document reports
   - Ensure vehicles/drivers are added for operational reports

3. **Report Scheduling**
   - You can schedule recurring reports (feature coming soon)
   - Set up automatic email delivery for regular reports

4. **Data Export**
   - All reports export as CSV files
   - Can be opened in Excel, Google Sheets, or any spreadsheet application
   - Data can be further analyzed or shared

### Troubleshooting

**Report Shows No Data:**
- Verify you have data in the relevant models
- Check date range includes your data
- Ensure documents/vehicles are properly uploaded

**Report Generation Fails:**
- Check database connections
- Verify report type is implemented
- Check Django logs for errors

**Download Fails:**
- Ensure report status is "Ready"
- Check file was generated successfully
- Verify user has download permissions

### Admin Panel Access

You can also manage reports through Django Admin:
1. Go to `http://localhost:8000/admin/`
2. Navigate to "Reports" section
3. Create, generate, and manage reports directly

### Future Enhancements

The following features are planned for future releases:
- PDF report generation
- Custom report builders
- Advanced filtering options
- Scheduled automatic reports
- Email delivery of reports
- Dashboard integration with charts
- Real-time report generation