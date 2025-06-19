# CamelAI API Integration Sample

This is a sample Next.js project demonstrating how to integrate with the CamelAI API to add AI chat capabilities to your application.

## Key Components

### 1. Token Generation (`pages/api/token.ts`)
This endpoint handles secure token generation for the CamelClient:
- Exchanges your CamelAI API key for a short-lived JWT token
- Should be protected by your own authentication (see TODO comment in the file)
- Returns the JWT token to the browser for use by the CamelClient

### 2. Main Application (`pages/index.tsx`)
Shows how to:
- Create a `CamelClient` instance with the token fetcher function
- Automatically fetch available data sources from your CamelAI account
- Initialize the chat UI component with the selected configuration

## Setup

1. **Set your API Key**
   ```bash
   export CAMEL_API_KEY=your_api_key_here
   ```

2. **Add Authentication**
   Uncomment and implement the authentication check in `pages/api/token.ts`:
   ```javascript
   // const session = (req as any).session;
   // if (!session?.user?.id) {
   //   return res.status(401).json({ error: 'not authenticated' });
   // }
   ```

3. **Install & Run**
   ```bash
   npm install
   npm run dev
   ```

## How It Works

1. **Server-side Setup**: The app automatically fetches your available data sources using your API key
2. **Data Source Selection**: Users are presented with a friendly UI to select from available data sources
3. **Token Exchange**: The browser requests a token from `/api/token` with the selected data source
4. **Chat Interface**: The CamelClient uses the token to communicate with CamelAI and loads the chat UI

## User Experience

### Setup
- If no API key is set, users see a helpful error message with setup instructions
- If API key is set but no data sources exist, users get a link to add data sources in the console
- If data sources are available, users select one and start chatting

## Security Notes

- Never expose your CamelAI API key to the browser
- Always authenticate users before issuing tokens
- Tokens are short-lived for security (handled automatically by CamelClient)

## Available Models

- `o3`: Most capable model
- `o4-mini`: Fast and efficient

## Error Handling

The app gracefully handles common scenarios:
- **Missing API Key**: Clear error message with setup instructions
- **API Connection Issues**: Friendly error message for connectivity problems
- **No Data Sources**: Helpful guidance to add data sources via the console

## Next Steps for Customization

- Implement proper user authentication in the token endpoint
- Customize the chat UI component styling
- Add custom functionality using the CamelClient API
- Configure additional models or features as needed
