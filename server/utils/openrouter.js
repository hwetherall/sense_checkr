const axios = require('axios');

class OpenRouterClient {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseURL = 'https://openrouter.ai/api/v1';
    this.model = 'openai/gpt-4.1-mini';
    this.groqModel = 'meta-llama/llama-4-maverick-17b-128e-instruct';
    this.perplexityModel = 'perplexity/sonar-pro';
    this.maxRetries = 3;
    this.retryDelay = 1000; // Base delay in ms
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async makeRequest(messages, temperature = 0.7, model = null) {
    const config = {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
        'X-Title': 'Sense Checkr'
      }
    };

    const data = {
      model: model || this.model,
      messages,
      temperature,
      max_tokens: 4000
    };

    let lastError;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        console.log(`OpenRouter API call attempt ${attempt + 1}/${this.maxRetries} - Model: ${data.model}`);
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

  async preprocessClaimForSearch(claimText, memoContext, companyType) {
    const systemPrompt = `You are writing a research prompt for Perplexity to fact-check an investment memo claim. Your job is to give Perplexity enough context to provide a useful verification.

**CLAIM TO VERIFY:**
{claimText}

**MEMO CONTEXT:**
{memoText}

**COMPANY TYPE:** {companyType}
- external: Real company that exists publicly  
- internal: Internal corporate venture/project

**YOUR TASK:**
Write a single, well-contextualized prompt for Perplexity. Follow this pattern:

❌ BAD: "Is market size $13B?"
✅ GOOD: "I am analyzing the pet food market in Alberta, and have a claim that this market is worth $13B. How accurate is this claim based on current market data?"

❌ BAD: "Does TechFlow have $47M ARR?"  
✅ GOOD: "I'm evaluating TechFlow Solutions, a workflow automation company, and they claim $47.2M in Annual Recurring Revenue as of Q3 2024. Can you verify this revenue figure and any recent financial performance data?"

**IMPORTANT:**
- Include company name, industry, and specific context
- Mention if it's an internal venture vs external company
- Be specific about timeframes, numbers, and what exactly needs verification
- Ask for verification, not just information

Write only the prompt for Perplexity, nothing else.`;

    const userPrompt = `**CLAIM TO VERIFY:**
${claimText}

**MEMO CONTEXT:**
${memoContext}

**COMPANY TYPE:** ${companyType}`;

    try {
      const response = await this.makeRequest([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], 0.3, this.groqModel);

      const perplexityPrompt = response.choices[0].message.content.trim();
      
      return {
        perplexityPrompt,
        originalClaim: claimText,
        companyType
      };
    } catch (error) {
      console.error('Error preprocessing claim:', error);
      // Fallback: create a basic prompt if preprocessing fails
      const fallbackPrompt = `I need to verify this claim from an investment memo: "${claimText}". This is about ${companyType === 'internal' ? 'an internal corporate venture' : 'an external company'}. Can you help verify if this claim is accurate?`;
      return {
        perplexityPrompt: fallbackPrompt,
        originalClaim: claimText,
        companyType
      };
    }
  }

  async verifyClaimWithPerplexity(preprocessedData) {
    // Step 1: Send the prompt to Perplexity
    const perplexityPrompt = preprocessedData.perplexityPrompt;
    
    try {
      console.log('Sending to Perplexity:', perplexityPrompt);
      
      // Simple user message to Perplexity
      const response = await this.makeRequest([
        { role: 'user', content: perplexityPrompt }
      ], 0.3, this.perplexityModel);

      const perplexityResponse = response.choices[0].message.content;
      
      // Step 2: Process the response into structured format
      const processedResult = await this.processPerplexityResponse(
        perplexityResponse, 
        preprocessedData.originalClaim
      );
      
      // Step 3: Add the original searchPrompt to the result
      return {
        ...processedResult,
        searchPrompt: perplexityPrompt // Preserve the original prompt
      };
      
    } catch (error) {
      console.error('Error verifying claim with Perplexity:', error);
      throw error;
    }
  }

  async processPerplexityResponse(perplexityResponse, originalClaim) {
    const systemPrompt = `You are processing a fact-checking response from Perplexity. Extract and structure the information for display.

**ORIGINAL CLAIM:**
${originalClaim}

**PERPLEXITY RESPONSE:**
${perplexityResponse}

**YOUR TASK:**
Parse this response and return a JSON object with exactly this structure:

{
  "status": "verified_true" | "verified_false" | "partially_true" | "needs_context" | "cannot_find_answer",
  "reasoning": "2-3 sentence summary of why this verification status was chosen",
  "sources": ["array", "of", "source", "URLs", "found"],
  "searchQuery": "summary of what was actually searched for",
  "confidence": number from 1-10 based on source quality and recency
}

**VERIFICATION STATUS GUIDELINES:**
- verified_true: Multiple reliable sources confirm the claim
- verified_false: Reliable sources contradict the claim  
- partially_true: Some elements confirmed, others not or outdated
- needs_context: Information found but requires additional context
- cannot_find_answer: Insufficient reliable information available

**REASONING SHOULD:**
- Be concise but specific
- Mention key contradictions or confirmations
- Note if information is outdated

**SOURCES ARRAY:**
- Only include actual URLs found in the Perplexity response
- Max 3-4 most relevant sources
- Empty array if no good sources found

**CONFIDENCE SCORING:**
- 8-10: Multiple recent, authoritative sources
- 5-7: Some good sources but limited or older data
- 1-4: Weak sources or conflicting information

Return only valid JSON, no other text.`;

    const userPrompt = `Process this Perplexity response and return the structured JSON:

${perplexityResponse}`;

    try {
      const response = await this.makeRequest([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], 0.3); // Use default model (GPT-4o-mini) for processing

      const content = response.choices[0].message.content.trim();
      
      try {
        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          
          // Validate required fields and provide defaults
          return {
            status: parsed.status || 'cannot_find_answer',
            reasoning: parsed.reasoning || 'Unable to process verification results',
            sources: Array.isArray(parsed.sources) ? parsed.sources : [],
            confidence: parsed.confidence || 5,
            searchQuery: parsed.searchQuery || 'Unknown search query'
          };
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse processed response:', parseError);
        
        // Fallback: create basic response from Perplexity content
        return this.createFallbackResponse(perplexityResponse);
      }
      
    } catch (error) {
      console.error('Error processing Perplexity response:', error);
      return this.createFallbackResponse(perplexityResponse);
    }
  }

  createFallbackResponse(perplexityResponse) {
    // Basic fallback processing
    const lowerResponse = perplexityResponse.toLowerCase();
    
    let status = 'cannot_find_answer';
    if (lowerResponse.includes('true') || lowerResponse.includes('accurate') || lowerResponse.includes('correct')) {
      status = 'verified_true';
    } else if (lowerResponse.includes('false') || lowerResponse.includes('inaccurate') || lowerResponse.includes('incorrect')) {
      status = 'verified_false';
    } else if (lowerResponse.includes('partial') || lowerResponse.includes('mixed')) {
      status = 'partially_true';
    } else if (lowerResponse.includes('context') || lowerResponse.includes('depends')) {
      status = 'needs_context';
    }
    
    // Extract URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    const sources = perplexityResponse.match(urlRegex) || [];
    
    return {
      status,
      reasoning: perplexityResponse.substring(0, 300) + '...',
      sources: sources.slice(0, 3), // Max 3 sources
      confidence: 5,
      searchQuery: 'Processed from Perplexity response'
    };
  }

  async verifyClaimWithDocuments(claimText, documentChunks) {
    const systemPrompt = `You are a document verification assistant. Your task is to verify if a claim can be supported by the provided document chunks.

**CLAIM TO VERIFY:**
${claimText}

**YOUR TASK:**
1. Search through the provided document chunks for information that supports, contradicts, or provides context for the claim
2. Pay special attention to specific numbers, dates, percentages, and facts
3. Note the exact location where relevant information was found
4. Determine if the claim is supported by the documents

**VERIFICATION STATUSES:**
- found: The claim is clearly supported by the documents
- not_found: No relevant information found in the documents
- contradicted: The documents contain information that contradicts the claim

Return a JSON object with this exact structure:
{
  "status": "found" | "not_found" | "contradicted",
  "reasoning": "Brief explanation of your findings",
  "citations": [
    {
      "fileName": "document name",
      "location": "specific location like 'Sheet: Revenue, Cell: B15' or 'Page: 23'",
      "content": "the actual relevant content found"
    }
  ],
  "confidence": 1-10 based on how well the documents support/contradict the claim
}`;

    try {
      // Format chunks for the AI
      const formattedChunks = documentChunks.map((chunk, index) => {
        let location = '';
        if (chunk.metadata.type === 'excel') {
          location = `Sheet: ${chunk.metadata.sheetName}${chunk.metadata.cellRange ? ', Cells: ' + chunk.metadata.cellRange.split(', ').slice(0, 5).join(', ') : ''}`;
        } else if (chunk.metadata.type === 'pdf') {
          location = `Page: ${chunk.metadata.pageNumber}`;
        }
        
        return `[Chunk ${index + 1} - ${chunk.metadata.fileName} - ${location}]
${chunk.content}
---`;
      }).join('\n\n');

      const userPrompt = `Here are the document chunks to search through:

${formattedChunks}

Please verify if the claim "${claimText}" is supported by these documents.`;

      console.log(`Sending document verification request for claim: ${claimText}`);
      
      const response = await this.makeRequest([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], 0.3, this.groqModel);

      const content = response.choices[0].message.content.trim();
      
      try {
        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          
          // Ensure all required fields are present
          return {
            status: result.status || 'not_found',
            reasoning: result.reasoning || 'Unable to verify claim against documents',
            citations: Array.isArray(result.citations) ? result.citations : [],
            confidence: result.confidence || 5
          };
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse document verification response:', parseError);
        console.error('Raw response:', content);
        
        // Fallback response
        return {
          status: 'not_found',
          reasoning: 'Failed to process document verification results',
          citations: [],
          confidence: 0
        };
      }
      
    } catch (error) {
      console.error('Error in document verification:', error);
      throw error;
    }
  }
}

module.exports = new OpenRouterClient(); 