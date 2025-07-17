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

    if (memoText.length > 20000) {
      return res.status(400).json({
        error: {
          message: 'Memo text is too long. Maximum length is 20,000 characters.',
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

// POST /api/claims/verify
router.post('/verify', async (req, res, next) => {
  try {
    const { claimText, memoText, companyType, claimId } = req.body;

    // Validate input
    if (!claimText || typeof claimText !== 'string') {
      return res.status(400).json({
        error: {
          message: 'Invalid request: claimText is required and must be a string',
          status: 400
        }
      });
    }

    if (!memoText || typeof memoText !== 'string') {
      return res.status(400).json({
        error: {
          message: 'Invalid request: memoText is required and must be a string',
          status: 400
        }
      });
    }

    if (!companyType || !['external', 'internal'].includes(companyType)) {
      return res.status(400).json({
        error: {
          message: 'Invalid request: companyType must be either "external" or "internal"',
          status: 400
        }
      });
    }

    if (!claimId || typeof claimId !== 'string') {
      return res.status(400).json({
        error: {
          message: 'Invalid request: claimId is required and must be a string',
          status: 400
        }
      });
    }

    // Log request
    console.log(`Processing claim verification request - Claim ID: ${claimId}, Company Type: ${companyType}`);

    const startTime = Date.now();

    // Step 1: Preprocess the claim with Groq for context
    const preprocessedData = await openRouterClient.preprocessClaimForSearch(claimText, memoText, companyType);

    // Step 2: Verify the claim with Perplexity
    const verificationResult = await openRouterClient.verifyClaimWithPerplexity(preprocessedData);

    const processingTime = Date.now() - startTime;

    // Log success
    console.log(`Successfully verified claim ${claimId} in ${processingTime}ms - Result: ${verificationResult.status}`);

    const responseData = {
      claimId,
      verificationResult: {
        ...verificationResult,
        searchPrompt: preprocessedData.perplexityPrompt, // Include the actual prompt sent
        timestamp: new Date().toISOString()
      },
      processingTime
    };

    // Send response
    res.json(responseData);

  } catch (error) {
    // Pass error to error handler middleware
    next(error);
  }
});

// GET /api/claims/sample
router.get('/sample', (req, res) => {
  const sampleMemo = `Investment Rationale

Robodog – Harry presents a time-sensitive opportunity to establish a leading position in Japan’s industrial robotics market by deploying rugged, autonomous quadrupedal robots for security, construction, and infrastructure operations. The venture leverages Mitsubishi Corporation’s (MC) unique ecosystem—subsidiaries, customer relationships, and capital—to accelerate validation, adoption, and scaling in sectors facing acute labor shortages and rising safety demands. Through a joint venture with Ghost Robotics, Robodog – Harry gains access to military-grade technology and a proven hardware platform, enabling rapid market entry and recurring revenue via Robotics-as-a-Service (RaaS). The initial phase focuses on pilot deployments within MC Group companies, with a clear path to external commercialization and global distribution. The business model targets positive ROI for customers, scalable recurring revenue, and strategic capability development for MC, while addressing key risks through staged validation and partnership-driven execution.

Market Opportunity

Market Size and Growth





Total Addressable Market (TAM): $1.5B (2024), projected to reach $6.2B by 2033 (CAGR 17.2%) for quadruped robots in security, construction, and industrial O&M [Source: Market Research].



Serviceable Addressable Market (SAM): $1.2B–$1.5B (Japan, 2026); $3.0B–$3.5B (global, 2026) [Source: Market Research].



Serviceable Obtainable Market (SOM): $60M–$140M annual revenue by 2029 (2–4% global SAM), based on projected unit sales and RaaS subscriptions [Source: Market Research].



Growth Drivers: Structural labor shortages, safety/compliance mandates, and proven ROI from automation underpin sustained demand, especially in Japan and Asia-Pacific [Source: Market Research].

Market Dynamics





Adoption Stage: Early adopter phase in commercial and government sectors; mainstreaming expected as costs decline and use cases mature.



Customer Segments: Security firms, construction companies, infrastructure operators, and government agencies (e.g., Ministry of Defense) [Source: GTM and Partners].



Barriers to Entry: High initial costs, integration complexity, and regulatory requirements; mitigated by RaaS model and MC’s internal channels [Source: Market Research].

Product and Technology

Solution Overview





Platform: Ghost Robotics Vision60/Spirit—rugged, modular quadrupedal robots (IP67, -40°C to 60°C, 180 min battery, 10kg payload) [Source: Product and Technology].



Functionality: Autonomous security patrols, inspection, hazardous environment monitoring, and data collection, with real-time cloud dashboards and enterprise system integration (e.g., SAP, IBM Maximo) [Source: Product and Technology].



Differentiation: Superior environmental resilience, modularity, and proven field deployments (1,000+ units globally, primarily government/military) [Source: Product and Technology].



Innovation: Open architecture enables rapid adaptation to new missions and payloads; RaaS model lowers adoption barriers [Source: Product and Technology].

Technical Feasibility





Readiness: Commercially available, field-proven hardware; integration with MC Group sites and enterprise systems planned for pilot phase [Source: Product and Technology].



Risks: Integration with legacy IT, autonomy in complex environments, and hardware reliability under continuous use; staged pilots and modular design mitigate these risks [Source: Product and Technology].

Competitive Positioning

Competitive Landscape







Competitor



Units Deployed



Price/Unit



Focus Sectors



Key Strengths



Weaknesses





Boston Dynamics Spot



1,500+



$80k+



Inspection, Security



Brand, autonomy, integrations



High price, limited Japan





Ghost Robotics



1,000+



$165k+



Military, Industrial



Ruggedness, MC JV



Supplier risk





ANYbotics ANYmal



100+



$850k



Energy, Utilities



Autonomy, inspection



High price, low volume





Unitree B2



N/A



$128k



R&D, Industrial



Price, speed



Low brand, support





Robodog – Harry



0 (pre-launch)



$250–400k/unit*



Security, Construction



MC access, RaaS, localization



No product yet

*Via lease/RaaS, annualized at $50–80k [Source: Competitor Analysis, Revenue Model]





Moats: MC’s distribution, pilot access, and brand trust in Japan are not easily replicable by global competitors [Source: Competitor Analysis].



Risks: Incumbent expansion (Boston Dynamics, Unitree), supplier dependency (Ghost Robotics), and price competition; rapid execution and ecosystem leverage are critical [Source: Competitor Analysis].

Business Model and Revenue

Monetization Strategy





Primary Revenue Streams: Direct sales ($250–400k/unit), RaaS/operating leases ($3,000–$7,000/month), and licensing royalties from global distribution [Source: Revenue Model].



Secondary Revenue Streams: Maintenance, software/data analytics, integration services [Source: Revenue Model].



Unit Economics: Positive ROI for customers (e.g., $84,700/year labor savings per construction site), with gross margins of 20–40% (hardware) and 40–60% (RaaS/services) [Source: Revenue Model, Financial Modelling].



Scalability: Recurring RaaS revenue and global distribution support long-term growth; gross profit targets of $2.4M (JFY26), $18.4M (JFY30), $100M (JFY40) [Source: Revenue Model, Financial Modelling].

Validation and Risks





Validation: Paid pilots, conversion rates, and customer willingness-to-pay are key metrics; failure to secure paid pilots or positive ROI within 6–12 months is a kill criterion [Source: Revenue Model].



Dependencies: Reliance on Ghost Robotics for hardware, customer concentration in early years, and market adoption risk in civil sectors [Source: Revenue Model].

Go-to-Market and Execution

GTM Strategy





Initial Focus: Security and construction sectors in Japan, leveraging MC Group subsidiaries for pilot deployments and rapid feedback [Source: GTM and Partners].



Channels: Direct sales to MC subsidiaries, channel partners for broader market access, and RaaS model to reduce upfront costs [Source: GTM and Partners].



Partnerships: JV with Ghost Robotics (technology), integration with digital twin/data platforms (iXs, NEC), and channel partners for scaling [Source: GTM and Partners].



Milestones: ≥5 pilot deployments in 12 months, ≥60% pilot-to-commercial conversion, ≥$80,000/year labor savings per site, NPS ≥50 [Source: GTM and Partners].

Execution Plan





Phase 1 (0–6 months): PoC demonstrations, pilot agreements with MC subsidiaries, structured user feedback [Source: Operating Metrics].



Phase 2 (6–18 months): Multi-site pilots, integration with enterprise systems, iteration on software and support [Source: Operating Metrics].



Phase 3 (18–36 months): Broader rollout, RaaS scaling, advanced analytics and digital twin integration [Source: Product and Technology, Operating Metrics].

Team and Organizational Capability





Core Team: Three senior leaders—Issei Shinohara (corporate/defense), Reo Tokimasa (dual-use tech, business development), Jim Myrick (AI/robotics entrepreneur) [Source: Team and Talents].



Strengths: Deep corporate navigation, entrepreneurial track record, access to MC’s ecosystem, and rapid learning orientation [Source: Team and Talents].



Gaps: No dedicated robotics engineering lead or CTO; limited in-house product management for scaling RaaS [Source: Team and Talents].



Talent Plan: Immediate recruitment of robotics engineering leadership, leveraging MC’s internal mobility and external partnerships for technical and operational scaling [Source: Team and Talents].

Financial Overview

Initial Phase Budget







Category



Amount (USD)



Notes





Prototype Acquisition (Vision60)



$400,000/unit



5-year hardware, payload, maintenance





Prototype Acquisition (Spirit)



$250,000/unit



Lower-cost, less demanding environments





Personnel (core team)



30–50% FTE, 6 mo



Project/technical leads, mentor/advisor





Pilot Operations



Not itemized



Site costs, logistics, insurance





R&D/Integration Support



Not itemized



Software, data management, dashboards





Total Initial Funding Request: $400,000–$650,000 for hardware and pilot costs, plus internal personnel and site access [Source: Financial Modelling].



Objectives: Validate operational effectiveness, ROI, and integration in real-world MC subsidiary environments; inform scaling and business model refinement [Source: Financial Modelling].



Future Funding: Contingent on pilot success, with additional resources for broader rollout, R&D, and external commercialization [Source: Financial Modelling].

Value to Corporation





Operational Efficiency: Projected $84,700/year labor savings per construction site; positive ROI even with partial automation [Source: Financial Modelling].



Strategic Capability: Establishes MC as a robotics innovation hub, enabling expansion into new verticals and supporting digital transformation [Source: Financial Modelling].



External Revenue: Potential to capture royalties and RaaS revenue in a $7.2B global market, with gross profit targets of $18.4M/year by 2030 [Source: Financial Modelling].

Legal, IP, and Regulatory Considerations





IP Position: Current focus on commercialization and integration of Ghost Robotics’ technology; future IP creation possible with in-house R&D and software development [Source: Legal and IP].



Third-Party Dependencies: Reliance on Ghost Robotics for hardware and software; need for careful review of licensing, data rights, and integration agreements [Source: Legal and IP].



Data Privacy: Operational data collection (footage, sensor scans) requires alignment with corporate data governance and privacy regulations; no explicit plan yet [Source: Legal and IP].



Regulatory Landscape: Security and defense deployments require government approvals; expansion into regulated sectors (e.g., critical infrastructure, healthcare) will necessitate compliance planning [Source: Legal and IP].



Next Steps: Early consultation with corporate Legal, IP, Data Governance, and Compliance teams is recommended as the venture evolves [Source: Legal and IP].

Key Risks and Mitigations





Supplier Dependency: Single-source risk with Ghost Robotics; JV structure and partnership management are critical [Source: Competitor Analysis, Legal and IP].



Technical Integration: Uncertainty around integration with legacy IT and operational reliability; staged pilots and modular design mitigate risk [Source: Product and Technology, Operating Metrics].



Market Adoption: High initial costs and resistance to automation in traditional sectors; RaaS model and MC’s internal channels lower barriers [Source: Market Research, Revenue Model].



Talent Gaps: Lack of in-house robotics engineering leadership; immediate recruitment and external partnerships planned [Source: Team and Talents].



Regulatory/Compliance: Evolving standards and public perception; ongoing engagement with regulators and internal compliance teams required [Source: Legal and IP].

Summary Table: Critical Metrics and Milestones







Metric/Objective



Target/Status



Source





Initial Funding Request



$400k–$650k



Financial Modelling





Pilot Deployments (Year 1)



≥5



GTM and Partners





Pilot-to-Commercial Conversion



≥60%



GTM and Partners





Customer ROI (per site)



≥$80,000/year



Revenue Model, Financial Mod.





Gross Profit (2030/2040)



$18.4M/$100M per year



Revenue Model, Financial Mod.





Market Size (2033)



$6.2B (global quadrupeds)



Market Research





Core Team Size (initial phase)



3 senior leaders/mentors



Team and Talents





Technical Validation (pilot phase)



≥95% mission completion, <5% downtime



Product and Technology

Conclusion

Robodog – Harry offers MC a differentiated, high-potential entry into the rapidly growing industrial robotics market, with a clear path to internal value creation and external revenue. The venture’s success depends on rapid pilot execution, effective partnership management, and staged de-risking of technical, market, and organizational uncertainties. The initial funding request is modest relative to the opportunity size, with clear milestones gating further investment. Early validation within MC’s ecosystem, combined with robust execution and talent development, positions Robodog – Harry to capture a defensible share of a $6B+ market and establish MC as a leader in robotics-enabled digital transformation.`;

  res.json({
    sampleMemo,
    description: 'Sample investment memo for testing the fact-checking system'
  });
});

module.exports = router; 