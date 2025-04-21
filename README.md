# Incident Management System

A full-stack application for managing incidents, built with React, Express, and Supabase.

## Features

- User authentication with Supabase Auth
- Create, view, and update incidents
- Status tracking and management
- Priority-based incident organization
- Real-time updates

## Tech Stack

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express
- Database: Supabase (PostgreSQL)
- Styling: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd incident-management-system
```

2. Install dependencies:
```bash
# Install frontend dependencies
cd src
npm install

# Install backend dependencies
cd ../server
npm install
```

3. Set up environment variables:
```bash
# Frontend (.env)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend (.env)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=3001
```

4. Start the development servers:
```bash
# Start backend server
cd server
npm start

# Start frontend server (in a new terminal)
cd src
npm run dev
```

## Project Structure

```
incident-management-system/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── lib/               # Utility functions and configurations
│   └── App.tsx            # Main application component
├── server/                # Backend source code
│   ├── server.js          # Express server
│   └── package.json       # Backend dependencies
└── README.md              # Project documentation
```

## API Endpoints

- `GET /api/incidents` - Get all incidents
- `GET /api/incidents/:id` - Get a single incident
- `POST /api/incidents` - Create a new incident
- `PUT /api/incidents/:id/status` - Update incident status

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 