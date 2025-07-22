const axios = require('axios');
const scrapingbee = require('scrapingbee');
const openrouter = require('./openrouter');

/**
 * Validates a URL by making an HTTP request with retry logic
 * @param {string} url - The URL to validate
 * @param {number} maxRetries - Maximum number of retries (default: 2)
 * @param {number} timeout - Request timeout in milliseconds (default: 10000)
 * @param {string} claim - Optional claim to verify against content (default: null)
 * @returns {Promise<Object>} Validation result object
 */
async function validateLink(url, maxRetries = 2, timeout = 10000, claim = null) {
  let lastError = null;
  let lastStatus = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Validating ${url} (attempt ${attempt + 1}/${maxRetries + 1})`);
      
      const response = await axios.head(url, {
        timeout: timeout,
        headers: {
          'User-Agent': 'SenseCheckr-LinkValidator/1.0 (Link verification bot)',
          'Accept': '*/*',
        },
        maxRedirects: 5, // Follow redirects
        validateStatus: () => true, // Don't reject on HTTP error codes - we want to check them
      });

      lastStatus = response.status;

      // Classify response based on status code
      if (response.status >= 200 && response.status < 300) {
        let result = {
          validationStatus: 'working',
          httpStatus: response.status,
          validationError: null,
          retriesUsed: attempt
        };

        // If claim is provided, scrape content and verify claim
        if (claim) {
          try {
            console.log(`Link is working, scraping content and verifying claim...`);
            const scrapedContent = await scrapeContent(url);
            const verificationResult = await verifyClaimAgainstContent(scrapedContent, claim);
            
            result.scrapedContent = scrapedContent;
            result.claimScore = verificationResult.score;
            console.log(`Claim verification score: ${verificationResult.score}/100`);
          } catch (scrapeError) {
            console.error(`Failed to scrape/verify content for ${url}:`, scrapeError.message);
            result.scrapeError = scrapeError.message;
            result.claimScore = null;
          }
        }

        return result;
      } else if (response.status === 401) {
        return {
          validationStatus: 'restricted',
          httpStatus: response.status,
          validationError: 'Authentication required (401)',
          retriesUsed: attempt
        };
      } else if (response.status === 403) {
        return {
          validationStatus: 'restricted',
          httpStatus: response.status,
          validationError: 'Access forbidden (403)',
          retriesUsed: attempt
        };
      } else if (response.status === 429) {
        return {
          validationStatus: 'restricted',
          httpStatus: response.status,
          validationError: 'Rate limited (429)',
          retriesUsed: attempt
        };
      } else if (response.status === 404 || response.status >= 500) {
        // These are the errors we retry on
        lastError = `HTTP ${response.status}`;
        if (attempt < maxRetries) {
          console.log(`Got ${response.status}, retrying... (${attempt + 1}/${maxRetries})`);
          await sleep(1000 * (attempt + 1)); // Exponential backoff: 1s, 2s, 3s
          continue;
        }
        // All retries exhausted
        return {
          validationStatus: 'broken',
          httpStatus: response.status,
          validationError: `HTTP ${response.status} after ${maxRetries + 1} attempts`,
          retriesUsed: attempt
        };
      } else {
        // Other HTTP errors (4xx except 403/404)
        return {
          validationStatus: 'broken',
          httpStatus: response.status,
          validationError: `HTTP ${response.status}`,
          retriesUsed: attempt
        };
      }

    } catch (error) {
      lastError = error.message;
      lastStatus = error.response?.status || null;

      // Check if it's a network error that we should retry
      const isRetryableError = 
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNRESET' ||
        error.message.includes('timeout') ||
        error.message.includes('ECONNABORTED');

      if (isRetryableError && attempt < maxRetries) {
        console.log(`Network error (${error.message}), retrying... (${attempt + 1}/${maxRetries})`);
        await sleep(1000 * (attempt + 1)); // Exponential backoff
        continue;
      }

      // All retries exhausted or non-retryable error
      return {
        validationStatus: 'error',
        httpStatus: lastStatus,
        validationError: `Network error: ${error.message}`,
        retriesUsed: attempt
      };
    }
  }

  // Fallback (shouldn't reach here)
  return {
    validationStatus: 'error',
    httpStatus: lastStatus,
    validationError: lastError || 'Unknown error',
    retriesUsed: maxRetries
  };
}

/**
 * Validates multiple links concurrently with rate limiting
 * @param {Array<Object>} links - Array of link objects with url and supportedClaim properties
 * @param {number} concurrency - Number of concurrent requests (default: 5)
 * @returns {Promise<Array>} Array of validation results
 */
async function validateLinks(links, concurrency = 5) {
  console.log(`Starting validation of ${links.length} links with concurrency ${concurrency}`);
  
  const results = [];
  
  // Process links in batches to avoid overwhelming servers
  for (let i = 0; i < links.length; i += concurrency) {
    const batch = links.slice(i, i + concurrency);
    
    console.log(`Processing batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(links.length / concurrency)}`);
    
    const batchPromises = batch.map(async (link) => {
      try {
        const validation = await validateLink(link.url, 2, 10000, link.supportedClaim);
        return {
          ...link,
          ...validation
        };
      } catch (error) {
        console.error(`Failed to validate ${link.url}:`, error);
        return {
          ...link,
          validationStatus: 'error',
          httpStatus: null,
          validationError: `Validation failed: ${error.message}`,
          retriesUsed: 0
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  const workingCount = results.filter(r => r.validationStatus === 'working').length;
  const brokenCount = results.filter(r => r.validationStatus === 'broken').length;
  const restrictedCount = results.filter(r => r.validationStatus === 'restricted').length;
  const errorCount = results.filter(r => r.validationStatus === 'error').length;

  console.log(`Link validation complete: ${workingCount} working, ${brokenCount} broken, ${restrictedCount} restricted, ${errorCount} errors`);

  return results;
}

/**
 * Scrapes content from a URL using ScrapingBee API
 * @param {string} url - The URL to scrape
 * @returns {Promise<string>} Formatted content string
 */
async function scrapeContent(url) {
  try {
    console.log(`Scraping content from: ${url}`);
    
    const apiKey = process.env.SCRAPINGBEE_API_KEY;
    if (!apiKey) {
      throw new Error('SCRAPINGBEE_API_KEY environment variable not set');
    }

    const client = new scrapingbee.ScrapingBeeClient(apiKey);
    
    const response = await client.get({
      url: url,
      params: { 
        "extract_rules": {
          "title": "h1",
          "subtitle": "h2", 
          "content": {
            "selector": "p",
            "type": "list",
            "output": "text_relevant"
          }
        }
      },
    });

    if (response.status !== 200) {
      throw new Error(`Failed to scrape content from ${url} with status code ${response.status}`);
    }

    // ScrapingBee SDK should return parsed data directly when using extract_rules
    let data = response.data;
    
    // Check if data is a Buffer and convert to string, then parse JSON
    if (Buffer.isBuffer(data)) {
      try {
        const dataString = data.toString('utf8');
        data = JSON.parse(dataString);
      } catch (parseError) {
        console.error(`[${url}] Failed to parse ScrapingBee Buffer data:`, parseError);
        throw new Error(`ScrapingBee returned unparseable Buffer data: ${parseError.message}`);
      }
    }
    
    // Extract the scraped content from the parsed data
    const title = data.title || 'No title found';
    const subtitle = data.subtitle || 'No subtitle found';
    const content = Array.isArray(data.content) ? data.content.join('\n') : (data.content || 'No content found');

    // Format as requested
    const formattedContent = `Title: ${title}\nSubtitle: ${subtitle}\nContent: ${content}`;
    
    console.log(`[${url}] Successfully scraped content`);
    return formattedContent;

  } catch (error) {
    console.error(`Failed to scrape content from ${url}:`, error.message);
    throw new Error(`Content scraping failed: ${error.message}`);
  }
}

/**
 * Verifies how well link content supports a specific claim using LLM
 * @param {string} linkContent - The scraped content from the link
 * @param {string} claim - The claim to verify against the content
 * @returns {Promise<Object>} Score object with compatibility rating 0-100
 */
async function verifyClaimAgainstContent(linkContent, claim) {
  try {
    
    const systemPrompt = `You are an expert fact-checker. The claim to verify is affirmed to be from the provided content and we want to access if that is true or not. Your task is to analyze content and determine how well it supports a specific claim. Note that the content was extracted from a webpage and may include strings that are not relevant or part of the main content.

SCORING GUIDELINES:
- 100: Content directly confirms and strongly supports the claim with specific evidence
- 80-99: Content mostly supports the claim with good evidence, minor gaps
- 60-79: Content partially supports the claim but lacks some details or has minor contradictions
- 40-59: Content provides mixed evidence - some support, some contradiction
- 20-39: Content provides little support for the claim, mostly unrelated
- 1-19: Content contradicts or undermines the claim
- 0: Content completely contradicts the claim or is entirely unrelated

ANALYSIS APPROACH:
1. Compare the claim's specific details (numbers, dates, facts) with the article content
2. Look for direct confirmation, partial confirmation, or contradiction
3. Remember that the claim is affirmed to be from the source content, we want to access if that is true or not


RESPONSE FORMAT:
You must respond with ONLY a JSON object in this exact format:
{"score": <number between 0-100>}

No explanations, no additional text, just the JSON object.`;

    const userPrompt = `CLAIM TO VERIFY:
${claim}

ARTICLE CONTENT:
${linkContent}

Based on how well the article content supports this specific claim, provide your compatibility score as JSON.`;

    // Use the DeepSeek model specifically
    const response = await openrouter.makeRequest([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], 0.1, 'deepseek/deepseek-r1-distill-llama-70b'); // Low temperature for consistent scoring

    const content = response.choices[0].message.content.trim();
    console.log('Raw LLM response:', content);

    // Parse JSON response with proper error handling
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }

      const result = JSON.parse(jsonMatch[0]);
      
      // Validate the response format
      if (typeof result.score !== 'number') {
        throw new Error('Score is not a number');
      }

      if (result.score < 0 || result.score > 100) {
        throw new Error('Score is outside valid range (0-100)');
      }

      console.log(`Claim verification complete. Score: ${result.score}/100`);
      return result;

    } catch (parseError) {
      console.error('JSON parsing error:', parseError.message);
      console.error('Raw content:', content);
      throw new Error(`Malformed JSON response: ${parseError.message}`);
    }

  } catch (error) {
    console.error('Error verifying claim against content:', error.message);
    throw new Error(`Claim verification failed: ${error.message}`);
  }
}

/**
 * Sleep utility function
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  validateLink,
  validateLinks,
  scrapeContent,
  verifyClaimAgainstContent
}; 


