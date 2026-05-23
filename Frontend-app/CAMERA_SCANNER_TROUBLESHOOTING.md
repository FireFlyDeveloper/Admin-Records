# Camera Scanner Troubleshooting Guide

## Issue Description
The Hermes modal opens the inventory scanner but the camera is not working.

## Quick Test
1. Navigate to http://localhost:5173/test/scanner
2. Click "Open Scanner"
3. Check browser console for errors (F12 → Console tab)

## Common Issues & Solutions

### 1. Camera Permissions
**Symptoms**: No camera permission prompt appears, or permission was previously denied.

**Solutions**:
- Check browser URL bar for camera permission icon (camera with slash)
- Click the icon and "Allow" camera access
- Clear site data and try again
- Visit `chrome://settings/content/camera` (Chrome) to manage permissions

### 2. Browser Compatibility
**Symptoms**: Works in some browsers but not others.

**Browser Requirements**:
- Chrome 63+ ✓ (Recommended)
- Firefox 52+ ✓
- Safari 11+ ✓ (iOS 15.1+ required for Chrome/Firefox on iOS)
- Edge 79+ ✓

**Test**: Try different browsers to isolate the issue.

### 3. HTTPS Requirement
**Symptoms**: Works on localhost but not on production.

**Requirements**:
- Localhost: Works with HTTP
- Production: Requires HTTPS for camera access

**Solution**: Ensure production site uses HTTPS.

### 4. Multiple Camera Issues
**Symptoms**: Wrong camera selected, or no camera found.

**Debug Steps**:
1. Check if you have multiple cameras (laptop + external webcam)
2. The scanner should remember last used camera
3. Try unplugging/replugging USB cameras

### 5. DOM/Cleanup Issues
**Symptoms**: "Node.removeChild" errors in console, scanner works once then fails.

**Solution**: The updated scanner component now includes:
- Better cleanup sequence
- Unique container IDs
- DOM node removal safety checks

### 6. Camera Already in Use
**Symptoms**: "Camera is already in use" error.

**Solutions**:
- Close other apps using camera (Zoom, Teams, etc.)
- Restart browser
- Restart computer if needed

## Debugging Steps

### 1. Check Browser Console (F12)
Look for these error types:

```javascript
// Permission denied
NotAllowedError: Permission denied

// No camera found
NotFoundError: No camera found

// Camera in use
NotReadableError: Could not start video source

// Constraint issues
OverconstrainedError: Constraints could not be satisfied
```

### 2. Test Minimal Example
Open `/home/kim-eduard-saludes/Documents/Erica/Frontend-app/scanner-test.html` directly in browser:
1. Right-click file → "Open with" → Browser
2. Click "Start Scanner"
3. This tests html5-qrcode without React

### 3. Check Camera Access Directly
Open browser console and run:
```javascript
// Test if getUserMedia works
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => console.log('Camera OK:', stream))
  .catch(error => console.error('Camera error:', error.name, error.message));
```

## Enhanced Scanner Features

The updated `CameraBarcodeScanner` component now includes:

### 1. Better Error Messages
- Specific error messages for each camera error type
- User-friendly explanations
- Retry button

### 2. Debug Panel
- Shows initialization steps
- Tracks cleanup process
- Helps identify timing issues

### 3. Improved Cleanup
- Prevents "Node.removeChild" errors
- Ensures proper camera release
- Handles rapid open/close cycles

### 4. Retry Mechanism
- One-click retry for camera errors
- Resets state properly
- Useful for permission changes

## Alternative Solutions

If html5-qrcode continues to have issues:

### Option 1: Try Different Scanner Library
```bash
npm install @yudiel/react-qr-scanner
```

### Option 2: Native Browser QR API (Chrome/Edge only)
Modern browsers have built-in QR scanning:
```javascript
// Experimental API
const barcodeDetector = new BarcodeDetector();
```

### Option 3: Mobile App Integration
For production, consider:
- Cordova/PhoneGap plugins for mobile
- React Native with native camera
- Progressive Web App (PWA) with camera API

## Testing Checklist

- [ ] Test on http://localhost:5173/test/scanner
- [ ] Check browser console for errors
- [ ] Verify camera permission is granted
- [ ] Try different browser (Chrome recommended)
- [ ] Test with standalone scanner-test.html
- [ ] Check if other apps are using camera
- [ ] Restart browser if issues persist
- [ ] Check camera hardware is working (e.g., Photo Booth)

## Next Steps

1. **If scanner works in test page but not in inventory**: Check modal timing issues
2. **If scanner never works**: Check browser compatibility and camera hardware
3. **If scanner works once then fails**: DOM cleanup issue (should be fixed)
4. **If permission errors**: Clear site data and retry

## Support

For persistent issues:
1. Share browser console screenshots
2. Specify browser version and OS
3. Describe exact steps to reproduce
4. Test with scanner-test.html to isolate React issues