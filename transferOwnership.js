// transferOwnership.js

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Load OAuth2 client (reuse the same one you used in index.js)
const auth = require('./index'); // Adjust if your OAuth2 client is exported from index.js

const drive = google.drive({ version: 'v3', auth });

const fileId = '1T5kBNwYMU39UAE-Hsms7e1d8QTE5J-hD';
const newOwnerEmail = 'newuser@gmail.com';

async function transferOwnership(fileId, newOwnerEmail) {
  try {
    // Step 1: Add new user as a writer with transferOwnership set to true
    const permission = await drive.permissions.create({
      fileId,
      requestBody: {
        type: 'user',
        role: 'owner',
        emailAddress: newOwnerEmail,
      },
      transferOwnership: true,
      fields: 'id',
    });

    console.log(`✅ Ownership transferred successfully. Permission ID: ${permission.data.id}`);
  } catch (error) {
    console.error('❌ Failed to transfer ownership:', error.errors || error.message);
  }
}

transferOwnership(fileId, newOwnerEmail);
