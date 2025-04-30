const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const path = require('path'); // Keep path for logging file
const fs = require('fs'); // Keep fs for logging file

// Custom logging function (keep for potential debugging in Vercel logs)
const logFile = path.join('/tmp', 'server.log'); // Use /tmp for Vercel
const logStream = fs.createWriteStream(logFile, { flags: 'a' });
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  // In Vercel, writing to file system is limited, but /tmp is writable
  // This might not persist across invocations, but can help with immediate debugging
  try {
    logStream.write(logMessage);
  } catch (e) {
    console.error('Failed to write to log file:', e);
  }
}


const app = express();
// Vercel Serverless Functions don't listen on a specific port like a traditional server
// The port variable is not needed for Vercel deployment
// const port = 3001; 

// Initialize Supabase client using environment variables provided by Vercel
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  log('Error: Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  // In a Serverless Function, throwing an error here will result in a 500 response
  // It's better to handle this gracefully or ensure variables are set in Vercel config
  // For now, we'll log and the Supabase client will likely fail on use.
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);


// Add rate limiter
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later'
});

// Enable CORS for the React frontend
// Allow requests from the frontend's origin. In Vercel, the frontend's origin
// will be the Vercel deployment URL (e.g., https://your-project.vercel.app).
// For simplicity during debugging, we'll allow all origins (*).
// For production, you should restrict this to your frontend's domain.
app.use(cors({
  origin: '*', // Allow all origins for testing
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
  log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  log(`Error in request ${req.method} ${req.url}: ${err.message}`);
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
    log('Fetching comments from Supabase...');
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      log(`Supabase error fetching comments: ${error.message}`);
      throw error;
    }

    log(`Fetched ${data ? data.length : 0} comments.`);
    res.json(data);
  } catch (error) {
    log(`Error fetching comments: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch comments', details: error.message });
  }
});

// Add a new comment
app.post('/api/comments', async (req, res) => {
  try {
    const { name, comment } = req.body;
    log(`Attempting to insert comment: ${JSON.stringify({ name, comment })}`);

    if (!name || !comment) {
      log('Error: Name and comment are required for adding comment');
      throw new Error('Name and comment are required');
    }

    const { data, error } = await supabase
      .from('comments')
      .insert([{ name, comment }])
      .select()
      .single();

    if (error) {
      log(`Supabase error adding comment: ${error.message}`);
      throw error;
    }

    log('Successfully inserted comment.');
    res.status(201).json(data);
  } catch (error) {
    log(`Error adding comment: ${error.message}`);
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
    log('Fetching incidents from Supabase...');
    log('Supabase URL:', process.env.SUPABASE_URL);
    log('Has Supabase Anon Key:', !!process.env.SUPABASE_ANON_KEY);
    
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      log(`Supabase error fetching incidents: ${error.message}`);
      log('Error details:', error);
      return res.status(500).json({ 
        error: 'Database error', 
        details: error.message,
        code: error.code
      });
    }

    log(`Fetched ${data ? data.length : 0} incidents.`);
    res.json(data);
  } catch (error) {
    log(`Error fetching incidents: ${error.message}`);
    log('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get a single incident
app.get('/api/incidents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    log(`Fetching incident from Supabase: ${id}`);

    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      log(`Supabase error fetching incident ${id}: ${error.message}`);
      throw error;
    }

    if (!data) {
      log(`Incident not found: ${id}`);
      return res.status(404).json({ error: 'Incident not found' });
    }

    log(`Fetched incident: ${id}`);
    res.json(data);
  } catch (error) {
    log(`Error fetching incident ${req.params.id}: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch incident', details: error.message });
  }
});

// Get all team members
app.get('/api/team-members', async (req, res) => {
  try {
    log('Fetching team members from Supabase...');
    
    // First check if the table exists
    // Note: This check might not be necessary if your Supabase setup is reliable
    // and the table is guaranteed to exist. Removing it could simplify the code.
    const { data: tableExists, error: tableError } = await supabase
      .from('team_members')
      .select('id')
      .limit(1);
    
    if (tableError) {
      log(`Error checking team_members table: ${tableError.message}`);
      // Depending on the error, this might indicate the table doesn't exist
      // or a connection issue. Log the error details.
      log('Team members table check error details:', tableError);
      // Decide how to handle this - return empty array or error?
      // Returning an empty array might be more graceful if the table is optional
      // or not yet populated. If the table is essential, throw the error.
      // Assuming it's essential for now:
      throw tableError;
    }

    // If we got here, the table exists, now fetch all members
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('full_name');

    if (error) {
      log(`Supabase error fetching team members: ${error.message}`);
      throw error;
    }

    if (!data || data.length === 0) {
      log('No team members found in the database');
      return res.json([]);
    }

    log(`Successfully fetched ${data.length} team members.`);
    res.json(data);
  } catch (error) {
    log(`Error in /api/team-members: ${error.message}`);
    log('Error details:', error); // Log full error object for debugging
    res.status(500).json({ 
      error: 'Failed to fetch team members',
      details: error.message,
      code: error.code // Include Supabase error code if available
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

    if (error) {
      log(`Supabase error fetching team member ${req.params.id}: ${error.message}`);
      throw error;
    }
    if (!data) {
      log(`Team member not found: ${req.params.id}`);
      return res.status(404).json({ error: 'Team member not found' });
    }
    log(`Fetched team member: ${req.params.id}`);
    res.json(data);
  } catch (error) {
    log(`Error fetching team member ${req.params.id}: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch team member', details: error.message });
  }
});

// Update the incidents endpoint to handle team member relationships
app.post('/api/incidents', async (req, res) => {
  try {
    log('Received POST request to /api/incidents');
    log(`Request body: ${JSON.stringify(req.body)}`);
    
    const { title, description, status, priority, assigned_to, resolution, source, client } = req.body;
    
    if (!title || !description) {
      log('Error: Title and description are required for creating incident');
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
        log(`Error: Invalid team member ID provided for assignment - ${assigned_to}`);
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
      log(`Supabase error creating incident: ${error.message}`);
      throw error;
    }

    log('Successfully created incident.');
    res.status(201).json(data);
  } catch (error) {
    log(`Error creating incident: ${error.message}`);
    res.status(500).json({ 
      error: 'Failed to create incident', 
      details: error.message,
      stack: error.stack 
    });
  }
});

// Update incident status
app.put('/api/incidents/:id/status', async (req, res) => {
  log('PUT /api/incidents/:id/status - Request received');
  log(`Params: ${JSON.stringify(req.params)}`);
  log(`Body: ${JSON.stringify(req.body)}`);
  
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    log(`Updating incident ${id} status to ${status}`);
    
    if (!status) {
      log('Status is missing for status update');
      return res.status(400).json({ error: 'Status is required' });
    }

    // Validate status value
    const validStatuses = ['Open', 'In Progress', 'Closed'];
    if (!validStatuses.includes(status)) {
      log(`Invalid status value for update: ${status}`);
      return res.status(400).json({ error: 'Invalid status value' });
    }

    log('Making Supabase update request for status...');
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
      log(`Supabase error updating status for incident ${id}: ${error.message}`);
      return res.status(500).json({ 
        error: 'Database error', 
        details: error.message 
      });
    }

    if (!data) {
      log(`Incident not found for status update: ${id}`);
      return res.status(404).json({ error: 'Incident not found' });
    }

    log(`Successfully updated incident ${id} status.`);
    return res.json(data);
  } catch (error) {
    log(`Error updating incident ${req.params.id} status: ${error.message}`);
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
        log(`Error: Invalid team member ID provided for assignment - ${assigned_to}`);
        return res.status(400).json({ error: 'Invalid team member ID provided' });
      }

      // Get the incident details
      const { data: incident, error: incidentError } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', id)
        .single();

      if (incidentError || !incident) {
        log(`Error: Incident not found for assignment - ${id}`);
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
      log(`Supabase error updating assignment for incident ${id}: ${error.message}`);
      return res.status(500).json({ 
        error: 'Database error', 
        details: error.message 
      });
    }

    if (!data) {
      log(`Incident not found for assignment update: ${id}`);
      return res.status(404).json({ error: 'Incident not found' });
    }

    log(`Successfully updated incident ${id} assignment.`);
    return res.json(data);
  } catch (error) {
    log(`Error updating incident ${req.params.id} assignment: ${error.message}`);
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
    
    log(`Updating incident ${id} with data: ${JSON.stringify(req.body)}`);

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
      log(`Supabase error updating incident ${id}: ${error.message}`);
      return res.status(500).json({ 
        error: 'Database error', 
        details: error.message 
      });
    }

    if (!data) {
      log(`Incident not found for details update: ${id}`);
      return res.status(404).json({ error: 'Incident not found' });
    }

    log(`Successfully updated incident ${id}.`);
    return res.json(data);
  } catch (error) {
    log(`Error updating incident ${req.params.id}: ${error.message}`);
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
      log(`Invalid category for update: ${category}`)
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
      log(`Error updating category for incident ${id}: ${error.message}`)
      return res.status(500).json({ 
        error: 'Database error',
        details: error.message
      })
    }

    if (!data) {
      log(`Incident not found for category update: ${id}`)
      return res.status(404).json({ error: 'Incident not found' })
    }

    log(`Successfully updated category for incident ${id}`)
    return res.json(data)
  } catch (error) {
    log(`Error in category update for incident ${req.params.id}: ${error.message}`)
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
      log(`Error fetching incident for analysis: ${incidentError.message}`)
      return res.status(500).json({ 
        error: 'Database error',
        details: incidentError.message
      })
    }

    if (!incident) {
      log(`Error: Incident not found for analysis - ${id}`)
      return res.status(404).json({ error: 'Incident not found' })
    }

    log(`Successfully fetched incident for analysis: ${JSON.stringify(incident)}`)

    // Check if we have a cached analysis
    log('Checking for cached analysis...')
    const { data: cachedAnalysis, error: cacheError } = await supabase
      .from('incident_analysis')
      .select('*')
      .eq('incident_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let shouldReanalyze = false
    if (cacheError) {
      log(`Error checking cache: ${cacheError.message}`)
      shouldReanalyze = true
    } else if (cachedAnalysis) {
      // Compare incident.title/description with cachedAnalysis.title/description
      if (
        cachedAnalysis.title !== incident.title ||
        cachedAnalysis.description !== incident.description
      ) {
        log('Incident title or description has changed. Will reanalyze.')
        shouldReanalyze = true
        // Optionally, delete the old analysis
        await supabase
          .from('incident_analysis')
          .delete()
          .eq('id', cachedAnalysis.id)
      } else {
        log(`Using cached analysis for incident ${id}`)
        return res.json(cachedAnalysis)
      }
    } else {
      shouldReanalyze = true
    }

    if (shouldReanalyze) {
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
            created_at: new Date().toISOString(),
            title: incident.title,
            description: incident.description
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
      log(`Error fetching incidents for category analytics: ${error.message}`)
      log('Error details:', error)
      return res.status(500).json({ 
        error: 'Database error',
        details: error.message
      })
    }

    log(`Successfully fetched ${data ? data.length : 0} incidents for category analytics.`)

    // Initialize stats for each category
    const categoryStats = {
      Hardware: { total: 0, open: 0, inProgress: 0, closed: 0 },
      Software: { total: 0, open: 0, inProgress: 0, closed: 0 },
      Services: { total: 0, open: 0, inProgress: 0, closed: 0 }
    }

    // Calculate stats
    data.forEach(incident => {
      const category = incident.category || 'Software'
      if (categoryStats[category]) { // Ensure category exists in stats object
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
      } else {
         log(`Warning: Incident with unknown category "${incident.category}" found.`)
      }
    })

    // Format response
    const response = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      ...stats
    }))

    log('Successfully generated category analytics response.')
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

// Get team member analytics
app.get('/api/incidents/analytics/team-member', async (req, res) => {
  try {
    log('Fetching team member analytics...')
    // Fetch all team members
    const { data: teamMembers, error: teamError } = await supabase
      .from('team_members')
      .select('id, full_name')
      .order('full_name')
    if (teamError) {
      log(`Error fetching team members for analytics: ${teamError.message}`)
      return res.status(500).json({ error: 'Database error', details: teamError.message })
    }
    // Fetch all incidents with assigned_to and status
    const { data: incidents, error: incidentError } = await supabase
      .from('incidents')
      .select('assigned_to, status')
    if (incidentError) {
      log(`Error fetching incidents for team member analytics: ${incidentError.message}`)
      return res.status(500).json({ error: 'Database error', details: incidentError.message })
    }
    // Calculate stats for each team member
    const stats = teamMembers.map(member => {
      const assigned = incidents.filter(inc => inc.assigned_to === member.id)
      const resolved = assigned.filter(inc => inc.status === 'Closed')
      return {
        id: member.id,
        name: member.full_name,
        assignedCount: assigned.length,
        resolvedCount: resolved.length
      }
    })
    log('Successfully generated team member analytics response.')
    return res.json(stats)
  } catch (error) {
    log(`Error in team member analytics: ${error.message}`)
    log('Error stack:', error.stack)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})

// Analytics endpoint
app.get('/api/analytics/dashboard', async (req, res) => {
  try {
    log('Fetching dashboard analytics...')
    // Get active incidents count and trend
    const { data: activeIncidents, error: activeError } = await supabase
      .from('incidents')
      .select('created_at, status')
      .in('status', ['Open']);

    if (activeError) {
      log(`Error fetching active incidents for dashboard: ${activeError.message}`)
      throw activeError;
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

    const currentWeekActive = activeIncidents.filter(inc => 
      new Date(inc.created_at) >= sevenDaysAgo
    ).length;

    const previousWeekActive = activeIncidents.filter(inc => 
      new Date(inc.created_at) >= fourteenDaysAgo && 
      new Date(inc.created_at) < sevenDaysAgo
    ).length;

    // Get incident resolutions data
    const { data: resolutions, error: resolutionsError } = await supabase
      .from('incident_resolutions')
      .select('resolved_at, resolution_time_minutes, resolution_type');

    if (resolutionsError) {
      log(`Error fetching resolutions for dashboard: ${resolutionsError.message}`)
      throw resolutionsError;
    }

    // Calculate mean time to resolve
    const currentWeekResolutions = resolutions.filter(res => 
      new Date(res.resolved_at) >= sevenDaysAgo
    );
    const previousWeekResolutions = resolutions.filter(res => 
      new Date(res.resolved_at) >= fourteenDaysAgo && 
      new Date(res.resolved_at) < sevenDaysAgo
    );

    const currentWeekMeanTime = currentWeekResolutions.length > 0
      ? Math.round(currentWeekResolutions.reduce((acc, curr) => acc + (curr.resolution_time_minutes || 0), 0) / currentWeekResolutions.length)
      : 0;

    const previousWeekMeanTime = previousWeekResolutions.length > 0
      ? Math.round(previousWeekResolutions.reduce((acc, curr) => acc + (curr.resolution_time_minutes || 0), 0) / previousWeekResolutions.length)
      : 0;

    // Get service health
    const { data: services, error: servicesError } = await supabase
      .from('service_health')
      .select('service_name, status');

    if (servicesError) {
      log(`Error fetching service health for dashboard: ${servicesError.message}`)
      throw servicesError;
    }

    const operationalCount = services ? services.filter(s => s.status === 'Operational').length : 0;
    const issues = services ? services
      .filter(s => s.status !== 'Operational')
      .map(s => `${s.service_name} (${s.status})`)
      .join(', ') : '';

    // Get AI resolutions
    const currentWeekAI = resolutions.filter(res => 
      new Date(res.resolved_at) >= sevenDaysAgo && 
      res.resolution_type === 'AI'
    ).length;

    const previousWeekAI = resolutions.filter(res => 
      new Date(res.resolved_at) >= fourteenDaysAgo && 
      new Date(res.resolved_at) < sevenDaysAgo && 
      res.resolution_type === 'AI'
    ).length;

    // Calculate change percentages
    const activeChangePercentage = previousWeekActive === 0 ? 0 
      : Math.round(((currentWeekActive - previousWeekActive) / previousWeekActive * 100) * 10) / 10;

    const timeChangePercentage = previousWeekMeanTime === 0 ? 0
      : Math.round(((currentWeekMeanTime - previousWeekMeanTime) / previousWeekMeanTime * 100) * 10) / 10;

    const aiChangePercentage = previousWeekAI === 0 ? 0
      : Math.round(((currentWeekAI - previousWeekAI) / previousWeekAI * 100) * 10) / 10;

    // Format mean time
    const hours = Math.floor(currentWeekMeanTime / 60);
    const minutes = currentWeekMeanTime % 60;
    const formattedTime = `${hours}h ${minutes}m`;

    const analyticsData = {
      activeIncidents: {
        count: currentWeekActive,
        changePercentage: activeChangePercentage
      },
      meanTimeToResolve: {
        time: formattedTime,
        changePercentage: timeChangePercentage
      },
      serviceHealth: {
        count: `${operationalCount}/${services ? services.length : 0}`,
        description: issues || 'All services operational'
      },
      aiResolutions: {
        count: currentWeekAI,
        changePercentage: aiChangePercentage
      }
    };

    log('Successfully generated dashboard analytics response.')
    res.json(analyticsData);
  } catch (err) {
    log(`Error fetching dashboard analytics: ${err.message}`);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// In Vercel Serverless Functions, you don't explicitly listen on a port.
// The function is exported and handled by the Vercel platform.
// module.exports = app; // This line is typically used for Vercel

// For local development or testing outside Vercel, you might keep the listen part
// but it should not be active when deployed to Vercel.
// The standard Vercel Node.js runtime expects an exported function or app.
// Let's export the app for Vercel.
module.exports = app;
