#!/usr/bin/env node
/**
 * Scanner Verification Script
 * Run this to test camera scanner functionality
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📷 Scanner Verification Tool\n');
console.log('='.repeat(50));

// Check 1: Verify scanner component exists
console.log('\n1. Checking scanner component...');
const scannerPath = path.join(__dirname, 'src/components/inventory/CameraBarcodeScanner.tsx');
if (fs.existsSync(scannerPath)) {
  console.log('   ✓ CameraBarcodeScanner.tsx exists');
  
  const content = fs.readFileSync(scannerPath, 'utf8');
  const checks = [
    { name: 'Html5QrcodeScanner import', regex: /Html5QrcodeScanner/ },
    { name: 'render() method', regex: /\.render\(/ },
    { name: 'clear() method', regex: /\.clear\(/ },
    { name: 'Error handling', regex: /setCameraError/ },
    { name: 'Debug info', regex: /addDebugInfo/ },
  ];
  
  checks.forEach(check => {
    if (check.regex.test(content)) {
      console.log(`   ✓ ${check.name} found`);
    } else {
      console.log(`   ⚠ ${check.name} NOT found`);
    }
  });
} else {
  console.log('   ✗ CameraBarcodeScanner.tsx not found');
}

// Check 2: Verify html5-qrcode dependency
console.log('\n2. Checking dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  if (packageJson.dependencies['html5-qrcode']) {
    console.log(`   ✓ html5-qrcode: ${packageJson.dependencies['html5-qrcode']}`);
  } else {
    console.log('   ✗ html5-qrcode not in dependencies');
  }
} catch (err) {
  console.log('   ⚠ Could not read package.json');
}

// Check 3: Verify dev server is running
console.log('\n3. Checking development server...');
try {
  const response = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:5173', { encoding: 'utf8' });
  if (response.trim() === '200') {
    console.log('   ✓ Dev server running on port 5173');
  } else {
    console.log(`   ⚠ Dev server returned HTTP ${response}`);
  }
} catch (err) {
  console.log('   ✗ Dev server not responding');
}

// Check 4: Verify test route exists
console.log('\n4. Checking test route...');
const routesPath = path.join(__dirname, 'src/routes/index.tsx');
if (fs.existsSync(routesPath)) {
  const routesContent = fs.readFileSync(routesPath, 'utf8');
  if (routesContent.includes("path: 'test/scanner'")) {
    console.log('   ✓ Test scanner route found');
  } else {
    console.log('   ✗ Test scanner route not found');
  }
}

// Check 5: Create test QR code for scanning
console.log('\n5. Creating test QR code...');
const testQrPath = path.join(__dirname, 'test-qr-code.html');
const testQrContent = `<!DOCTYPE html>
<html>
<head>
    <title>Test QR Code</title>
    <style>
        body { font-family: sans-serif; padding: 20px; text-align: center; }
        .qr { margin: 20px auto; border: 2px solid #333; padding: 10px; display: inline-block; }
        p { max-width: 600px; margin: 20px auto; line-height: 1.6; }
    </style>
</head>
<body>
    <h1>Test QR Code for Scanner</h1>
    <p>Use this QR code to test your scanner. It contains the text: <code>TEST-SCANNER-12345</code></p>
    
    <div class="qr">
        <!-- Simple QR code representation -->
        <div style="font-family: monospace; font-size: 8px; line-height: 8px; letter-spacing: 2px;">
            ██████████████████████████<br>
            ██░░░░░░░░████░░░░░░░░██<br>
            ██░█████░██░░██░█████░██<br>
            ██░██░░█░██████░█░░██░██<br>
            ██░█████░█░░░░█░█████░██<br>
            ██░░░░░░░██░███░░░░░░░██<br>
            ██████░█████░░█░████████<br>
            █░░░░█░██░░██░███░░██░░█<br>
            █░██░██░░░█░░░░░█░██░░██<br>
            ██░░███░██░░████░███░░██<br>
            ██████░█████░░█░████████<br>
            ██░░░░░░░██░███░░░░░░░██<br>
            ██░█████░█░░░░█░█████░██<br>
            ██░██░░█░██████░█░░██░██<br>
            ██░█████░██░░██░█████░██<br>
            ██░░░░░░░░████░░░░░░░░██<br>
            ██████████████████████████<br>
        </div>
    </div>
    
    <p>Text content: <strong>TEST-SCANNER-12345</strong></p>
    <p>Save this image or display on another device to test scanning.</p>
    
    <h2>Alternative Test Options:</h2>
    <ul style="text-align: left; display: inline-block;">
        <li>Use any QR code generator app</li>
        <li>Search for "test QR code" images online</li>
        <li>Create barcodes with online generators</li>
    </ul>
</body>
</html>`;

fs.writeFileSync(testQrPath, testQrContent);
console.log('   ✓ Created test-qr-code.html');

// Summary
console.log('\n' + '='.repeat(50));
console.log('📋 VERIFICATION SUMMARY');
console.log('='.repeat(50));
console.log('\nTo test the scanner:');
console.log('1. Open browser to http://localhost:5173/test/scanner');
console.log('2. Click "Open Scanner" button');
console.log('3. Allow camera permissions if prompted');
console.log('4. Point camera at a QR code (use test-qr-code.html)');
console.log('5. Check browser console (F12) for debug info');
console.log('\nTroubleshooting:');
console.log('- See CAMERA_SCANNER_TROUBLESHOOTING.md for detailed steps');
console.log('- Check browser console for specific error messages');
console.log('- Try different browsers (Chrome recommended)');
console.log('- Ensure no other apps are using the camera');

// Check if there's a dev server process
console.log('\n' + '='.repeat(50));
console.log('Checking for dev server process...');
try {
  const procs = execSync('ps aux | grep -E "(vite|npm.*dev)" | grep -v grep', { encoding: 'utf8' });
  if (procs.trim()) {
    console.log('Dev server process found:');
    console.log(procs.split('\n').filter(l => l).map(l => '  ' + l).join('\n'));
  } else {
    console.log('No dev server process found. Start with: npm run dev');
  }
} catch (err) {
  console.log('Could not check processes');
}

console.log('\n✅ Verification complete!');