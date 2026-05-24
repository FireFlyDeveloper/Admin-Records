# Inventory Management System – Full Revision & Backend Update Tasks

Implement the following revisions, fixes, UI enhancements, backend updates, and new features across the entire system. Ensure all features are fully functional, responsive, optimized, and consistent throughout the platform.

---

# 1. LOGIN PAGE

## Enhancements
- Add a Show/Hide Password button (eye icon) for password visibility toggle.

---

# 2. DASHBOARD PAGE

## Add View Pages / Modals
Create dedicated viewing pages or modal views for:

- Expired Items
- Expiring Soon Items
- Expiring This Month
- Safe/Valid Items
- Missing Items

These views must be clickable and allow users to inspect related items.

## UI / Terminology Changes
- Change display text:
  - “Active Checkout” → “Borrowed Items”

## Recent Activity
- Modify Recent Activity to display only recent specific and meaningful activities.

---

# 3. DOCUMENTS PAGE

## New Features
### Nested Folder Support
- Allow users to create folders inside existing folders.

### Multiple File Upload
- Add support for uploading multiple files at once.

---

# 4. INVENTORY PAGE

## Fixes
### Filter Issue
- Fix the Filter functionality where filtered data is not displaying.

## UI Changes
### Borrow History Naming
Change:

"Transaction History Checkout"

To:

"BORROWED #1"

Requirements:
- Replace unique IDs with a simple incremental numbering system.
- Example:
  - Borrowed #1
  - Borrowed #2
  - Borrowed #3

### Rename Display Labels
Change:

"SKU" → "Total Stocks"

## New Features

### View Button
- Implement a View button for inventory details.

### QR / Barcode Scanner Integration
I am using a physical QR/Barcode scanner device.

Requirements:
- Once a QR/Barcode is scanned:
  - Automatically add the item to the Request Cart.
- If the scanned input is inside the Search Bar:
  - Only perform search.
  - Do NOT automatically add to cart.

### Category Filter
- Add filter support for Category.

### Edit Lot
- Add ability to Edit Lot information.

---

# 5. REQUEST PAGE

## Request Tracking
- Add a trackable request system.

Example statuses:
- Pending
- Approved
- Borrowed
- Returned
- Rejected

## Quick Checkout Improvement
Current behavior:
- User manually selects LOT.

New behavior:
- Automatically select the most appropriate lot.

Only show:
- Quantity Input
- Checkout Button

Remove:
- Manual LOT selection

## Rename Display Labels
Change:

"SKU" → "Total Stocks"

## Display Changes
- Show Item Name instead of LOT.

---

# 6. REQUEST HISTORY PAGE

## Fixes
### Filter Issue
- Fix Filter functionality where filtered data does not display.

## Naming Changes
Replace unique IDs with:

- Request #1
- Request #2
- Request #3

Use simple incremental numbering.

## Borrow Information Display

### If Student Borrowed
Display:

- Time Requested
- Time Returned
- Requested By
- Email
- Item Borrowed
- SR-Code
- Program

### If Admin/Staff Borrowed
Display:

- Time Requested
- Time Returned
- Requested By
- Item Borrowed

## Return Button Improvement
If only one item is borrowed:

- Add a single-click “Return” button.

## Remove Feature
Remove:

- Select Specific Item dropdown menu

---

# 7. AUDIT LOGS PAGE

## Fixes
### Filter Issue
- Fix Filter functionality where filtered data is not displaying.

## Export Changes
Remove:

- CSV Export
- JSON Export

Replace with:

Download Report (Excel Format - .xlsx)

## UI Changes
Remove:

- Entity ID

Rename:

Timestamp → Date/Time

---

# 8. REPORTS PAGE

## Fixes
### Filter Issue
- Fix Filter functionality where filtered data is not displaying.

## Export Changes
Remove:

- CSV Export
- JSON Export

Replace with:

Download Report (Excel Format - .xlsx)

## Formatting Fixes
Fix Date format:

- Convert to Date/Time

## Table Changes
Rename:

Checkout → Requests

### Checkout Transactions
Replace unique IDs with:

- Request #1
- Request #2

Use incremental numbering.

---

# 9. USER MANAGEMENT PAGE

## Fixes
### Filter Issue
- Fix Filter functionality where filtered results are not displaying.

## New Features
### User Active Status Indicator
Add real-time user status indicator:

- 🟢 Green Dot = Online
- 🔴 Red Dot = Offline
- 🟠 Orange Dot = Inactive

### Show Password
When creating account:

- Add Show/Hide Password button.

## Account Creation Changes
Remove:

- Active / Inactive selection during account creation.

Default:
- Newly created users = Active

Only allow changing status:
- During Edit Account

## Search Improvements
Remove:

- Search button at the end.

Reason:
- Search bar should already support real-time search.

Fix:
- Search bar size and responsiveness.

---

# 10. SIDE NAVIGATION BAR

## Notification Improvements
Add:

- Dynamic notification badges
- Number counters

Display notification count for each navigation item where applicable.

Examples:
- Pending Requests
- Missing Items
- Expiring Items
- Alerts

Must update dynamically.

---

# 11. OVERALL SYSTEM IMPROVEMENTS

## UI / UX Consistency
Fix inconsistencies across the system:

### Filter Buttons
- Fix sizing inconsistency of all filter buttons.

### Search Bars
- Ensure proper alignment and consistent sizes.

### Tables
- Improve spacing and readability.

### Responsive Design
Ensure the system works properly on:

- Desktop
- Tablet
- Mobile

Maintain consistent spacing, sizing, typography, and layout.

---

# 12. BACKEND UPDATE REQUIREMENTS

Update the backend APIs, services, database logic, and business logic to fully support all frontend revisions and newly added features.

## API & Backend Updates

Update backend to support:

### Documents
- Nested folder creation.
- Multiple file uploads.

### Inventory
- Category filtering.
- Edit Lot functionality.
- QR/Barcode scanner auto-add to Request Cart.
- Search-only behavior when scanner is focused on Search Bar.
- View item details endpoint.

### Requests
- Request tracking/status system.
- Automatic lot selection for Quick Checkout.
- Borrow history numbering system.

### Dashboard
Create endpoints for:

- Expired Items
- Expiring Soon
- Expiring This Month
- Safe/Valid Items
- Missing Items

### Request History
Support dynamic response formatting based on role:

#### Student
Include:
- Email
- SR-Code
- Program

#### Admin/Staff
Exclude unnecessary student fields.

### User Management
Add:
- Online/Offline/Inactive user status tracking.

### Notifications
Create backend support for:

- Navigation notification counts
- Pending alerts
- Expiring inventory
- Missing items
- Pending requests

---

# 13. REPORT EXPORT SYSTEM

Remove old export logic:

- CSV
- JSON

Replace with:

### Excel Export (.xlsx)

Requirements:
- Proper Date/Time formatting
- Correct column naming
- Clean formatting
- Accurate report generation

Reports must reflect updated labels:

Examples:
- Checkout → Requests
- Timestamp → Date/Time

---

# 14. FILTERS & SEARCH FIXES

Fix all filtering and search issues across:

- Inventory
- Reports
- Audit Logs
- Request History
- User Management

Requirements:
- Filters must return accurate data.
- No blank results issue.
- Real-time search must function properly.
- Category filtering must work.
- Search and filter states must persist properly.

---

# 15. PERFORMANCE & VALIDATION

Ensure:

- No breaking of existing functionality.
- Proper validation for all forms and requests.
- Backend error handling.
- Optimized queries and endpoints.
- Clean API response structure.
- Proper loading and error states.

---

# 16. TESTING REQUIREMENTS

Before finalizing:

Fully test:

### CRUD Operations
- Create
- Read
- Update
- Delete

### Scanner Flow
- QR scanning
- Barcode scanning
- Auto request cart insertion
- Search-only mode

### Filters
- Inventory filters
- Reports filters
- Audit filters
- Request filters

### Exports
- Excel generation
- Date formatting
- Correct report structure

### Request Flow
- Checkout
- Return
- Status updates
- Tracking

### Notifications
- Real-time counters
- Dynamic updates

---

# FINAL REQUIREMENT

Ensure frontend and backend are fully synchronized.

All revisions must be:
- Fully functional
- Production-ready
- Responsive
- Optimized
- Consistent in UI/UX
- Bug-free

Do not break existing features while implementing these revisions.