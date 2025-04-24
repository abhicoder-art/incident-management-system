require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Set up logging
const logFile = path.join(__dirname, 'server.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Custom logging function
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  logStream.write(logMessage);
}

const app = express();
const port = 3001;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Enable CORS for the React frontend
app.use(cors({
  origin: 'http://localhost:5173', // Vite's default port
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Root path handler
app.get('/', (req, res) => {
  res.json({
    message: 'API is running',
    endpoints: {
      comments: {
        getAllComments: 'GET /api/comments',
        addNewComment: 'POST /api/comments',
      },
      incidents: {
        getAllIncidents: 'GET /api/incidents',
        getIncident: 'GET /api/incidents/:id',
        createIncident: 'POST /api/incidents',
      }
    }
  });
});

// Get all comments
app.get('/api/comments', async (req, res) => {
  try {
    console.log('Fetching comments from Supabase...');
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Fetched comments:', data);
    res.json(data);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments', details: error.message });
  }
});

// Add a new comment
app.post('/api/comments', async (req, res) => {
  try {
    const { name, comment } = req.body;
    console.log('Attempting to insert comment:', { name, comment });

    if (!name || !comment) {
      throw new Error('Name and comment are required');
    }

    const { data, error } = await supabase
      .from('comments')
      .insert([{ name, comment }])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Successfully inserted comment:', data);
    res.status(201).json(data);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ 
      error: 'Failed to add comment', 
      details: error.message,
      name: req.body.name,
      comment: req.body.comment 
    });
  }
});

// Get all incidents
app.get('/api/incidents', async (req, res) => {
  try {
    console.log('Fetching incidents from Supabase...');
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Fetched incidents:', data);
    res.json(data);
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ error: 'Failed to fetch incidents', details: error.message });
  }
});

// Get a single incident
app.get('/api/incidents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching incident from Supabase:', id);

    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    console.log('Fetched incident:', data);
    res.json(data);
  } catch (error) {
    console.error('Error fetching incident:', error);
    res.status(500).json({ error: 'Failed to fetch incident', details: error.message });
  }
});

// Get all team members
app.get('/api/team-members', async (req, res) => {
  try {
    console.log('Fetching team members from Supabase...');
    
    // First check if the table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('team_members')
      .select('id')
      .limit(1);
    
    if (tableError) {
      console.error('Error checking team_members table:', tableError);
      throw tableError;
    }

    // If we got here, the table exists, now fetch all members
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('full_name');

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('No team members found in the database');
      return res.json([]);
    }

    console.log('Successfully fetched team members:', data);
    res.json(data);
  } catch (error) {
    console.error('Error in /api/team-members:', error);
    res.status(500).json({ 
      error: 'Failed to fetch team members',
      details: error.message,
      code: error.code
    });
  }
});

// Get a single team member
app.get('/api/team-members/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Team member not found' });
    }
    res.json(data);
  } catch (error) {
    console.error('Error fetching team member:', error);
    res.status(500).json({ error: 'Failed to fetch team member' });
  }
});

// Update the incidents endpoint to handle team member relationships
app.post('/api/incidents', async (req, res) => {
  try {
    console.log('Received POST request to /api/incidents');
    console.log('Request body:', req.body);
    
    const { title, description, status, priority, assigned_to, resolution, source, client } = req.body;
    
    if (!title || !description) {
      throw new Error('Title and description are required');
    }

    // If assigned_to is provided, verify the team member exists
    if (assigned_to) {
      const { data: teamMember, error: teamMemberError } = await supabase
        .from('team_members')
        .select('id')
        .eq('id', assigned_to)
        .single();

      if (teamMemberError || !teamMember) {
        throw new Error('Invalid team member ID provided');
      }
    }

    const { data, error } = await supabase
      .from('incidents')
      .insert([{
        title,
        description,
        status: status || 'Open',
        priority: priority || 'Medium',
        assigned_to,
        resolution,
        source,
        client
      }])
      .select(`
        *,
        assigned_team_member:team_members (
          id,
          full_name,
          email,
          role,
          department
        )
      `)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Successfully created incident:', data);
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating incident:', error);
    res.status(500).json({ 
      error: 'Failed to create incident', 
      details: error.message,
      stack: error.stack 
    });
  }
});

// Update incident status
app.put('/api/incidents/:id/status', async (req, res) => {
  console.log('PUT /api/incidents/:id/status - Request received');
  console.log('Params:', req.params);
  console.log('Body:', req.body);
  
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`Updating incident ${id} status to ${status}`);
    
    if (!status) {
      console.log('Status is missing');
      return res.status(400).json({ error: 'Status is required' });
    }

    // Validate status value
    const validStatuses = ['Open', 'In Progress', 'Closed'];
    if (!validStatuses.includes(status)) {
      console.log('Invalid status value:', status);
      return res.status(400).json({ error: 'Invalid status value' });
    }

    console.log('Making Supabase update request...');
    const { data, error } = await supabase
      .from('incidents')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ 
        error: 'Database error', 
        details: error.message 
      });
    }

    if (!data) {
      console.log('No data returned from Supabase');
      return res.status(404).json({ error: 'Incident not found' });
    }

    console.log('Successfully updated incident status:', data);
    return res.json(data);
  } catch (error) {
    console.error('Error updating incident status:', error);
    return res.status(500).json({ 
      error: 'Failed to update incident status', 
      details: error.message 
    });
  }
});

// Update incident team member assignment
app.put('/api/incidents/:id/assign', async (req, res) => {
  log('PUT /api/incidents/:id/assign - Request received');
  log(`Params: ${JSON.stringify(req.params)}`);
  log(`Body: ${JSON.stringify(req.body)}`);
  
  try {
    const { id } = req.params;
    const { assigned_to } = req.body;
    
    // If assigned_to is provided, verify the team member exists
    if (assigned_to) {
      const { data: teamMember, error: teamMemberError } = await supabase
        .from('team_members')
        .select('id, full_name, telegram_chat_id')
        .eq('id', assigned_to)
        .single();

      if (teamMemberError || !teamMember) {
        log(`Error: Invalid team member ID provided - ${assigned_to}`);
        return res.status(400).json({ error: 'Invalid team member ID provided' });
      }

      // Get the incident details
      const { data: incident, error: incidentError } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', id)
        .single();

      if (incidentError || !incident) {
        log(`Error: Incident not found - ${id}`);
        return res.status(404).json({ error: 'Incident not found' });
      }

      // If team member has a Telegram chat ID, send notification
      if (teamMember.telegram_chat_id) {
        try {
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          log('=== Telegram Notification Debug ===');
          log(`Bot token exists: ${!!botToken}`);
          log(`Bot token length: ${botToken ? botToken.length : 0}`);
          log(`Team member Telegram chat ID: ${teamMember.telegram_chat_id}`);
          
          if (!botToken) {
            log('Error: Telegram bot token is not configured');
          } else {
            log(`Sending Telegram notification to chat ID: ${teamMember.telegram_chat_id}`);
            const message = `🚨 New Incident Assignment\n\nTitle: ${incident.title}\nPriority: ${incident.priority}\nStatus: ${incident.status}\n\nYou have been assigned to this incident.`;
            
            log(`Message to send: ${message}`);
            log(`Telegram API URL: https://api.telegram.org/bot${botToken}/sendMessage`);
            
            const response = await axios.post(
              `https://api.telegram.org/bot${botToken}/sendMessage`,
              {
                chat_id: teamMember.telegram_chat_id,
                text: message
              }
            );

            log(`Telegram API Response: ${JSON.stringify(response.data, null, 2)}`);
            if (response.data.ok) {
              log('Telegram notification sent successfully');
            } else {
              log(`Error: Telegram API returned error: ${JSON.stringify(response.data)}`);
            }
          }
        } catch (error) {
          log('=== Telegram Notification Error ===');
          log(`Error message: ${error.message}`);
          if (error.response) {
            log(`Error response data: ${JSON.stringify(error.response.data)}`);
            log(`Error status: ${error.response.status}`);
            log(`Error headers: ${JSON.stringify(error.response.headers)}`);
          }
          if (error.request) {
            log(`Error request: ${JSON.stringify(error.request)}`);
          }
        }
      } else {
        log(`No Telegram chat ID found for team member: ${teamMember.id}`);
      }
    }

    const { data, error } = await supabase
      .from('incidents')
      .update({ 
        assigned_to,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        assigned_team_member:team_members (
          id,
          full_name,
          email,
          role,
          department
        )
      `)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ 
        error: 'Database error', 
        details: error.message 
      });
    }

    if (!data) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    console.log('Successfully updated incident assignment:', data);
    return res.json(data);
  } catch (error) {
    console.error('Error updating incident assignment:', error);
    return res.status(500).json({ 
      error: 'Failed to update incident assignment', 
      details: error.message 
    });
  }
});

// Update incident details
app.put('/api/incidents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, assigned_to, resolution, source, client } = req.body;
    
    console.log(`Updating incident ${id} with data:`, req.body);

    const { data, error } = await supabase
      .from('incidents')
      .update({ 
        title,
        description,
        status,
        priority,
        assigned_to,
        resolution,
        source,
        client,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        assigned_team_member:team_members (
          id,
          full_name,
          email,
          role,
          department
        )
      `)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ 
        error: 'Database error', 
        details: error.message 
      });
    }

    if (!data) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    console.log('Successfully updated incident:', data);
    return res.json(data);
  } catch (error) {
    console.error('Error updating incident:', error);
    return res.status(500).json({ 
      error: 'Failed to update incident', 
      details: error.message 
    });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('  GET  /api/incidents');
  console.log('  POST /api/incidents');
  console.log('  GET  /api/incidents/:id');
  console.log('  PUT  /api/incidents/:id/status');
  console.log('  PUT  /api/incidents/:id/assign');
  console.log('Supabase URL:', process.env.SUPABASE_URL);
  console.log('Has Supabase Anon Key:', !!process.env.SUPABASE_ANON_KEY);
}); 