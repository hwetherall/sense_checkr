const axios = require('axios');

class OpenRouterClient {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseURL = 'https://openrouter.ai/api/v1';
    this.model = 'openai/gpt-4o-mini';
    this.maxRetries = 3;
    this.retryDelay = 1000; // Base delay in ms
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async makeRequest(messages, temperature = 0.7) {
    const config = {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
        'X-Title': 'Sense Checkr'
      }
    };

    const data = {
      model: this.model,
      messages,
      temperature,
      max_tokens: 4000
    };

    let lastError;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        console.log(`OpenRouter API call attempt ${attempt + 1}/${this.maxRetries}`);
        const response = await axios.post(
          `${this.baseURL}/chat/completions`,
          data,
          config
        );
        return response.data;
      } catch (error) {
        lastError = error;
        console.error(`OpenRouter API error (attempt ${attempt + 1}):`, error.message);
        
        // Don't retry on client errors (4xx)
        if (error.response && error.response.status < 500) {
          throw error;
        }
        
        // Wait before retrying with exponential backoff
        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          console.log(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }

  async extractClaims(memoText) {
    const systemPrompt = `You are a professional financial analyst assistant specializing in fact-checking investment memos. Your task is to extract factual claims from investment memos and categorize them.

Extract claims that are:
1. Specific, verifiable statements (numbers, dates, percentages, market sizes, etc.)
2. Assumptions or projections stated as facts
3. Company performance metrics
4. Market positioning statements

For each claim, provide:
- text: The exact claim as stated in the memo
- category: One of 'financial', 'market', 'operational', or 'other'
- confidence: Your confidence in the categorization (1-10)
- range: Character positions [start, end] where the claim appears

Return a JSON array of claims. Be thorough but avoid duplicates.`;

    const userPrompt = `Extract all factual claims from this investment memo:\n\n${memoText}`;

    try {
      const startTime = Date.now();
      const response = await this.makeRequest([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], 0.3); // Lower temperature for more consistent extraction

      const processingTime = Date.now() - startTime;
      
      // Parse the response
      const content = response.choices[0].message.content;
      let claims;
      
      try {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          claims = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON array found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse claims:', parseError);
        throw new Error('Failed to parse AI response');
      }

      // Add IDs and default status to claims
      claims = claims.map((claim, index) => ({
        id: `claim-${Date.now()}-${index}`,
        status: 'unverified',
        ...claim,
        // Ensure range is provided, default to [0, 0] if not
        range: claim.range || [0, 0]
      }));

      return {
        claims,
        processingTime
      };
    } catch (error) {
      console.error('Error extracting claims:', error);
      throw error;
    }
  }
}

module.exports = new OpenRouterClient(); 