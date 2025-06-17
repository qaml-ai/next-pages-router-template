# CamelAI API Integration Sample

This is a sample Next.js project demonstrating how to integrate with the CamelAI API to add AI chat capabilities to your application.

## Key Components

### 1. Token Generation (`pages/api/token.ts`)
This endpoint handles secure token generation for the CamelClient:
- Exchanges your CamelAI API key for a short-lived JWT token
- Should be protected by your own authentication (see TODO comment in the file)
- Returns the JWT token to the browser for use by the CamelClient

### 2. Component Initialization (`pages/index.tsx`)
Shows how to:
- Create a `CamelClient` instance with the token fetcher function
- Initialize the chat UI component with the client
- Configure available models and data sources

## Setup

1. **Set your API Key**
   ```bash
   export CAMEL_API_KEY=your_api_key_here
   ```

2. **Configure Data Source**
   Edit `pages/index.tsx` and set your data source ID:
   ```javascript
   const selectedDataSource = 1  // Replace with your data source ID
   ```

3. **Add Authentication**
   Uncomment and implement the authentication check in `pages/api/token.ts`:
   ```javascript
   // const session = (req as any).session;
   // if (!session?.user?.id) {
   //   return res.status(401).json({ error: 'not authenticated' });
   // }
   ```

4. **Install & Run**
   ```bash
   npm install
   npm run dev
   ```

## How It Works

1. The browser requests a token from `/api/token`
2. Your server exchanges the API key for a short-lived JWT
3. The CamelClient uses this token to communicate with CamelAI
4. The chat UI component handles the user interface

## Security Notes

- Never expose your CamelAI API key to the browser
- Always authenticate users before issuing tokens
- Tokens are short-lived for security (handled automatically by CamelClient)

## Available Models

- `o3`: Most capable model
- `o4-mini`: Fast and efficient

## Next Steps

- Implement proper user authentication
- Customize the chat UI component
- Configure additional data sources
- Add custom functionality using the CamelClient API