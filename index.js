const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const open = require('open');
const path = require('path');
dotenv.config();
const app = express();
const port = 3000;

// Set up OAuth2 client with your credentials
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Define the scopes we need
const SCOPES = ['https://www.googleapis.com/auth/drive'];

// Step 1: Redirect user to consent screen
app.get('/', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  res.send(`<a href="${authUrl}">Authorize with Google</a>`);
});

// Step 2: Handle Google redirect
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    // Store tokens in memory or file for reuse (optional)
    // You can now use the authorized client!
    res.send('Authorization successful! You can now use the app.');
    // Optional: list 10 files just to test
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const result = await drive.files.list({
      pageSize: 10,
      fields: 'files(id, name)',
    });
    console.log('Your Google Drive Files:');
    result.data.files.forEach(file => {
      console.log(`${file.name} (${file.id})`);
    });
  } catch (err) {
    console.error('Error retrieving access token', err);
    res.send('Authorization failed');
  }
});

// Add this to support JSON parsing
app.use(express.json());

// Ownership transfer implementation (no need to create permission)
app.post('/transfer', async (req, res) => {
    const { fileId, newOwnerEmail } = req.body;
  
    if (!fileId || !newOwnerEmail) {
      return res.status(400).send('Please provide fileId and newOwnerEmail');
    }
  
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
  
    try {
      // Verify file exists and user has access
      let fileInfo;
      try {
        fileInfo = await drive.files.get({
          fileId: fileId,
          fields: 'id,name,owners,mimeType,permissions',
        });
        console.log('File found:', fileInfo.data.name);
      } catch (error) {
        return res.status(404).send('File not found or you don\'t have access to it');
      }
  
      // Find the existing permission ID of the new owner
      const permissions = fileInfo.data.permissions || [];
      const existingPermission = permissions.find(
        (perm) => perm.emailAddress === newOwnerEmail
      );
  
      if (!existingPermission) {
        return res.status(400).send(`The user ${newOwnerEmail} does not have existing access to this file.`);
      }
  
      const permissionId = existingPermission.id;
  
      // Transfer ownership
      console.log('Transferring ownership to:', newOwnerEmail);
      await drive.permissions.update({
        fileId,
        permissionId,
        transferOwnership: true,
        requestBody: {
          role: 'owner',
        },
      });
  
      console.log('Ownership transferred successfully');
      res.send(`✅ Ownership transferred to ${newOwnerEmail}`);
  
    } catch (err) {
      console.error('Error:', err);
  
      if (err.response && err.response.data && err.response.data.error) {
        const errorDetails = err.response.data.error;
        console.error('API Error Details:', errorDetails);
  
        if (errorDetails.errors && errorDetails.errors.some(e => e.reason === 'consentRequiredForOwnershipTransfer')) {
          return res.status(200).send(`📨 Ownership invitation sent to ${newOwnerEmail}. They need to accept it before ownership can be transferred.`);
        }
  
        return res.status(500).send(`Error: ${errorDetails.message || 'Unknown error'}`);
      }
  
      res.status(500).send('Something went wrong. Check the console for details.');
    }
  });
  
  app.get('/transfer-form', (req, res) => {
    res.sendFile(path.join(__dirname, 'transfer.html'));
  });
  

// Run the server
app.listen(port, () => {
  console.log(`🚀 App listening at http://localhost:${port}`);
  console.log(`🔗 Visit that URL to start authentication`);
});