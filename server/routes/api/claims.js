const express = require('express');
const router = express.Router();
const openRouterClient = require('../../utils/openrouter');

// POST /api/claims/extract
router.post('/extract', async (req, res, next) => {
  try {
    const { memoText } = req.body;

    // Validate input
    if (!memoText || typeof memoText !== 'string') {
      return res.status(400).json({
        error: {
          message: 'Invalid request: memoText is required and must be a string',
          status: 400
        }
      });
    }

    // Check memo length
    if (memoText.length < 50) {
      return res.status(400).json({
        error: {
          message: 'Memo text is too short. Please provide at least 50 characters.',
          status: 400
        }
      });
    }

    if (memoText.length > 10000) {
      return res.status(400).json({
        error: {
          message: 'Memo text is too long. Maximum length is 10,000 characters.',
          status: 400
        }
      });
    }

    // Log request
    console.log(`Processing memo extraction request - Length: ${memoText.length} characters`);

    // Extract claims using OpenRouter
    const result = await openRouterClient.extractClaims(memoText);

    // Log success
    console.log(`Successfully extracted ${result.claims.length} claims in ${result.processingTime}ms`);

    // Send response
    res.json({
      claims: result.claims,
      processingTime: result.processingTime,
      memoLength: memoText.length,
      claimCount: result.claims.length
    });

  } catch (error) {
    // Pass error to error handler middleware
    next(error);
  }
});

// GET /api/claims/sample
router.get('/sample', (req, res) => {
  const sampleMemo = `TechFlow Solutions represents a compelling investment opportunity in the enterprise workflow automation sector. The company achieved $47.2M in Annual Recurring Revenue (ARR) as of Q3 2024, demonstrating robust 156% year-over-year growth.

The global market for workflow automation software is valued at $31.4B, with analysts projecting a compound annual growth rate of 28% through 2028. TechFlow has successfully captured 1,847 enterprise clients, maintaining an impressive average contract value of $25,600 annually.

Financial performance metrics show strong unit economics: gross margins have expanded to 84% in the latest quarter, up from 78% in Q2 2024. The company maintains a healthy net revenue retention rate of 118%, while monthly logo churn has decreased to 1.8%, substantially below the SaaS industry benchmark of 3-5%.

The competitive landscape includes established players like ServiceNow and newer entrants such as Zapier. TechFlow differentiates through its AI-powered process discovery engine, which reduces implementation time by 65% compared to traditional solutions. Customer satisfaction scores average 4.7/5.0, with 89% of users reporting significant productivity improvements.

Looking forward, management projects reaching $100M ARR by Q4 2025, supported by a robust product roadmap including enhanced AI capabilities and vertical-specific solutions for healthcare and financial services. The company plans to expand its sales team from 45 to 120 representatives over the next 18 months.`;

  res.json({
    sampleMemo,
    description: 'Sample investment memo for testing the fact-checking system'
  });
});

module.exports = router; 