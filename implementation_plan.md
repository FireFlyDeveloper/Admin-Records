# Inventory Management System - Implementation Plan
## Status: IN PROGRESS

## 1. LOGIN PAGE ✓ COMPLETE
- [x] Show/Hide Password button - ALREADY IMPLEMENTED

## 2. DASHBOARD PAGE ✓ COMPLETE
- [x] View Pages/Modals for:
  - [x] Expired Items - ALREADY IMPLEMENTED (ItemStatusModal)
  - [x] Expiring Soon Items - ALREADY IMPLEMENTED (ItemStatusModal)
  - [x] Expiring This Month - ALREADY IMPLEMENTED (ItemStatusModal)
  - [x] Safe/Valid Items - ALREADY IMPLEMENTED (ItemStatusModal)
  - [x] Missing Items - ALREADY IMPLEMENTED (ItemStatusModal)
- [x] UI/Terminology Changes:
  - [x] "Active Checkout" → "Borrowed Items" - ALREADY IMPLEMENTED (line 135 DashboardPage.tsx)
- [x] Recent Activity - ALREADY IMPLEMENTED

## 3. DOCUMENTS PAGE ⚠️ PARTIAL
- [x] Nested Folder Support - ALREADY IMPLEMENTED (parent_id in folder creation)
- [ ] Multiple File Upload - NEEDS IMPLEMENTATION

## 4. INVENTORY PAGE 🔄 IN PROGRESS
- [ ] Fix Filter functionality
- [ ] UI Changes:
  - [ ] "SKU" → "Total Stocks" - NEEDS IMPLEMENTATION
  - [ ] "Transaction History Checkout" → "BORROWED #1, #2, #3" - NEEDS IMPLEMENTATION
- [ ] New Features:
  - [ ] View button for inventory details
  - [ ] QR/Barcode Scanner Integration
    - [ ] Auto-add to Request Cart when scanned
    - [ ] Search-only when focused in Search Bar
  - [ ] Category Filter
  - [ ] Edit Lot functionality

## 5. REQUEST PAGE 🔄 IN PROGRESS
- [ ] Request Tracking System (Pending, Approved, Borrowed, Returned, Rejected)
- [ ] Quick Checkout Improvement:
  - [ ] Automatically select most appropriate lot
  - [ ] Only show Quantity Input + Checkout Button
  - [ ] Remove manual LOT selection
- [ ] Rename "SKU" → "Total Stocks"
- [ ] Show Item Name instead of LOT

## 6. REQUEST HISTORY PAGE ⏳ PENDING
- [ ] Fix Filter functionality
- [ ] Naming Changes: Replace unique IDs with "Request #1, #2, #3"
- [ ] Borrow Information Display:
  - [ ] If Student Borrowed: Time Requested, Time Returned, Requested By, Email, Item Borrowed, SR-Code, Program
  - [ ] If Admin/Staff Borrowed: Time Requested, Time Returned, Requested By, Item Borrowed
- [ ] Return Button Improvement:
  - [ ] Single-click "Return" button for single items
- [ ] Remove "Select Specific Item" dropdown

## 7. AUDIT LOGS PAGE ⏳ PENDING
- [ ] Fix Filter functionality
- [ ] Export Changes:
  - [ ] Remove CSV Export
  - [ ] Remove JSON Export
  - [ ] Add Download Report (Excel .xlsx)
- [ ] UI Changes:
  - [ ] Remove "Entity ID"
  - [ ] Rename "Timestamp" → "Date/Time"

## 8. REPORTS PAGE ⏳ PENDING
- [ ] Fix Filter functionality
- [ ] Export Changes:
  - [ ] Remove CSV Export
  - [ ] Remove JSON Export
  - [ ] Add Download Report (Excel .xlsx)
- [ ] Formatting Fixes:
  - [ ] Fix Date format to Date/Time
- [ ] Table Changes:
  - [ ] Rename "Checkout" → "Requests"
  - [ ] Replace unique IDs with "Request #1, #2"

## 9. USER MANAGEMENT PAGE ⏳ PENDING
- [ ] Fix Filter functionality
- [ ] New Features:
  - [ ] User Active Status Indicator (🟢 Green = Online, 🔴 Red = Offline, 🟠 Orange = Inactive)
  - [ ] Show/Hide Password button during account creation
- [ ] Account Creation Changes:
  - [ ] Remove Active/Inactive selection during creation
  - [ ] Default new users = Active
  - [ ] Only allow status change during Edit Account
- [ ] Search Improvements:
  - [ ] Remove Search button at end
  - [ ] Fix search bar size and responsiveness
  - [ ] Real-time search support

## 10. SIDE NAVIGATION BAR ⏳ PENDING
- [ ] Notification Improvements:
  - [ ] Dynamic notification badges
  - [ ] Number counters for:
    - [ ] Pending Requests
    - [ ] Missing Items
    - [ ] Expiring Items
    - [ ] Alerts
  - [ ] Dynamic updates

## 11. OVERALL SYSTEM IMPROVEMENTS ⏳ PENDING
- [ ] UI/UX Consistency:
  - [ ] Fix Filter button sizing inconsistency
  - [ ] Fix Search bar alignment and sizes
  - [ ] Improve table spacing and readability
- [ ] Responsive Design:
  - [ ] Desktop optimization
  - [ ] Tablet optimization
  - [ ] Mobile optimization

## 12. BACKEND UPDATES ⏳ PENDING
- [ ] Documents:
  - [x] Nested folder creation - ALREADY SUPPORTED
  - [ ] Multiple file uploads
- [ ] Inventory:
  - [ ] Category filtering
  - [ ] Edit Lot functionality
  - [ ] QR/Barcode scanner auto-add to Request Cart
  - [ ] Search-only behavior when scanner focused on Search Bar
  - [ ] View item details endpoint
- [ ] Requests:
  - [ ] Request tracking/status system
  - [ ] Automatic lot selection for Quick Checkout
  - [ ] Borrow history numbering system
- [ ] Dashboard:
  - [x] Endpoints for item status views - ALREADY IMPLEMENTED (via existing filters)
- [ ] Request History:
  - [ ] Dynamic response formatting based on role
- [ ] User Management:
  - [ ] Online/Offline/Inactive user status tracking
- [ ] Notifications:
  - [ ] Navigation notification counts
  - [ ] Pending alerts
  - [ ] Expiring inventory
  - [ ] Missing items
  - [ ] Pending requests

## 13. REPORT EXPORT SYSTEM ⏳ PENDING
- [ ] Remove CSV export logic
- [ ] Remove JSON export logic
- [ ] Add Excel Export (.xlsx):
  - [ ] Proper Date/Time formatting
  - [ ] Correct column naming
  - [ ] Clean formatting
  - [ ] Accurate report generation

## 14. FILTERS & SEARCH FIXES ⏳ PENDING
- [ ] Fix all filtering and search issues across:
  - [ ] Inventory
  - [ ] Reports
  - [ ] Audit Logs
  - [ ] Request History
  - [ ] User Management

## 15. PERFORMANCE & VALIDATION ⏳ PENDING
- [ ] Ensure no breaking of existing functionality
- [ ] Proper validation for all forms and requests
- [ ] Backend error handling
- [ ] Optimized queries and endpoints
- [ ] Clean API response structure
- [ ] Proper loading and error states

## 16. TESTING REQUIREMENTS ⏳ PENDING
- [ ] CRUD Operations
- [ ] Scanner Flow
- [ ] Filters
- [ ] Exports
- [ ] Request Flow
- [ ] Notifications

## PRIORITY ORDER:
1. Fix Filter issues (critical bug)
2. Implement missing features with existing backend support
3. Add backend endpoints for new features
4. UI/UX improvements
5. Testing and validation