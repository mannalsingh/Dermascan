/**
 * get-gmail-token.js
 *
 * Helper script to generate GMAIL_REFRESH_TOKEN for DermaScan AI.
 * Run locally via:
 *   node scripts/get-gmail-token.js
 */

const http = require('http');
const url = require('url');
const readline = require('readline');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const PORT = 5000;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('\n================================================================');
  console.log('   DermaScan AI — Gmail REST API Token Generator');
  console.log('================================================================\n');

  const defaultClientId = process.env.GOOGLE_CLIENT_ID || '';
  let clientId = await askQuestion(
    `Enter Google OAuth Client ID [${defaultClientId ? 'Press Enter for ' + defaultClientId.substring(0, 15) + '...' : 'Paste Client ID'}]: `
  );
  if (!clientId.trim() && defaultClientId) {
    clientId = defaultClientId;
  }
  clientId = clientId.trim();

  let clientSecret = (process.env.GMAIL_CLIENT_SECRET || '').trim();
  if (!clientSecret) {
    clientSecret = await askQuestion('Enter Google OAuth Client Secret: ');
    clientSecret = clientSecret.trim();
  }

  let userEmail = (process.env.GMAIL_USER || process.env.EMAIL_USER || '').trim();
  if (!userEmail) {
    userEmail = await askQuestion('Enter your sending Gmail address (e.g. yourname@gmail.com): ');
    userEmail = userEmail.trim();
  }

  if (!clientId || !clientSecret) {
    console.error('\n[Error] Both Client ID and Client Secret are required.');
    process.exit(1);
  }

  const oauth2Client = new OAuth2Client(clientId, clientSecret, REDIRECT_URI);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });

  console.log('\n----------------------------------------------------------------');
  console.log('STEP 1: Ensure Redirect URI is configured in Google Cloud Console');
  console.log(`Add this redirect URI to your OAuth Client in Google Cloud Console:`);
  console.log(`   ${REDIRECT_URI}`);
  console.log('----------------------------------------------------------------\n');
  console.log('STEP 2: Open this URL in your browser and authorize DermaScan:');
  console.log(`\n${authUrl}\n`);
  console.log('----------------------------------------------------------------');
  console.log('Waiting for authorization (listening on http://localhost:5000/oauth2callback)...');
  console.log('Or if redirected elsewhere, paste the authorization code below.\n');

  let resolved = false;

  const server = http.createServer(async (req, res) => {
    try {
      if (req.url.startsWith('/oauth2callback')) {
        const queryParams = url.parse(req.url, true).query;
        if (queryParams.code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <div style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h2 style="color: #0f9d92;">Authorization Successful!</h2>
              <p>You can close this tab and return to your terminal.</p>
            </div>
          `);

          server.close();
          if (!resolved) {
            resolved = true;
            await handleCode(queryParams.code);
          }
        } else if (queryParams.error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`<h3>Authorization Failed: ${queryParams.error}</h3>`);
        }
      }
    } catch (e) {
      console.error(e);
    }
  });

  server.listen(PORT);

  // Fallback: allow manual code entry
  const manualCode = await askQuestion('Paste authorization code here (if not automatically captured): ');
  if (!resolved && manualCode.trim()) {
    resolved = true;
    server.close();
    await handleCode(manualCode.trim());
  }

  async function handleCode(code) {
    try {
      const { tokens } = await oauth2Client.getToken(code);
      if (!tokens.refresh_token) {
        console.warn('\n[Notice] Google did not return a new refresh token.');
        console.warn('This happens if you already granted permissions previously.');
        console.warn('Revoke app access at https://myaccount.google.com/permissions and run again with prompt: consent.');
      }

      console.log('\n================================================================');
      console.log('SUCCESS! Add these variables to your Render Environment:');
      console.log('================================================================\n');
      console.log(`GMAIL_USER=${userEmail}`);
      console.log(`GMAIL_CLIENT_ID=${clientId}`);
      console.log(`GMAIL_CLIENT_SECRET=${clientSecret}`);
      console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token || 'USE_PREVIOUS_REFRESH_TOKEN'}`);
      console.log('\n================================================================\n');
      process.exit(0);
    } catch (err) {
      console.error('\n[Error exchanging code for tokens]:', err.message);
      process.exit(1);
    }
  }
}

main().catch(console.error);
