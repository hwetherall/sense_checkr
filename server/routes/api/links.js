const express = require('express');
const { validateLinks } = require('../../utils/linkValidator');
const router = express.Router();

// POST /api/links/validate - Validate links
router.post('/validate', async (req, res, next) => {
  try {
    const { links } = req.body;

    // Validate input
    if (!links || !Array.isArray(links)) {
      return res.status(400).json({
        error: {
          message: 'Invalid request: links is required and must be an array',
          status: 400
        }
      });
    }

    if (links.length === 0) {
      return res.json({
        validatedLinks: [],
        validationSummary: {
          total: 0,
          working: 0,
          broken: 0,
          restricted: 0,
          error: 0
        }
      });
    }

    // Validate maximum number of links (prevent abuse)
    if (links.length > 100) {
      return res.status(400).json({
        error: {
          message: 'Too many links: maximum 100 links allowed per request',
          status: 400
        }
      });
    }

    console.log(`Starting validation of ${links.length} links`);
    const startTime = Date.now();

    // Validate links with retry logic
    const validatedLinks = await validateLinks(links, 5); // 5 concurrent requests

    const processingTime = Date.now() - startTime;

    // Generate summary
    const validationSummary = {
      total: validatedLinks.length,
      working: validatedLinks.filter(l => l.validationStatus === 'working').length,
      broken: validatedLinks.filter(l => l.validationStatus === 'broken').length,
      restricted: validatedLinks.filter(l => l.validationStatus === 'restricted').length,
      error: validatedLinks.filter(l => l.validationStatus === 'error').length
    };

    console.log(`Link validation completed in ${processingTime}ms:`, validationSummary);

    res.json({
      validatedLinks,
      validationSummary,
      processingTime
    });

  } catch (error) {
    console.error('Error in link validation endpoint:', error);
    next(error);
  }
});

module.exports = router; 