import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';
import { CompanyData, WritingInstructions } from '../types/index.js';
import { logger } from './logger.js';

interface ScrapedContent {
  homepage?: string;
  aboutPage?: string;
  servicesPage?: string;
  additionalPages?: string[];
}

export class AIWritingInstructionsGenerator {
  public anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: config.anthropic.apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  async generateWritingInstructions(
    companyData: CompanyData,
    scrapedContent: ScrapedContent,
    template: any
  ): Promise<WritingInstructions> {
    try {
      logger.updateSpinner('Analyzing website content with AI...');

      const prompt = this.buildAnalysisPrompt(companyData, scrapedContent);

      const response = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const analysis = response.content[0].type === 'text' ? response.content[0].text : '';

      logger.updateSpinner('Generating comprehensive writing instructions...');

      const instructionsPrompt = this.buildInstructionsPrompt(analysis, template);

      const instructionsResponse = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: instructionsPrompt
        }]
      });

      const instructionsText = instructionsResponse.content[0].type === 'text' ?
        instructionsResponse.content[0].text : '';

      // Parse the AI response into structured writing instructions
      const writingInstructions = this.parseAIInstructions(instructionsText, companyData, template);

      return writingInstructions;

    } catch (error) {
      logger.warn(`AI generation failed: ${(error as Error).message}`);
      throw error;
    }
  }

  private buildAnalysisPrompt(companyData: CompanyData, content: ScrapedContent): string {
    return `
Analyze this business website content and provide detailed insights:

COMPANY: ${companyData.name}
WEBSITE: ${companyData.website}

HOMEPAGE CONTENT:
${content.homepage || 'Not available'}

ABOUT PAGE CONTENT:
${content.aboutPage || 'Not available'}

SERVICES PAGE CONTENT:
${content.servicesPage || 'Not available'}

ADDITIONAL PAGES:
${content.additionalPages?.join('\n\n') || 'Not available'}

Please analyze this content and provide:

1. **Business Description**: What does this company actually do? Be specific.
2. **Industry & Niche**: What industry are they in? What's their specialization?
3. **Mission/Value Proposition**: What's their core promise or mission?
4. **Services Offered**: List their specific services/offerings
5. **Target Audience**: Who do they serve? What roles/companies?
6. **Unique Differentiators**: What makes them unique or different?
7. **Tone & Style**: How do they communicate? Formal, casual, technical?
8. **Pain Points They Address**: What problems do they solve for clients?
9. **Content Strategy Clues**: What topics do they emphasize?

Be specific and extract actual information from the content rather than making generic assumptions.
    `;
  }

  private buildInstructionsPrompt(analysis: string, template: any): string {
    return `
Based on this business analysis, create comprehensive blog writing instructions:

BUSINESS ANALYSIS:
${analysis}

TEMPLATE STRUCTURE TO FOLLOW:
${JSON.stringify(template, null, 2)}

Generate a complete JSON object following the template structure but with REAL, SPECIFIC content based on the analysis. Include:

1. **Company details**: Real company name, accurate description
2. **Brand background**: Actual mission, real services, genuine differentiators
3. **Audience personas**: Specific target audience based on the content
4. **Tone & style**: Actual communication style observed
5. **Content requirements**: Industry-specific requirements
6. **SEO guidelines**: Relevant primary keywords for this business
7. **Sample topics**: 5-6 relevant blog topics for this specific business

IMPORTANT:
- Use actual information from the analysis, not generic placeholders
- Make it specific to this business type and industry
- Ensure all fields have meaningful, actionable content
- Do NOT use "not found" or generic placeholders
- Return ONLY the JSON object, no additional text

JSON:
    `;
  }

  private parseAIInstructions(aiResponse: string, companyData: CompanyData, template: any): WritingInstructions {
    try {
      // Extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsedInstructions = JSON.parse(jsonMatch[0]);

      // Validate and ensure all required fields are present
      const validatedInstructions = this.validateAndEnhanceInstructions(parsedInstructions, companyData, template);

      return validatedInstructions;

    } catch (error) {
      logger.warn('Failed to parse AI instructions, using enhanced template');
      return this.createEnhancedFallbackInstructions(companyData, template);
    }
  }

  private validateAndEnhanceInstructions(instructions: any, companyData: CompanyData, template: any): WritingInstructions {
    // Ensure all required fields exist and have meaningful content
    const enhanced = JSON.parse(JSON.stringify(template));

    // Merge AI instructions with template structure
    Object.keys(instructions).forEach(key => {
      if (instructions[key] && typeof instructions[key] === 'object' && !Array.isArray(instructions[key])) {
        enhanced[key] = { ...enhanced[key], ...instructions[key] };
      } else if (instructions[key]) {
        enhanced[key] = instructions[key];
      }
    });

    // Ensure critical fields are not generic
    if (!enhanced.company || enhanced.company.includes('<')) {
      enhanced.company = companyData.name;
    }

    if (!enhanced.website || enhanced.website.includes('<')) {
      enhanced.website = companyData.website;
    }

    if (!enhanced.oneLineDescription || enhanced.oneLineDescription.includes('<') ||
        enhanced.oneLineDescription.includes('not found')) {
      enhanced.oneLineDescription = this.generateOneLineDescription(companyData);
    }

    // Enhance brand background if it's generic
    if (!enhanced.brandBackground.mission ||
        enhanced.brandBackground.mission.includes('not found') ||
        enhanced.brandBackground.mission.includes('<')) {
      enhanced.brandBackground.mission = companyData.businessPositioning.promise ||
        'Dedicated to delivering exceptional results for our clients';
    }

    if (!enhanced.brandBackground.productsServices ||
        enhanced.brandBackground.productsServices.length === 0 ||
        enhanced.brandBackground.productsServices.some((s: string) => s.includes('<'))) {
      enhanced.brandBackground.productsServices = companyData.businessPositioning.valueProposition;
    }

    return enhanced;
  }

  private createEnhancedFallbackInstructions(companyData: CompanyData, template: any): WritingInstructions {
    // Create intelligent fallback based on company data
    const industry = this.detectIndustry(companyData);
    const enhanced = JSON.parse(JSON.stringify(template));

    enhanced.company = companyData.name;
    enhanced.website = companyData.website;
    enhanced.oneLineDescription = this.generateOneLineDescription(companyData);

    enhanced.brandBackground.mission = companyData.businessPositioning.promise ||
      this.generateIndustrySpecificMission(industry);
    enhanced.brandBackground.productsServices = companyData.businessPositioning.valueProposition;
    enhanced.brandBackground.uniqueDifferentiators = this.generateIndustrySpecificDifferentiators(industry);

    // Generate industry-specific audience personas
    enhanced.audiencePersonas = this.generateIndustryPersonas(industry);

    // Generate industry-specific sample topics
    enhanced.sampleTopics = this.generateIndustryTopics(industry, companyData.businessPositioning.valueProposition);

    return enhanced;
  }

  private detectIndustry(companyData: CompanyData): string {
    const text = `${companyData.name} ${companyData.businessPositioning.tagline} ${companyData.businessPositioning.promise} ${companyData.businessPositioning.valueProposition.join(' ')}`.toLowerCase();

    if (text.includes('marketing consulting') || (text.includes('marketing') && text.includes('consulting'))) return 'marketing consulting';
    if (text.includes('digital marketing') || text.includes('seo') || text.includes('social media')) return 'digital marketing';
    if (text.includes('management consulting') || text.includes('strategy consulting')) return 'management consulting';
    if (text.includes('consulting') || text.includes('advisory')) return 'consulting';
    if (text.includes('marketing') || text.includes('advertising')) return 'marketing';
    if (text.includes('technology') || text.includes('software')) return 'technology';

    return 'business services';
  }

  private generateOneLineDescription(companyData: CompanyData): string {
    const industry = this.detectIndustry(companyData);
    const primaryService = companyData.businessPositioning.valueProposition[0] || 'professional services';

    return `${industry} company specializing in ${primaryService.toLowerCase()}`;
  }

  private generateIndustrySpecificMission(industry: string): string {
    const missions: { [key: string]: string } = {
      'marketing consulting': 'Helping businesses build powerful brands and effective marketing strategies that drive growth',
      'digital marketing': 'Empowering businesses to succeed in the digital landscape through strategic online marketing',
      'management consulting': 'Partnering with leaders to solve complex business challenges and drive organizational success',
      'consulting': 'Providing strategic guidance and expertise to help businesses achieve their goals',
      'marketing': 'Creating compelling marketing solutions that connect brands with their target audiences',
      'technology': 'Delivering innovative technology solutions that transform how businesses operate'
    };

    return missions[industry] || 'Committed to delivering exceptional results and value for our clients';
  }

  private generateIndustrySpecificDifferentiators(industry: string): string[] {
    const differentiators: { [key: string]: string[] } = {
      'marketing consulting': ['Data-driven marketing strategies', 'Proven ROI improvement methods', 'Comprehensive brand development'],
      'digital marketing': ['Multi-channel digital expertise', 'Advanced analytics and reporting', 'Conversion optimization focus'],
      'management consulting': ['C-suite experience and insights', 'Proven change management methodologies', 'Industry-specific expertise'],
      'consulting': ['Tailored strategic solutions', 'Experienced professional team', 'Results-focused approach'],
      'marketing': ['Creative and strategic excellence', 'Integrated marketing campaigns', 'Brand-building expertise'],
      'technology': ['Cutting-edge technical solutions', 'Scalable system architecture', 'Innovation-driven approach']
    };

    return differentiators[industry] || ['Professional expertise', 'Client-focused approach', 'Proven methodologies'];
  }

  private generateIndustryPersonas(industry: string): Array<{
    persona: string;
    role: string;
    painPoints: string[];
    contentNeeds: string[];
  }> {
    if (industry === 'marketing consulting' || industry === 'digital marketing') {
      return [
        {
          persona: 'Marketing Director',
          role: 'Senior marketing leader at growing company',
          painPoints: ['Limited marketing budget efficiency', 'Difficulty measuring ROI', 'Need for better lead generation'],
          contentNeeds: ['Marketing strategy frameworks', 'ROI measurement guides', 'Campaign optimization tips']
        },
        {
          persona: 'Small Business Owner',
          role: 'Entrepreneur running growing business',
          painPoints: ['Limited marketing expertise', 'Time constraints', 'Need for cost-effective marketing'],
          contentNeeds: ['Marketing best practices', 'DIY marketing guides', 'Cost-effective strategies']
        }
      ];
    }

    return [
      {
        persona: 'Business Decision Maker',
        role: 'Executive responsible for strategic decisions',
        painPoints: ['Complex business challenges', 'Resource optimization', 'Growth planning'],
        contentNeeds: ['Strategic frameworks', 'Best practices', 'Industry insights']
      }
    ];
  }

  private generateIndustryTopics(industry: string, services: string[]): string[] {
    const baseService = services[0] || 'business services';

    if (industry === 'marketing consulting') {
      return [
        'The Complete Guide to Marketing Strategy Development',
        'ROI-Driven Marketing: Measuring What Matters',
        'Brand Positioning: Standing Out in Competitive Markets',
        'Digital Marketing Integration: Creating Cohesive Campaigns',
        'Marketing Budget Optimization: Getting More from Less'
      ];
    }

    if (industry === 'digital marketing') {
      return [
        'Digital Marketing Strategy: A Complete Framework',
        'SEO Best Practices for Business Growth',
        'Social Media Marketing: Building Engaged Communities',
        'Content Marketing: Creating Value-Driven Content',
        'Conversion Rate Optimization: Turning Visitors into Customers'
      ];
    }

    return [
      `${baseService}: Best Practices and Implementation`,
      `How to Choose the Right ${baseService} for Your Business`,
      `ROI of Professional ${baseService}: What to Expect`,
      `Common Mistakes in ${baseService} and How to Avoid Them`,
      `Future Trends in ${baseService}: Preparing for Change`
    ];
  }
}