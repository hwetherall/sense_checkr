const axios = require('axios');

/**
 * Validates a URL by making an HTTP request with retry logic
 * @param {string} url - The URL to validate
 * @param {number} maxRetries - Maximum number of retries (default: 2)
 * @param {number} timeout - Request timeout in milliseconds (default: 10000)
 * @returns {Promise<Object>} Validation result object
 */
async function validateLink(url, maxRetries = 2, timeout = 10000) {
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
        return {
          validationStatus: 'working',
          httpStatus: response.status,
          validationError: null,
          retriesUsed: attempt
        };
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
 * @param {Array<Object>} links - Array of link objects with url property
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
        const validation = await validateLink(link.url);
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

    // Small delay between batches to be respectful
    if (i + concurrency < links.length) {
      await sleep(500);
    }
  }

  const workingCount = results.filter(r => r.validationStatus === 'working').length;
  const brokenCount = results.filter(r => r.validationStatus === 'broken').length;
  const restrictedCount = results.filter(r => r.validationStatus === 'restricted').length;
  const errorCount = results.filter(r => r.validationStatus === 'error').length;

  console.log(`Link validation complete: ${workingCount} working, ${brokenCount} broken, ${restrictedCount} restricted, ${errorCount} errors`);

  return results;
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
  validateLinks
}; 