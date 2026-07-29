# Document Upload Guide

## How to Add Documents

### Method 1: Through the Web Interface

1. **Navigate to Documents Page**
   - Click on "Documents" in the sidebar
   - Select the entity type: Users, Vehicles, or Organizations

2. **Select an Entity**
   - For Users: Click on a user card (shows username and role)
   - For Vehicles: Click on a vehicle card (shows plate number and make/model)
   - For Organizations: Click on an organization card (shows name and plan)

3. **Upload Document**
   - Click the "Upload Document" button
   - Fill in the document details:
     - **Document Type**: Select from dropdown (National ID, KRA PIN, Insurance, etc.)
     - **Title**: Give your document a descriptive name
     - **Description**: Optional description
     - **Document Number**: ID number, license number, etc.
     - **Issuing Authority**: KRA, NTSA, insurance company, etc.
     - **Issue Date**: When the document was issued
     - **Expiry Date**: When the document expires (required for most documents)
     - **Reminder Days**: Days before expiry to send alerts (default: 30)
   - Upload the file (PDF, JPG, PNG, DOC, DOCX - max 10MB)
   - Click "Upload"

### Method 2: Through Django Admin

1. **Access Admin Panel**
   - Go to `http://localhost:8000/admin/`
   - Login with your admin credentials

2. **Navigate to Documents**
   - Find "Documents" section
   - Click on "Documents"

3. **Add New Document**
   - Click "Add Document" button
   - Fill in all required fields
   - Upload file
   - Save

### Required Documents by Role

#### Drivers (Required):
- National ID
- KRA PIN  
- KRA Certificate
- Driving License
- Profile Photo
- Certificate of Good Conduct
- Medical Certificate

#### Vehicles (Required):
- Insurance
- Registration
- Number Plate
- Inspection Certificate
- Road Worthiness Certificate

### Document Status Tracking

The system automatically tracks document status:
- **Valid**: Current and verified
- **Expiring Soon**: Within 30 days of expiry
- **Expired**: Past expiry date
- **Pending**: Awaiting verification
- **Rejected**: Failed verification

### Data Fetching

The document system now fetches real data from your database:
- **Users**: All users in the system (based on permissions)
- **Vehicles**: All vehicles in the system (based on permissions)
- **Organizations**: All organizations in the system (based on permissions)

### Tips for Document Upload

1. **File Format**: Use PDF for official documents, JPG/PNG for photos
2. **File Size**: Keep files under 10MB for faster uploads
3. **Expiry Dates**: Always set accurate expiry dates for automatic tracking
4. **Document Numbers**: Include ID/license numbers for easy reference
5. **Backup**: Keep copies of important documents locally

### Troubleshooting

**Upload Fails:**
- Check file size (must be under 10MB)
- Verify file format (PDF, JPG, PNG, DOC, DOCX only)
- Ensure all required fields are filled

**Document Not Showing:**
- Refresh the page
- Check document status filters
- Verify you're looking at the correct entity

**Expiry Alerts Not Working:**
- Ensure expiry date is set correctly
- Check reminder days setting
- Verify notification system is running

**No Users/Vehicles/Organizations Found:**
- Check that data exists in your database
- Verify your user permissions
- Ensure you're logged in with appropriate role