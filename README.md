# Sense Checkr - Professional Investment Memo Fact-Checking Tool

A sophisticated B2B investment memo fact-checking application that helps financial analysts extract and verify factual claims from investment memos. Built with Node.js, React, and TypeScript, featuring an elegant design inspired by The Economist's clean, authoritative aesthetic.

## Features

- **AI-Powered Claim Extraction**: Automatically extracts factual claims from investment memos using OpenRouter API with GPT-4.1-mini
- **Professional UI**: Clean, newspaper-like layout with The Economist-inspired design
- **Split-Screen Verification**: View original memo alongside extracted claims with synchronized highlighting
- **Claim Categorization**: Automatic categorization into financial, market, operational, and other claims
- **Real-time Progress Tracking**: Visual indicators for verification progress and status summaries
- **Sample Memo**: Built-in realistic investment memo for testing

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: React 18 + TypeScript (Create React App)
- **Styling**: CSS Modules with custom design system
- **State Management**: React Context + useReducer
- **Icons**: Lucide React
- **LLM Integration**: OpenRouter API with GPT-4.1-mini

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenRouter API key

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd sense-checkr
```

2. Install dependencies:
```bash
npm run install-all
```

3. Create a `.env.local` file in the root directory with your OpenRouter API key:
```env
OPENROUTER_API_KEY=your_api_key_here
```

## Running the Application

Development mode (runs both server and client):
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## API Endpoints

- `POST /api/claims/extract` - Extract claims from memo text
- `GET /api/claims/sample` - Get sample investment memo
- `GET /api/health` - Health check endpoint

## Project Structure

```
sense-checkr/
├── server/
│   ├── routes/api/         # API route handlers
│   ├── middleware/         # Express middleware
│   ├── utils/              # Utility functions (OpenRouter client)
│   └── server.js           # Express server setup
├── client/
│   ├── public/             # Static files
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React Context providers
│   │   ├── hooks/          # Custom React hooks
│   │   ├── styles/         # CSS files
│   │   ├── types/          # TypeScript interfaces
│   │   └── App.tsx         # Main App component
└── package.json            # Root package.json

```

## Design System

The application uses a custom design system inspired by The Economist:

### Colors
- Primary: Deep red (#E3120B)
- Secondary: Charcoal (#2C2C2C)
- Accent: Navy blue (#1B365D)
- Success: Forest green (#228B22)
- Warning: Amber (#FFB000)
- Error: Crimson (#DC143C)

### Typography
- Headlines: Georgia serif font
- Body text: System sans-serif fonts
- Professional hierarchy with clear visual distinction

## Features in Detail

### Memo Input
- Large, professional textarea with character count
- Sample memo button for quick testing
- Validation for minimum/maximum length
- Clear error messaging

### Claim Verification Interface
- Split-screen layout: 60% memo, 40% claims
- Color-coded highlighting based on verification status
- Hover interactions for claim synchronization
- Progress indicators with statistics

### Claim Cards
- Status indicators (unverified, true, false, assumption)
- Category badges with distinct colors
- Confidence scores with visual bars
- One-click status updates

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. 