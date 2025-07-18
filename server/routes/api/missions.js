const express = require('express');
const router = express.Router();
const openRouterClient = require('../../utils/openrouter');

// In-memory storage for missions (in production, use a database)
const missions = new Map();

// Helper function to generate IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// GET /api/missions - Get all missions
router.get('/', (req, res) => {
  try {
    const allMissions = Array.from(missions.values()).map(mission => ({
      ...mission,
      chapters: mission.chapters.map(ch => ({
        ...ch,
        jsonContent: ch.jsonContent.substring(0, 100) + '...' // Truncate for list view
      }))
    }));
    res.json({ missions: allMissions });
  } catch (error) {
    console.error('Error fetching missions:', error);
    res.status(500).json({ error: 'Failed to fetch missions' });
  }
});

// GET /api/missions/:id - Get specific mission with full details
router.get('/:id', (req, res) => {
  try {
    const mission = missions.get(req.params.id);
    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }
    res.json({ mission });
  } catch (error) {
    console.error('Error fetching mission:', error);
    res.status(500).json({ error: 'Failed to fetch mission' });
  }
});

// POST /api/missions - Create new mission
router.post('/', (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Mission name is required' });
    }

    const missionId = generateId();
    const mission = {
      id: missionId,
      name,
      description: description || '',
      chapters: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      totalLinks: 0,
      verifiedLinks: 0
    };

    missions.set(missionId, mission);
    res.json({ mission });
  } catch (error) {
    console.error('Error creating mission:', error);
    res.status(500).json({ error: 'Failed to create mission' });
  }
});

// POST /api/missions/:id/chapters - Add chapter to mission
router.post('/:id/chapters', (req, res) => {
  try {
    const mission = missions.get(req.params.id);
    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    const { name, jsonContent } = req.body;
    
    if (!name || !jsonContent) {
      return res.status(400).json({ error: 'Chapter name and JSON content are required' });
    }

    // Validate JSON
    try {
      JSON.parse(jsonContent);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON content' });
    }

    const chapterId = generateId();
    const chapter = {
      id: chapterId,
      missionId: mission.id,
      name,
      order: mission.chapters.length + 1,
      jsonContent,
      links: [],
      status: 'pending',
      processedAt: null,
      processingTime: null,
      error: null,
      summary: null
    };

    mission.chapters.push(chapter);
    mission.updatedAt = new Date().toISOString();
    
    res.json({ chapter });
  } catch (error) {
    console.error('Error adding chapter:', error);
    res.status(500).json({ error: 'Failed to add chapter' });
  }
});

// POST /api/missions/:missionId/chapters/:chapterId/process - Process a chapter
router.post('/:missionId/chapters/:chapterId/process', async (req, res) => {
  try {
    const mission = missions.get(req.params.missionId);
    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    const chapter = mission.chapters.find(ch => ch.id === req.params.chapterId);
    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    // Update chapter status
    chapter.status = 'processing';
    const startTime = Date.now();

    try {
      // Extract links from JSON content
      const links = await extractLinksFromJson(chapter.jsonContent, chapter.id);
      
      // Update chapter with results
      chapter.links = links;
      chapter.status = 'completed';
      chapter.processedAt = new Date().toISOString();
      chapter.processingTime = Date.now() - startTime;
      
      // Generate chapter summary
      chapter.summary = generateChapterSummary(links);
      
      // Update mission totals
      updateMissionTotals(mission);
      
      res.json({ 
        chapter,
        processingTime: chapter.processingTime 
      });
      
    } catch (error) {
      chapter.status = 'error';
      chapter.error = error.message;
      chapter.processingTime = Date.now() - startTime;
      
      console.error('Error processing chapter:', error);
      res.status(500).json({ error: 'Failed to process chapter' });
    }
    
  } catch (error) {
    console.error('Error in chapter processing:', error);
    res.status(500).json({ error: 'Failed to process chapter' });
  }
});

// POST /api/missions/:missionId/chapters/:chapterId/links/:linkId/verify - Update link status
router.post('/:missionId/chapters/:chapterId/links/:linkId/verify', (req, res) => {
  try {
    const mission = missions.get(req.params.missionId);
    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    const chapter = mission.chapters.find(ch => ch.id === req.params.chapterId);
    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    const link = chapter.links.find(l => l.id === req.params.linkId);
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const { status } = req.body;
    if (!['valid', 'invalid', 'suspicious', 'unverified'].includes(status)) {
      return res.status(400).json({ error: 'Invalid link status' });
    }

    // Update link status
    link.status = status;
    
    // Update chapter summary
    chapter.summary = generateChapterSummary(chapter.links);
    
    // Update mission totals
    updateMissionTotals(mission);
    
    res.json({ link, chapter: { id: chapter.id, summary: chapter.summary } });
    
  } catch (error) {
    console.error('Error updating link status:', error);
    res.status(500).json({ error: 'Failed to update link status' });
  }
});

// GET /api/missions/:id/export - Export mission summary
router.get('/:id/export', (req, res) => {
  try {
    const mission = missions.get(req.params.id);
    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    const summary = generateMissionSummary(mission);
    res.json({ summary });
    
  } catch (error) {
    console.error('Error exporting mission:', error);
    res.status(500).json({ error: 'Failed to export mission' });
  }
});

// Helper functions
async function extractLinksFromJson(jsonContent, chapterId) {
  try {
    const jsonData = JSON.parse(jsonContent);
    const jsonText = JSON.stringify(jsonData, null, 2);
    
    // Helper function to clean URLs by removing trailing punctuation
    const cleanUrl = (url) => {
      // Remove trailing punctuation characters that commonly appear after URLs
      return url.replace(/[.,;:!?\]}>)\-_]+$/, '');
    };
    
    // Extract links using improved regex patterns
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const urlRegex = /https?:\/\/[^\s\]},;"'<>()]+/g;
    const links = [];
    const seenUrls = new Set();
    
    // Extract markdown-formatted links
    let match;
    while ((match = markdownLinkRegex.exec(jsonText)) !== null) {
      const url = cleanUrl(match[2]);
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        links.push({
          id: `${chapterId}-link-${links.length + 1}`,
          text: match[1],
          url: url,
          status: 'unverified'
        });
      }
    }
    
    // Extract plain URLs
    while ((match = urlRegex.exec(jsonText)) !== null) {
      const url = cleanUrl(match[0]);
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        links.push({
          id: `${chapterId}-link-${links.length + 1}`,
          text: `URL: ${url.substring(0, 50)}...`,
          url: url,
          status: 'unverified'
        });
      }
    }
    
    return links;
  } catch (error) {
    console.error('Error extracting links from JSON:', error);
    throw new Error('Failed to extract links from JSON content');
  }
}

function generateChapterSummary(links) {
  const summary = {
    totalLinks: links.length,
    validLinks: links.filter(l => l.status === 'valid').length,
    invalidLinks: links.filter(l => l.status === 'invalid').length,
    suspiciousLinks: links.filter(l => l.status === 'suspicious').length,
    unverifiedLinks: links.filter(l => l.status === 'unverified').length,
    keyFindings: []
  };
  
  // Add key findings based on link analysis
  if (summary.invalidLinks > 0) {
    summary.keyFindings.push(`Found ${summary.invalidLinks} broken link${summary.invalidLinks > 1 ? 's' : ''}`);
  }
  if (summary.suspiciousLinks > 0) {
    summary.keyFindings.push(`Detected ${summary.suspiciousLinks} suspicious source${summary.suspiciousLinks > 1 ? 's' : ''}`);
  }
  if (summary.validLinks === summary.totalLinks && summary.totalLinks > 0) {
    summary.keyFindings.push('All links verified successfully');
  }
  
  return summary;
}

function updateMissionTotals(mission) {
  let totalLinks = 0;
  let verifiedLinks = 0;
  
  mission.chapters.forEach(chapter => {
    if (chapter.links) {
      totalLinks += chapter.links.length;
      verifiedLinks += chapter.links.filter(l => l.status !== 'unverified').length;
    }
  });
  
  mission.totalLinks = totalLinks;
  mission.verifiedLinks = verifiedLinks;
  mission.updatedAt = new Date().toISOString();
  
  // Update mission status
  const allChaptersCompleted = mission.chapters.every(ch => ch.status === 'completed');
  const allLinksVerified = totalLinks > 0 && verifiedLinks === totalLinks;
  
  if (allChaptersCompleted && allLinksVerified) {
    mission.status = 'completed';
  }
}

function generateMissionSummary(mission) {
  const linksByStatus = {
    valid: 0,
    invalid: 0,
    suspicious: 0,
    unverified: 0
  };
  
  mission.chapters.forEach(chapter => {
    if (chapter.links) {
      chapter.links.forEach(link => {
        linksByStatus[link.status]++;
      });
    }
  });
  
  return {
    missionId: mission.id,
    missionName: mission.name,
    totalChapters: mission.chapters.length,
    completedChapters: mission.chapters.filter(ch => ch.status === 'completed').length,
    totalLinks: mission.totalLinks,
    linksByStatus,
    chapterSummaries: mission.chapters.map(ch => ch.summary || generateChapterSummary(ch.links || [])),
    exportDate: new Date().toISOString()
  };
}

module.exports = router; 