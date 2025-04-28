const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Clear any existing environment variables
delete process.env.OPENAI_API_KEY;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;

// Load .env file manually
const envPath = path.join(__dirname, '.env');
console.log('Attempting to load .env file from:', envPath);

if (fs.existsSync(envPath)) {
  console.log('.env file exists');
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log('.env file content:', envContent);
  
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('Error loading .env file:', result.error);
  } else {
    console.log('Successfully loaded .env file');
    console.log('Parsed environment variables:', result.parsed);
  }
} else {
  console.error('No .env file found at:', envPath);
}

// Debug logging for environment variables
console.log('\n=== Environment Variables Check ===');
console.log('Current directory:', __dirname);
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('OPENAI_API_KEY value:', process.env.OPENAI_API_KEY ? '***' + process.env.OPENAI_API_KEY.slice(-4) : 'undefined');
console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY exists:', !!process.env.SUPABASE_ANON_KEY);
console.log('==================================\n');

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const rateLimit = require('express-rate-limit');

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

// Add rate limiter
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later'
});

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

// Log all routes
app.use((req, res, next) => {
  log(`Incoming request: ${req.method} ${req.url}`)
  next()
})

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

// Update incident category
app.put('/api/incidents/:id/category', async (req, res) => {
  try {
    const { id } = req.params
    const { category } = req.body

    log(`Updating category for incident ${id} to ${category}`)

    if (!category || !['Hardware', 'Software', 'Services'].includes(category)) {
      return res.status(400).json({ 
        error: 'Invalid category',
        details: 'Category must be one of: Hardware, Software, Services'
      })
    }

    const { data, error } = await supabase
      .from('incidents')
      .update({ 
        category,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      log(`Error updating category: ${error.message}`)
      return res.status(500).json({ 
        error: 'Database error',
        details: error.message
      })
    }

    if (!data) {
      return res.status(404).json({ error: 'Incident not found' })
    }

    log(`Successfully updated category for incident ${id}`)
    return res.json(data)
  } catch (error) {
    log(`Error in category update: ${error.message}`)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    })
  }
})

// AI Analysis endpoint
app.post('/api/incidents/:id/analyze', aiLimiter, async (req, res) => {
  try {
    const { id } = req.params
    log(`=== Starting Analysis for Incident ${id} ===`)
    
    // Validate Together AI API key
    if (!process.env.TOGETHER_API_KEY) {
      log('Error: TOGETHER_API_KEY is not set')
      return res.status(500).json({ 
        error: 'AI service configuration error',
        details: 'Together AI API key is not configured'
      })
    }
    
    // Get incident from database
    log('Fetching incident from database...')
    const { data: incident, error: incidentError } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', id)
      .single()

    if (incidentError) {
      log(`Error fetching incident: ${incidentError.message}`)
      return res.status(500).json({ 
        error: 'Database error',
        details: incidentError.message
      })
    }

    if (!incident) {
      log(`Error: Incident not found - ${id}`)
      return res.status(404).json({ error: 'Incident not found' })
    }

    log(`Successfully fetched incident: ${JSON.stringify(incident)}`)

    // Check if we have a cached analysis
    log('Checking for cached analysis...')
    const { data: cachedAnalysis, error: cacheError } = await supabase
      .from('incident_analysis')
      .select('*')
      .eq('incident_id', id)
      .single()

    if (cacheError) {
      log(`Error checking cache: ${cacheError.message}`)
      // Continue with API call if cache check fails
    } else if (cachedAnalysis) {
      log(`Using cached analysis for incident ${id}`)
      return res.json(cachedAnalysis)
    }

    // Call Together AI API
    log('Preparing Together AI API request...')
    const togetherRequest = {
      model: "deepseek-ai/deepseek-r1-distill-llama-70b", // Using DeepSeek R1 Distill Llama 70B
      messages: [
        {
          role: "system",
          content: "You are an IT incident response expert. Your task is to analyze IT incidents and provide clear, actionable insights. Always format your response exactly as follows:\n\nPossible Cause: [Your analysis of the likely cause]\n\nSuggested Solution: [Your recommended solution]\n\nDo not include any additional text or explanations outside these sections."
        },
        {
          role: "user",
          content: `Incident Title: ${incident.title}\n\nDescription: ${incident.description}\n\nPlease analyze this incident and provide a possible cause and suggested solution.`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    }
    
    log(`Sending request to Together AI API...`)
    try {
      const response = await axios.post(
        'https://api.together.xyz/v1/chat/completions',
        togetherRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`
          }
        }
      )

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error('Invalid response format from Together AI API')
      }

      log(`Received response from Together AI API`)
      const content = response.data.choices[0].message.content
      
      // Improved parsing logic
      let possible_cause = ''
      let suggested_solution = ''
      
      // Split content into lines and process each line
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        
        // Check for possible cause
        if (line.toLowerCase().includes('possible cause')) {
          possible_cause = line.split(':')[1]?.trim() || ''
          // If the cause is empty, try to get the next line
          if (!possible_cause && i + 1 < lines.length) {
            possible_cause = lines[i + 1].trim()
          }
        }
        
        // Check for suggested solution
        if (line.toLowerCase().includes('suggested solution')) {
          suggested_solution = line.split(':')[1]?.trim() || ''
          // If the solution is empty, try to get the next line
          if (!suggested_solution && i + 1 < lines.length) {
            suggested_solution = lines[i + 1].trim()
          }
        }
      }

      // If we still don't have values, try to extract from the content directly
      if (!possible_cause || !suggested_solution) {
        const sections = content.split('\n\n')
        if (sections.length >= 2) {
          if (!possible_cause) {
            possible_cause = sections[0].replace('Possible Cause:', '').trim()
          }
          if (!suggested_solution) {
            suggested_solution = sections[1].replace('Suggested Solution:', '').trim()
          }
        }
      }

      // Final fallback if we still don't have values
      if (!possible_cause) {
        possible_cause = 'Unable to determine cause'
      }
      if (!suggested_solution) {
        suggested_solution = 'No solution suggested'
      }

      log(`Extracted analysis - Cause: ${possible_cause}, Solution: ${suggested_solution}`)

      // Cache the analysis in database
      log('Caching analysis in database...')
      const { data: analysis, error: analysisError } = await supabase
        .from('incident_analysis')
        .insert([{
          incident_id: id,
          possible_cause,
          suggested_solution,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (analysisError) {
        log(`Error caching analysis: ${analysisError.message}`)
        // Return the analysis even if caching fails
        return res.json({ possible_cause, suggested_solution })
      }

      return res.json(analysis)
    } catch (error) {
      log(`Together AI API error: ${error.message}`)
      if (error.response) {
        log(`Together AI API error details: ${JSON.stringify(error.response.data)}`)
      }
      return res.status(500).json({ 
        error: 'AI analysis failed',
        details: error.message
      })
    }
  } catch (error) {
    log(`General error in AI analysis: ${error.message}`)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    })
  }
})

// Test endpoint
app.get('/api/test', (req, res) => {
  log('Test endpoint hit')
  res.json({ message: 'Server is working!' })
})

// Get category analytics
app.get('/api/incidents/analytics/category', async (req, res) => {
  try {
    log('Fetching category analytics...')
    log('Supabase URL:', process.env.SUPABASE_URL)
    log('Has Supabase Anon Key:', !!process.env.SUPABASE_ANON_KEY)
    
    const { data, error } = await supabase
      .from('incidents')
      .select('category, status')
    
    if (error) {
      log(`Error fetching incidents: ${error.message}`)
      log('Error details:', error)
      return res.status(500).json({ 
        error: 'Database error',
        details: error.message
      })
    }

    log('Successfully fetched incidents:', data)

    // Initialize stats for each category
    const categoryStats = {
      Hardware: { total: 0, open: 0, inProgress: 0, closed: 0 },
      Software: { total: 0, open: 0, inProgress: 0, closed: 0 },
      Services: { total: 0, open: 0, inProgress: 0, closed: 0 }
    }

    // Calculate stats
    data.forEach(incident => {
      const category = incident.category || 'Software'
      categoryStats[category].total++
      
      switch (incident.status) {
        case 'Open':
          categoryStats[category].open++
          break
        case 'In Progress':
          categoryStats[category].inProgress++
          break
        case 'Closed':
          categoryStats[category].closed++
          break
      }
    })

    // Format response
    const response = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      ...stats
    }))

    log('Successfully fetched category analytics:', response)
    return res.json(response)
  } catch (error) {
    log(`Error in category analytics: ${error.message}`)
    log('Error stack:', error.stack)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    })
  }
})

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