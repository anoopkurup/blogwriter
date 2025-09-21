import fs from 'fs-extra';
import path from 'path';
import { EnhancedWebScraper } from '../shared/enhancedWebscraper.js';
import { WebScraper } from '../shared/webscraper.js';
import { AIWritingInstructionsGenerator } from '../shared/aiWritingInstructionsGenerator.js';
import { FileManager } from '../shared/fileManager.js';
import { logger } from '../shared/logger.js';
import { CompanyData, WritingInstructions, ScriptConfig } from '../types/index.js';

export class EnhancedWritingInstructionsScript {
  private scraper: EnhancedWebScraper;
  private fallbackScraper: WebScraper;
  private aiGenerator: AIWritingInstructionsGenerator;
  private fileManager: FileManager;

  constructor() {
    this.scraper = new EnhancedWebScraper();
    this.fallbackScraper = new WebScraper();
    this.aiGenerator = new AIWritingInstructionsGenerator();
    this.fileManager = new FileManager();
  }

  async execute(config: ScriptConfig): Promise<void> {
    logger.script(3, 'AI-Powered Writing Instructions Creator'); // Updated to Script 3

    try {
      // Step 1: Load comprehensive content analysis from Script 2
      logger.startSpinner('Loading comprehensive content analysis...');
      let comprehensiveContent;
      try {
        comprehensiveContent = await this.fileManager.loadComprehensiveContent(config.companyPath);
      } catch (error) {
        throw new Error('Comprehensive content analysis not found. Please run Script 2 (Internal Links) first.');
      }

      // Step 2: Load sitemap and internal links data
      logger.updateSpinner('Loading sitemap and internal links data...');
      const sitemap = await this.fileManager.loadSitemap(config.companyPath);
      const internalLinks = await this.fileManager.loadInternalLinks(config.companyPath);

      // Step 3: Extract enriched business data from comprehensive analysis
      logger.updateSpinner('Extracting enriched business insights...');
      const enrichedBusinessData = this.extractEnrichedBusinessData(
        comprehensiveContent,
        sitemap,
        internalLinks
      );

      // Step 4: Load and enhance template
      logger.updateSpinner('Loading enhanced template...');
      const template = await this.loadEnhancedTemplate();

      // Step 5: Generate AI-powered writing instructions with rich data
      logger.updateSpinner('Generating AI-powered writing instructions from comprehensive analysis...');
      let writingInstructions: WritingInstructions;

      try {
        writingInstructions = await this.generateWritingInstructionsFromRichData(
          enrichedBusinessData,
          comprehensiveContent,
          template
        );
        logger.updateSpinner('✓ AI-generated writing instructions created');
      } catch (aiError) {
        logger.error(`AI generation failed: ${(aiError as Error).message}`);
        throw new Error('Pure AI-driven writing instructions generation failed. Please check the content quality and try again.');
      }

      // Step 6: Validate and enhance with rich data insights
      logger.updateSpinner('Validating writing instructions quality with rich data...');
      const validated = await this.validateAndEnhanceWithRichData(writingInstructions, enrichedBusinessData, comprehensiveContent);

      // Step 7: Save enhanced writing instructions
      logger.updateSpinner('Saving AI-powered writing instructions...');
      await this.fileManager.saveWritingInstructions(config.companyPath, validated);

      logger.stopSpinner();
      logger.success('AI-powered writing instructions created successfully!');

      // Display comprehensive summary
      console.log('');
      logger.subsection('AI-Powered Writing Instructions Generated:');
      logger.list([
        `Company: ${validated.company}`,
        `Website: ${validated.website}`,
        `Mission: ${validated.brandBackground.mission.substring(0, 80)}...`,
        `Services: ${validated.brandBackground.productsServices.length} services identified`,
        `Target Personas: ${validated.audiencePersonas.length} personas`,
        `Content Topics: ${validated.sampleTopics.length} sample topics`,
        `Quality Status: ${this.assessInstructionsQuality(validated)}`,
        `Data Sources: ${comprehensiveContent.allPageContents.length} pages analyzed`
      ]);

      const fileName = `${path.basename(config.companyPath)}-blogwritinginstructions.json`;
      logger.info(`Enhanced file saved: ${config.companyPath}/${fileName}`);

      // Show sample content preview
      console.log('');
      logger.subsection('Content Preview:');
      console.log(`Mission: ${validated.brandBackground.mission}`);
      console.log(`Primary Services: ${validated.brandBackground.productsServices.slice(0, 3).join(', ')}`);
      console.log(`Target Audience: ${validated.audiencePersonas[0]?.persona || 'Business Decision Makers'}`);
      console.log(`Pages Analyzed: ${comprehensiveContent.allPageContents.length} total pages`);

    } catch (error) {
      logger.stopSpinner(false);
      throw new Error(`Enhanced script failed: ${(error as Error).message}`);
    } finally {
      // No cleanup needed for this data-driven approach
    }
  }

  private extractEnrichedBusinessData(
    comprehensiveContent: any,
    sitemap: string[],
    internalLinks: any[]
  ): any {
    // Pure data extraction without any hardcoded classifications
    const businessData = {
      websiteUrl: sitemap[0] || 'Unknown',
      contentByCategory: comprehensiveContent.contentByCategory,
      businessInsights: comprehensiveContent.businessInsights,
      totalPages: comprehensiveContent.allPageContents.length,
      allPageContents: comprehensiveContent.allPageContents,
      highValuePages: internalLinks.filter((link: any) =>
        ['homepage', 'service', 'about'].includes(link.pageType)
      ),
      // Raw content for AI analysis
      rawHomepageContent: this.extractRawContent(comprehensiveContent.contentByCategory.homepage),
      rawAboutContent: this.extractRawContent(comprehensiveContent.contentByCategory.about),
      rawServicesContent: this.extractRawContent(comprehensiveContent.contentByCategory.services),
      rawTeamContent: this.extractRawContent(comprehensiveContent.contentByCategory.team),
      rawBlogContent: this.extractRawContent(comprehensiveContent.contentByCategory.blog),
      rawTestimonialsContent: this.extractRawContent(comprehensiveContent.contentByCategory.other),
      allRawContent: this.extractAllRawContent(comprehensiveContent.allPageContents)
    };

    return businessData;
  }

  private extractRawContent(categoryPages: any[]): string {
    if (!categoryPages || categoryPages.length === 0) return '';
    return categoryPages.map(page => page.content.join(' ')).join('\n\n');
  }

  private extractAllRawContent(allPages: any[]): string {
    if (!allPages || allPages.length === 0) return '';
    return allPages.map(page => `${page.title}\n${page.content.join(' ')}`).join('\n\n---\n\n');
  }

  private async generateWritingInstructionsFromRichData(
    enrichedBusinessData: any,
    comprehensiveContent: any,
    template: any
  ): Promise<WritingInstructions> {
    logger.updateSpinner('Performing comprehensive AI analysis of business content...');

    // Single comprehensive AI analysis to avoid rate limits
    const comprehensiveAnalysis = await this.performComprehensiveAIAnalysis(enrichedBusinessData, template);

    logger.updateSpinner('Structuring AI analysis into writing instructions...');

    // Parse and structure the comprehensive analysis
    return await this.parseComprehensiveAnalysis(comprehensiveAnalysis, template);
  }

  private async performComprehensiveAIAnalysis(enrichedBusinessData: any, template: any): Promise<string> {
    // Add a small delay to help with rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));

    const prompt = `
You are analyzing a company's website to create comprehensive blog writing instructions.

WEBSITE: ${enrichedBusinessData.websiteUrl}

HOMEPAGE CONTENT (KEY SECTIONS):
${enrichedBusinessData.rawHomepageContent.substring(0, 2000)}

ABOUT CONTENT (KEY SECTIONS):
${enrichedBusinessData.rawAboutContent.substring(0, 1500)}

SERVICES CONTENT (KEY SECTIONS):
${enrichedBusinessData.rawServicesContent.substring(0, 2000)}

TEMPLATE STRUCTURE TO FOLLOW:
${JSON.stringify(template, null, 2)}

Based ONLY on this actual website content, create a complete JSON object following the template structure. Analyze each section comprehensively:

1. **COMPANY ANALYSIS**:
   - Extract exact company name from content
   - Determine specific industry/business type (be precise, not generic)
   - Create accurate one-line description based on actual business model
   - Extract mission statement or core value proposition from content

2. **SERVICES ANALYSIS**:
   - List specific services offered (from actual content, not assumptions)
   - Identify unique differentiators mentioned in content
   - Extract specializations and focus areas

3. **AUDIENCE ANALYSIS**:
   - Identify target customers from testimonials and content
   - Extract client types and personas from actual evidence
   - Determine pain points and needs from content

4. **COMMUNICATION ANALYSIS**:
   - Analyze actual writing style and tone across content
   - Identify communication voice and perspective used
   - Extract frequently used brand keywords and phrases

5. **SEO ANALYSIS**:
   - Extract primary keywords from actual content
   - Identify service-related and industry-specific terms
   - Find long-tail keyword opportunities from content

6. **CONTENT STRATEGY**:
   - Analyze existing content patterns and structure
   - Generate relevant blog topics based on business focus
   - Determine content requirements for this specific business

CRITICAL REQUIREMENTS:
- Use ONLY information found in the provided content
- Be specific and accurate - no generic placeholders
- For specialized businesses (like IP firms, specific consulting), be precise about their niche
- Do not make assumptions or use generic business templates
- Return complete JSON object following template structure
- Ensure all fields have meaningful, business-specific content

Return ONLY the complete JSON object:
    `;

    const response = await this.aiGenerator.anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  private async parseComprehensiveAnalysis(analysisText: string, template: any): Promise<WritingInstructions> {
    try {
      // Extract JSON from the comprehensive analysis
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in comprehensive AI analysis');
      }

      const parsedInstructions = JSON.parse(jsonMatch[0]);

      // Basic validation and enhancement
      if (!parsedInstructions.company || parsedInstructions.company.includes('<')) {
        parsedInstructions.company = 'Company Name';
      }

      if (!parsedInstructions.website || parsedInstructions.website.includes('<')) {
        parsedInstructions.website = 'company-website.com';
      }

      return parsedInstructions;

    } catch (error) {
      logger.warn('Failed to parse comprehensive AI analysis, using AI extraction fallback');
      return await this.createSimpleAIFallback(analysisText, template);
    }
  }

  private async createSimpleAIFallback(analysisText: string, template: any): Promise<WritingInstructions> {
    // Add delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create a simple extraction prompt for the AI analysis
    const extractionPrompt = `
Extract key business information from this text:

${analysisText.substring(0, 2000)}

Extract only:
1. Company Name: [extract exact company name]
2. Business Type: [what industry/business type]
3. Description: [one-line business description]
4. Services: [list main services]
5. Mission: [mission statement]

Format as simple text, one item per line.
    `;

    const response = await this.aiGenerator.anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 800,
      messages: [{ role: 'user', content: extractionPrompt }]
    });

    const extractedText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse the extracted text and build basic instructions
    const instructions = JSON.parse(JSON.stringify(template));

    // Simple text parsing
    const lines = extractedText.split('\n').filter(line => line.trim());

    lines.forEach(line => {
      if (line.toLowerCase().includes('company name:')) {
        instructions.company = line.split(':')[1]?.trim() || 'Company Name';
      }
      if (line.toLowerCase().includes('description:')) {
        instructions.oneLineDescription = line.split(':')[1]?.trim() || 'Professional services company';
      }
      if (line.toLowerCase().includes('mission:')) {
        instructions.brandBackground.mission = line.split(':')[1]?.trim() || 'Committed to delivering exceptional service';
      }
    });

    return instructions;
  }










  private async validateAndEnhanceWithRichData(
    instructions: any,
    enrichedBusinessData: any,
    comprehensiveContent: any
  ): Promise<WritingInstructions> {
    // Basic validation without additional AI calls to avoid rate limits
    if (!instructions.company || instructions.company.includes('<') || instructions.company === 'Company Name') {
      instructions.company = 'Company Name';
    }

    if (!instructions.website || instructions.website.includes('<') || instructions.website === 'website-url') {
      instructions.website = enrichedBusinessData.websiteUrl;
    }

    if (!instructions.oneLineDescription || instructions.oneLineDescription.includes('<') || instructions.oneLineDescription === 'Professional services company') {
      instructions.oneLineDescription = 'Professional services company';
    }

    return instructions;
  }








  private async loadEnhancedTemplate(): Promise<any> {
    const templatePath = path.resolve(process.cwd(), 'sample-writing-instructions.json');
    const templateContent = await fs.readFile(templatePath, 'utf8');
    return JSON.parse(templateContent);
  }

  private assessInstructionsQuality(instructions: WritingInstructions): string {
    let score = 0;
    let total = 0;

    // Check for specific vs generic content
    total += 1;
    if (instructions.company && !instructions.company.includes('<') && !instructions.company.includes('not found')) {
      score += 1;
    }

    total += 1;
    if (instructions.brandBackground.productsServices.length > 0 &&
        !instructions.brandBackground.productsServices.some(s => s.includes('<'))) {
      score += 1;
    }

    total += 1;
    if (instructions.audiencePersonas.length > 0) {
      score += 1;
    }

    total += 1;
    if (instructions.sampleTopics.length >= 5) {
      score += 1;
    }

    const percentage = Math.round((score / total) * 100);
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 70) return 'Good';
    if (percentage >= 50) return 'Fair';
    return 'Poor';
  }
}
