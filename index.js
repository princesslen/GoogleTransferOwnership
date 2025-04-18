const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const open = require('open');

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

// Run the server
app.listen(port, () => {
  console.log(`🚀 App listening at http://localhost:${port}`);
  console.log(`🔗 Visit that URL to start authentication`);
});
