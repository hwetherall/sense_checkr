const axios = require('axios');

class OpenRouterClient {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseURL = 'https://openrouter.ai/api/v1';
    this.model = 'meta-llama/llama-4-maverick-17b-128e-instruct';
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
      max_tokens: 40000
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
    const systemPrompt = `You are a professional financial analyst assistant. Your ONLY task is to extract EXACTLY 10 claims - no more, no less.

CRITICAL REQUIREMENT: You MUST return EXACTLY 10 claims. Not 11, not 37, not 50. EXACTLY 10.

These 10 claims should be the MOST CRITICAL "make or break" FACTUAL CLAIMS that would determine investment success or failure.

WHAT TO EXTRACT (Good Examples):
✅ "The total addressable market for quadruped robots is $1.5B in 2024, projected to reach $6.2B by 2033 with a CAGR of 17.2%"
✅ "Boston Dynamics has deployed 1,500+ Spot units at $80k+ per unit, focusing on inspection and security sectors"
✅ "Ghost Robotics Vision60 robots have IP67 rating, operate in -40°C to 60°C, with 180 min battery life and 10kg payload capacity"
✅ "The company projects $84,700/year labor savings per construction site with positive ROI"
✅ "Ghost Robotics has deployed 1,000+ units globally, primarily in government and military applications"

WHAT NOT TO EXTRACT (Bad Examples):
❌ "Pilot Deployments (Year 1): ≥5" (this is a target/milestone, not a factual claim)
❌ "NPS ≥50" (this is a goal, not a current fact)
❌ "TAM $7B" (too brief, lacks context and timeframe)
❌ "Positive ROI" (vague, lacks specific metrics)
❌ "Market leadership" (subjective, not quantifiable)

FOCUS AREAS (in order of priority):
1. **Current market data** - actual market sizes, growth rates with specific timeframes and sources
2. **Competitive positioning** - specific metrics about competitors (units sold, pricing, market share)
3. **Financial metrics** - concrete revenue figures, costs, margins, ROI calculations
4. **Technical specifications** - measurable product capabilities, performance metrics
5. **Operational data** - current deployment numbers, customer metrics, proven results

CONTEXT REQUIREMENTS:
- Include specific numbers, timeframes, and sources when mentioned
- Provide enough detail for independent verification
- Mention the subject clearly (don't just say "the market" - specify which market)
- Include comparative context when relevant (vs competitors, industry benchmarks)

For each of the EXACTLY 10 claims, provide:
- text: The complete, contextual claim text (not just keywords)
- category: One of 'financial', 'market', 'operational', or 'other'
- confidence: 1-10 (how specific and verifiable the claim appears)
- range: [start, end] character positions in the original text
- importance: 1-10 (how critical to investment decision)

Return a JSON array with EXACTLY 10 items. Focus on FACTUAL CLAIMS with sufficient context for verification.`;

    const userPrompt = `Extract EXACTLY 10 most important factual claims from this memo. Remember: EXACTLY 10, not more, not less. Focus on verifiable facts with sufficient context:\n\n${memoText}`;

    try {
      const startTime = Date.now();
      console.log('Requesting improved claim extraction...');
      
      const response = await this.makeRequest([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], 0.2); // Low temperature for consistent behavior

      const processingTime = Date.now() - startTime;
      
      // Parse the response
      const content = response.choices[0].message.content;
      console.log('Raw AI response length:', content.length);
      
      let claims;
      
      try {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          claims = JSON.parse(jsonMatch[0]);
          console.log(`AI returned ${claims.length} claims`);
          
          // Log claim quality for debugging
          claims.forEach((claim, index) => {
            console.log(`Claim ${index + 1}: "${claim.text}" (${claim.category}, confidence: ${claim.confidence})`);
          });
        } else {
          throw new Error('No JSON array found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse claims:', parseError);
        throw new Error('Failed to parse AI response');
      }

      // AGGRESSIVE ENFORCEMENT: Absolutely ensure we have exactly 10 claims
      if (claims.length > 10) {
        console.warn(`AI returned ${claims.length} claims despite instructions. Forcefully limiting to 10.`);
        
        // Sort by importance if available, otherwise just take first 10
        if (claims[0]?.importance !== undefined) {
          claims.sort((a, b) => (b.importance || 5) - (a.importance || 5));
        }
        
        claims = claims.slice(0, 10);
      } else if (claims.length < 10) {
        console.warn(`AI returned only ${claims.length} claims. Requested 10.`);
      }

      // Add IDs and default status to claims
      claims = claims.map((claim, index) => ({
        id: `claim-${Date.now()}-${index}`,
        status: 'unverified',
        ...claim,
        // Ensure range is provided, default to [0, 0] if not
        range: claim.range || [0, 0],
        // Ensure importance is provided
        importance: claim.importance || 5
      }));

      // FINAL CHECK - This should never happen but just in case
      if (claims.length > 10) {
        console.error('CRITICAL: Still have more than 10 claims after all processing!');
        claims = claims.slice(0, 10);
      }

      console.log(`Successfully extracted ${claims.length} contextual factual claims`);

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