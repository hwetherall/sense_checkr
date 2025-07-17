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
    const systemPrompt = `You are writing a research prompt for a fact-checking AI like Perplexity. Your job is to create a single, well-contextualized prompt that asks the AI to verify a claim and provide specific, high-quality sources.

**CLAIM TO VERIFY:**
{claimText}

**MEMO CONTEXT:**
{memoText}

**COMPANY TYPE:** {companyType}
- external: Real company that exists publicly  
- internal: Internal corporate venture/project

**YOUR TASK:**
Write a single, well-contextualized prompt for the fact-checking AI. Follow this pattern:

❌ BAD: "Is market size $13B?"
✅ GOOD: "I am analyzing the pet food market in Alberta, and have a claim that this market is worth $13B. How accurate is this claim based on current market data? Please provide 3-5 specific, full URLs to reliable sources (e.g., reports, articles) that support your reasoning. Use markdown citations like [1]: https://specific.url/page."

❌ BAD: "Does TechFlow have $47M ARR?"  
✅ GOOD: "I'm evaluating TechFlow Solutions, a workflow automation company, and they claim $47.2M in Annual Recurring Revenue as of Q3 2024. Can you verify this revenue figure? Crucially, please provide direct, full URLs to the specific reports, press releases, or financial statements that contain this information. Use markdown citations for all sources."

**CRITICAL INSTRUCTIONS FOR YOUR PROMPT:**
1.  **Be Specific:** Include company name, industry, and context from the memo.
2.  **Mention Company Type:** Note if it's an internal or external company.
3.  **Demand Sources Explicitly:** Your prompt MUST explicitly ask the AI to provide several (3-5) full, deep-linked URLs.
4.  **Specify URL Format:** Instruct the AI to use markdown citations (e.g., \`[1]: https://example.com/report.pdf\`) for clarity.
5.  **Focus on Verification:** Ask for verification of the claim, not just general information.

Write ONLY the prompt for the fact-checking AI, nothing else.`;

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
    console.log('Raw Perplexity response:', perplexityResponse);
    
    // Improved URL extraction with multiple patterns
    const urlPatterns = [
      // Standard HTTP/HTTPS URLs with paths
      /https?:\/\/[^\s\)\]\,\;\"\'\`\|\<\>]+/g,
      // URLs that might be wrapped in markdown or other formatting
      /\[([^\]]*)\]\(([^)]+)\)/g,
      // Citations with URLs
      /\[[^\]]*\]:\s*(https?:\/\/[^\s\)\]\,\;\"\'\`\|\<\>]+)/g
    ];
    
    let extractedSources = [];
    
    // Extract URLs using multiple patterns
    urlPatterns.forEach(pattern => {
      const matches = perplexityResponse.matchAll(pattern);
      for (const match of matches) {
        if (pattern.source.includes('\\]\\(')) {
          // Markdown link format [text](url)
          extractedSources.push(match[2]);
        } else if (pattern.source.includes('\\]:')) {
          // Citation format [text]: url
          extractedSources.push(match[1]);
        } else {
          // Direct URL
          extractedSources.push(match[0]);
        }
      }
    });
    
    // Remove duplicates and clean URLs
    extractedSources = [...new Set(extractedSources)]
      .map(url => url.replace(/[,.\)\]\;\"\'\`\|\<\>]+$/, '')) // Clean trailing punctuation
      .filter(url => url.startsWith('http') && url.length > 10) // More permissive length requirement
      .slice(0, 10); // Limit to 10 sources max
    
    console.log('Extracted sources from response:', extractedSources);
    
    const systemPrompt = `You are a meticulous data processor. Your task is to analyze a fact-checking response from a research AI (like Perplexity) and structure its findings into a clean JSON object. Your primary focus is on accurately extracting the reasoning and, most importantly, any **real, verifiable source URLs**.

**ORIGINAL CLAIM:**
${originalClaim}

**PERPLEXITY RESPONSE:**
${perplexityResponse}

**PRE-EXTRACTED URLS (FOR REFERENCE):**
${extractedSources.join('\\n')}

**CRITICAL INSTRUCTIONS FOR SOURCE HANDLING:**
1.  **Extract, Don't Invent:** Your main job is to find and extract URLs that the AI provided. **DO NOT create, guess, or "complete" URLs.** If the AI provides a partial link, extract it as is or discard it if it's unusable. It is better to have fewer, real URLs than many fake ones.
2.  **Preserve Full Paths:** Always preserve the complete URL, including the path, query parameters, and fragments (e.g., \`https://example.com/reports/market-size-2024.pdf?region=na#page=4\`). Do not shorten URLs to just the domain.
3.  **Use Pre-Extracted List:** The pre-extracted URL list is your primary source of truth. Ensure every valid URL from that list is included in your final JSON output. You may also find additional URLs in the text.
4.  **Prioritize Deep Links:** When both a deep link (e.g., \`.../report/ai-dogs\`) and a domain link (e.g., \`.../report/\`) are present for the same source, always prefer the more specific (deeper) link.

**YOUR TASK:**
Parse the Perplexity response and return a single, valid JSON object with the following structure. Do not add any other text outside the JSON.

{
  "status": "verified_true" | "verified_false" | "partially_true" | "needs_context" | "cannot_find_answer",
  "reasoning": "A 2-3 sentence summary of the AI's reasoning for its conclusion.",
  "sources": ["An array of the full, complete, and real source URLs found in the response."],
  "searchQuery": "A brief summary of what the AI searched for.",
  "confidence": "A number from 1-10 based on source quality and recency."
}

**GUIDELINES:**
- **Reasoning:** Be concise and specific.
- **Sources:** If no URLs are found in the response, and the pre-extracted list is empty, return an empty array \`[]\`.
- **Confidence:** Score 8-10 for multiple, recent, authoritative sources. Score 1-4 for weak or conflicting sources.

Return only the valid JSON object.`;

    const userPrompt = `Process this Perplexity response and return the structured JSON with COMPLETE URLs:

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
          
          // Ensure we have sources - if the AI didn't include them, use our extracted ones
          let finalSources = Array.isArray(parsed.sources) ? parsed.sources : [];
          if (finalSources.length === 0 && extractedSources.length > 0) {
            finalSources = extractedSources;
            console.log('AI missed sources, using extracted ones:', finalSources);
          }
          
          // Enhanced URL cleaning while preserving paths
          finalSources = finalSources.map(url => {
            // Remove only trailing punctuation that's clearly not part of the URL
            return url.replace(/[,.\)\]\;\"\'\`\|\<\>]+$/, '');
          }).filter(url => {
            // Much more permissive validation - just ensure it's a valid HTTP(S) URL
            const isValid = url.startsWith('http') && 
                           url.length > 10 && 
                           !url.match(/\s/); // No spaces
            
            if (!isValid) {
              console.log('Filtered out URL:', url, 'Reasons: startsWith http?', url.startsWith('http'), 'length > 10?', url.length > 10, 'no spaces?', !url.match(/\s/));
            }
            return isValid;
          });
          
          console.log('Sources before filtering:', Array.isArray(parsed.sources) ? parsed.sources : extractedSources);
          console.log('Sources after filtering:', finalSources);
          
          // Validate required fields and provide defaults
          const result = {
            status: parsed.status || 'cannot_find_answer',
            reasoning: parsed.reasoning || 'Unable to process verification results',
            sources: finalSources,
            confidence: parsed.confidence || 5,
            searchQuery: parsed.searchQuery || 'Unknown search query'
          };
          
          console.log('Final processed result with deep links:', result);
          return result;
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
    
    // Enhanced URL extraction for fallback
    const urlPatterns = [
      /https?:\/\/[^\s\)\]\,\;\"\'\`\|\<\>]+/g,
      /\[([^\]]*)\]\(([^)]+)\)/g,
      /\[[^\]]*\]:\s*(https?:\/\/[^\s\)\]\,\;\"\'\`\|\<\>]+)/g
    ];
    
    let sources = [];
    urlPatterns.forEach(pattern => {
      const matches = perplexityResponse.matchAll(pattern);
      for (const match of matches) {
        if (pattern.source.includes('\\]\\(')) {
          sources.push(match[2]);
        } else if (pattern.source.includes('\\]:')) {
          sources.push(match[1]);
        } else {
          sources.push(match[0]);
        }
      }
    });
    
    // Clean and filter sources
    const extractedSources = [...new Set(sources)]
      .map(url => url.replace(/[,.\\)\\];\\"'\\`|<>]+$/, '')) // Clean trailing punctuation
      .filter(url => url.startsWith('http') && url.length > 10) // More permissive length requirement
      .slice(0, 10); // Limit to 10 sources max
    
    console.log('Fallback extracted sources with deep links:', extractedSources);
    
    return {
      status,
      reasoning: perplexityResponse.substring(0, 300) + '...',
      sources: extractedSources,
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