import fs from 'fs-extra';
import path from 'path';
import { WebScraper } from '../shared/webscraper.js';
import { FileManager } from '../shared/fileManager.js';
import { logger } from '../shared/logger.js';
import { CompanyData, WritingInstructions, ScriptConfig } from '../types/index.js';

export class WritingInstructionsScript {
  private scraper: WebScraper;
  private fileManager: FileManager;

  constructor() {
    this.scraper = new WebScraper();
    this.fileManager = new FileManager();
  }

  async execute(config: ScriptConfig): Promise<void> {
    if (!config.websiteUrl) {
      throw new Error('Website URL is required for writing instructions script');
    }

    logger.script(1, 'Writing Instructions Creator');
    logger.startSpinner('Analyzing company website...');

    try {
      // Step 1: Enhanced company data scraping
      logger.updateSpinner('Extracting comprehensive company information...');
      const companyData = await this.scraper.scrapeCompanyData(config.websiteUrl);

      // Step 2: Deep content analysis
      logger.updateSpinner('Analyzing website content and structure...');
      const enhancedData = await this.enhanceCompanyData(companyData, config.websiteUrl);

      // Step 3: Load sample template
      logger.updateSpinner('Loading writing instructions template...');
      const template = await this.loadSampleTemplate();

      // Step 4: Generate writing instructions with enhanced data
      logger.updateSpinner('Generating writing instructions from scraped data...');
      const writingInstructions = this.generateWritingInstructions(enhancedData, template);

      // Step 4.5: Validate writing instructions quality
      logger.updateSpinner('Validating writing instructions quality...');
      if (!this.validateWritingInstructions(writingInstructions)) {
        logger.warn('Initial writing instructions quality below threshold, attempting enhancement...');

        // Try to enhance with additional extraction strategies
        const enhancedInstructions = await this.enhanceWritingInstructions(writingInstructions, config.websiteUrl!);

        if (this.validateWritingInstructions(enhancedInstructions)) {
          logger.info('Enhanced writing instructions passed validation');
          await this.fileManager.saveWritingInstructions(config.companyPath, enhancedInstructions);
        } else {
          logger.warn('Writing instructions still below quality threshold, but saving anyway');
          await this.fileManager.saveWritingInstructions(config.companyPath, writingInstructions);
        }
      } else {
        // Step 5: Save to company folder
        logger.updateSpinner('Saving writing instructions...');
        await this.fileManager.saveWritingInstructions(config.companyPath, writingInstructions);
      }

      logger.stopSpinner();
      logger.success('Writing instructions created successfully from website analysis!');

      // Display summary
      console.log('');
      logger.subsection('Generated Writing Instructions:');
      logger.list([
        `Company: ${writingInstructions.company}`,
        `Industry Focus: ${this.detectIndustry(enhancedData)}`,
        `Target Personas: ${writingInstructions.audiencePersonas.length} personas`,
        `Content Requirements: ${writingInstructions.contentRequirements.length} requirements`,
        `Sample Topics: ${writingInstructions.sampleTopics.length} topics`,
        `Services Identified: ${enhancedData.businessPositioning.valueProposition.length} services`
      ]);

      const fileName = `${path.basename(config.companyPath)}-blogwritinginstructions.json`;
      logger.info(`File saved: ${config.companyPath}/${fileName}`);

    } catch (error) {
      logger.stopSpinner(false);
      throw new Error(`Script 1 failed: ${(error as Error).message}`);
    }
  }

  private async loadSampleTemplate(): Promise<any> {
    try {
      const templatePath = path.join(process.cwd(), 'sample-writing-instructions.json');
      const content = await fs.readFile(templatePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      // Return a basic template if sample file doesn't exist
      return this.getDefaultTemplate();
    }
  }

  private generateWritingInstructions(companyData: CompanyData, template: any): WritingInstructions {
    const industry = this.detectIndustry(companyData);

    // Clone the template and populate with scraped data
    const populatedTemplate = JSON.parse(JSON.stringify(template));

    // Populate basic company information
    populatedTemplate.company = companyData.name;
    populatedTemplate.website = companyData.website;
    populatedTemplate.oneLineDescription = this.generateOneLineDescription(companyData, industry);

    // Populate brand background
    populatedTemplate.brandBackground.mission = companyData.businessPositioning.promise ||
      companyData.businessPositioning.tagline ||
      "Mission to be extracted from further analysis";
    populatedTemplate.brandBackground.productsServices = companyData.businessPositioning.valueProposition;
    populatedTemplate.brandBackground.uniqueDifferentiators = this.generateUniqueDifferentiators(companyData);

    // Populate purpose and goals
    populatedTemplate.purposeGoals = this.generatePurposeGoals(companyData);

    // Populate audience personas
    populatedTemplate.audiencePersonas = this.generateAudiencePersonas(companyData, industry);

    // Populate tone and style
    populatedTemplate.toneStyle.voice = this.generateVoiceKeywords(companyData);
    populatedTemplate.toneStyle.tone = this.generateToneLevel(industry);
    populatedTemplate.toneStyle.perspective = "Use 'we' for company, 'you' for audience";
    populatedTemplate.toneStyle.brandKeywords = this.extractBrandKeywords(companyData);

    // Populate blog structure
    populatedTemplate.blogStructure.headlineGuidelines = "Include primary keyword, ≤ 60 chars, attention-grabbing";
    populatedTemplate.blogStructure.introGuidelines = "Hook with audience pain point/question + state benefit of reading";
    populatedTemplate.blogStructure.defaultOutline = this.generateDefaultOutline(industry);
    populatedTemplate.blogStructure.visualGuidelines = "Use charts, images, infographics; include alt text with natural keywords";

    // Populate SEO guidelines
    populatedTemplate.seoGuidelines.primaryKeywordExamples = this.generatePrimaryKeywords(companyData, industry);
    populatedTemplate.seoGuidelines.keywordPlacementRules = ["Title", "First 100 words", "At least 1 subheading", "3-5 times naturally in body"];
    populatedTemplate.seoGuidelines.metaLengths = { titleMax: 60, descriptionMax: 160 };
    populatedTemplate.seoGuidelines.internalLinkTargets = this.generateInternalLinkTargets(companyData);
    populatedTemplate.seoGuidelines.externalSourcesPreferred = this.generateExternalSources(industry);

    // Populate content requirements
    populatedTemplate.contentRequirements = this.generateContentRequirements(industry);

    // Populate visuals and media
    populatedTemplate.visualsMedia.featuredImageRequired = true;
    populatedTemplate.visualsMedia.inPostImages = 2;
    populatedTemplate.visualsMedia.allowedSources = ["CompanyAssets", "Stock", "CustomCharts"];
    populatedTemplate.visualsMedia.altTextRule = "Describe image clearly; include keyword if natural";

    // Populate CTA
    populatedTemplate.cta.primaryTypes = this.generateCTATypes(companyData, industry);
    populatedTemplate.cta.placement = ["End", "Mid optional"];
    populatedTemplate.cta.tone = this.generateCTATone(industry);
    populatedTemplate.cta.exampleCopy = this.generateCTAExamples(companyData, industry);

    // Populate formatting and submission
    populatedTemplate.formattingSubmission.outputFormats = ["markdown", "google-docs"];
    populatedTemplate.formattingSubmission.fileNamingPattern = "YYYY-MM-DD-topic-keyword";
    populatedTemplate.formattingSubmission.workflow = ["Draft", "Internal Review", "SEO Review", "Publish"];

    // Populate quality checklist
    populatedTemplate.qualityChecklist = this.generateQualityChecklistFromTemplate(template.qualityChecklist, industry);

    // Populate sample topics
    populatedTemplate.sampleTopics = this.generateSampleTopics(companyData, industry);

    return populatedTemplate;
  }

  private async enhanceCompanyData(companyData: CompanyData, websiteUrl: string): Promise<CompanyData> {
    // Enhance the scraped data with additional analysis
    const enhanced = { ...companyData };

    // Enhance business positioning if basic data is missing
    if (!enhanced.businessPositioning.tagline || enhanced.businessPositioning.tagline.includes('Professional')) {
      enhanced.businessPositioning.tagline = await this.extractBetterTagline(websiteUrl);
    }

    // Enhance value proposition with more detailed services
    enhanced.businessPositioning.valueProposition = await this.extractDetailedServices(websiteUrl, enhanced.businessPositioning.valueProposition);

    // Extract better mission/promise from about page
    enhanced.businessPositioning.promise = await this.extractMissionStatement(websiteUrl) || enhanced.businessPositioning.promise;

    return enhanced;
  }

  private async extractBetterTagline(websiteUrl: string): Promise<string> {
    try {
      // Try multiple pages to find better tagline
      const pagesToTry = [
        websiteUrl,
        `${websiteUrl}/about`,
        `${websiteUrl}/about-us`,
        `${websiteUrl}/services`
      ];

      for (const pageUrl of pagesToTry) {
        try {
          const heroData = await this.scraper.scrapePageContent(pageUrl);

          // Enhanced tagline patterns with better industry detection
          const taglineIndicators = [
            // Marketing consulting specific
            'marketing consulting',
            'marketing strategy',
            'digital marketing',
            'brand development',
            'growth marketing',
            // General consulting patterns
            'We help',
            'Your trusted',
            'Leading provider',
            'Specialized in',
            'Expert in',
            'Professional services for',
            'Delivering',
            'Providing',
            // More specific patterns
            'consulting company',
            'advisory services',
            'strategic consulting'
          ];

          for (const indicator of taglineIndicators) {
            const match = heroData.content.find((content: string) => {
              const lowerContent = content.toLowerCase();
              return lowerContent.includes(indicator.toLowerCase()) &&
                     content.length > 20 &&
                     content.length < 200 &&
                     !lowerContent.includes('cookie') && // Avoid cookie notices
                     !lowerContent.includes('privacy'); // Avoid privacy notices
            });

            if (match) {
              return this.cleanTagline(match);
            }
          }
        } catch {
          continue; // Try next page
        }
      }

      return 'Professional services provider';
    } catch {
      return 'Professional services provider';
    }
  }

  private async extractDetailedServices(websiteUrl: string, existingServices: string[]): Promise<string[]> {
    try {
      // Try to scrape multiple pages for service offerings
      const servicesUrls = [
        `${websiteUrl}/services`,
        `${websiteUrl}/solutions`,
        `${websiteUrl}/our-services`,
        `${websiteUrl}/what-we-do`,
        `${websiteUrl}/offerings`,
        websiteUrl // Also check homepage
      ];

      const allServices: string[] = [];

      for (const serviceUrl of servicesUrls) {
        try {
          const serviceData = await this.scraper.scrapePageContent(serviceUrl);
          if (serviceData.content.length > 0) {
            // Extract service names from headings and content with better patterns
            const serviceKeywords = this.extractServiceKeywords(serviceData.content);
            allServices.push(...serviceKeywords);
          }
        } catch {
          continue;
        }
      }

      // Deduplicate and prioritize relevant services
      const uniqueServices = [...new Set(allServices)];
      const filteredServices = this.filterAndPrioritizeServices(uniqueServices);

      if (filteredServices.length > 0) {
        return filteredServices.slice(0, 6);
      }

      // Enhanced fallback based on URL analysis
      const urlLower = websiteUrl.toLowerCase();
      if (urlLower.includes('marketing')) {
        return ['Marketing Strategy', 'Brand Development', 'Digital Marketing', 'Marketing Consulting'];
      } else if (urlLower.includes('consulting')) {
        return ['Business Consulting', 'Strategic Planning', 'Advisory Services', 'Management Consulting'];
      }

      return existingServices.length > 0 ? existingServices : ['Professional Services', 'Consulting', 'Advisory'];
    } catch {
      return existingServices.length > 0 ? existingServices : ['Professional Services', 'Consulting', 'Advisory'];
    }
  }

  private async extractMissionStatement(websiteUrl: string): Promise<string | null> {
    try {
      const aboutUrls = [
        `${websiteUrl}/about`,
        `${websiteUrl}/about-us`,
        `${websiteUrl}/our-story`,
        `${websiteUrl}/mission`
      ];

      for (const aboutUrl of aboutUrls) {
        try {
          const aboutData = await this.scraper.scrapePageContent(aboutUrl);
          if (aboutData.content.length > 0) {
            // Look for mission-like statements
            const missionIndicators = ['mission', 'purpose', 'dedicated to', 'committed to', 'strive to'];

            for (const content of aboutData.content) {
              for (const indicator of missionIndicators) {
                if (content.toLowerCase().includes(indicator) && content.length > 50 && content.length < 300) {
                  return content.trim();
                }
              }
            }
          }
        } catch {
          continue;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private extractServiceKeywords(content: string[]): string[] {
    const services: string[] = [];

    // Enhanced service patterns with industry-specific terms
    const servicePatterns = [
      // Marketing specific services
      /\b(Marketing\s+(?:Strategy|Consulting|Planning|Optimization|Campaigns?))\b/gi,
      /\b(Digital\s+Marketing|Social\s+Media\s+Marketing|Content\s+Marketing)\b/gi,
      /\b(Brand\s+(?:Development|Strategy|Consulting|Management))\b/gi,
      /\b(SEO|Search\s+Engine\s+Optimization)\b/gi,

      // General business services
      /\b([A-Z][a-z]+\s+(?:Management|Services?|Solutions?|Consulting|Advisory|Planning))\b/g,
      /\b(Business\s+(?:Consulting|Strategy|Development|Optimization))\b/gi,
      /\b(Strategic\s+(?:Planning|Consulting|Advisory))\b/gi,

      // Professional services
      /\b(Professional\s+Services?)\b/gi,
      /\b(Consulting\s+Services?)\b/gi,
      /\b(Advisory\s+Services?)\b/gi,

      // More specific patterns
      /\b([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+Services?)?)\b/g
    ];

    for (const text of content) {
      // Skip very short or very long content
      if (text.length < 10 || text.length > 200) continue;

      for (const pattern of servicePatterns) {
        const matches = text.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const cleanMatch = match.trim();
            if (cleanMatch.length > 5 && cleanMatch.length < 50) {
              services.push(cleanMatch);
            }
          });
        }
      }

      // Also look for list items that might be services
      if (text.includes('•') || text.includes('-') || text.includes('→')) {
        const listItems = text.split(/[•\-→]/).map(item => item.trim());
        listItems.forEach(item => {
          if (item.length > 10 && item.length < 50 &&
              (item.toLowerCase().includes('consulting') ||
               item.toLowerCase().includes('strategy') ||
               item.toLowerCase().includes('marketing') ||
               item.toLowerCase().includes('management'))) {
            services.push(item);
          }
        });
      }
    }

    return [...new Set(services)].slice(0, 10);
  }

  private detectIndustry(companyData: CompanyData): string {
    const text = `${companyData.name} ${companyData.businessPositioning.tagline} ${companyData.businessPositioning.promise} ${companyData.businessPositioning.valueProposition.join(' ')}`.toLowerCase();

    // More specific industry detection matching the dataforSEO improvements
    if (text.includes('portfolio') || text.includes('investment') || text.includes('pms') || text.includes('wealth management')) return 'financial services';
    if (text.includes('marketing consulting') || (text.includes('marketing') && text.includes('consulting'))) return 'marketing consulting';
    if (text.includes('digital marketing') || text.includes('seo') || text.includes('social media marketing')) return 'digital marketing';
    if (text.includes('management consulting') || text.includes('strategy consulting')) return 'management consulting';
    if (text.includes('consulting') || text.includes('advisory')) return 'consulting';
    if (text.includes('marketing') || text.includes('advertising') || text.includes('branding')) return 'marketing';
    if (text.includes('technology') || text.includes('tech') || text.includes('software') || text.includes('saas')) return 'technology';
    if (text.includes('healthcare') || text.includes('medical') || text.includes('health')) return 'healthcare';
    if (text.includes('finance') || text.includes('financial') || text.includes('accounting')) return 'financial services';
    if (text.includes('legal') || text.includes('law') || text.includes('attorney')) return 'legal';
    if (text.includes('real estate') || text.includes('property')) return 'real estate';
    if (text.includes('education') || text.includes('training') || text.includes('learning')) return 'education';
    if (text.includes('design') || text.includes('creative') || text.includes('graphic')) return 'design';

    return 'business services';
  }

  private generateOneLineDescription(companyData: CompanyData, industry: string): string {
    const services = companyData.businessPositioning.valueProposition.slice(0, 2).join(' and ');
    return `${industry} company providing ${services}`;
  }

  private generateUniqueDifferentiators(companyData: CompanyData): string[] {
    const differentiators: string[] = [];

    if (companyData.businessPositioning.promise) {
      differentiators.push(companyData.businessPositioning.promise);
    }

    if (companyData.businessPositioning.tagline &&
        companyData.businessPositioning.tagline !== companyData.businessPositioning.promise) {
      differentiators.push(companyData.businessPositioning.tagline);
    }

    // Add generic differentiators if we don't have enough
    if (differentiators.length < 2) {
      differentiators.push('Data-driven approach', 'Proven methodology', 'Client-focused solutions');
    }

    return differentiators.slice(0, 3);
  }

  private generatePurposeGoals(companyData: CompanyData): string[] {
    const goals: string[] = [];

    if (companyData.contentGoals.authority) {
      goals.push('Establish thought leadership and industry expertise');
    }

    if (companyData.contentGoals.leadGeneration) {
      goals.push('Generate qualified leads through valuable content');
    }

    if (companyData.contentGoals.seo) {
      goals.push('Improve search visibility and organic traffic');
    }

    if (companyData.contentGoals.brandAwareness) {
      goals.push('Build brand awareness and recognition');
    }

    // Add default goals if none detected
    if (goals.length === 0) {
      goals.push(
        'Educate target audience on industry topics',
        'Drive website traffic and engagement',
        'Support sales and marketing efforts'
      );
    }

    return goals;
  }

  private generateAudiencePersonas(companyData: CompanyData, industry: string): Array<{
    persona: string;
    role: string;
    painPoints: string[];
    contentNeeds: string[];
  }> {
    const personas = [];

    if (industry === 'financial services') {
      personas.push(
        {
          persona: 'High Net Worth Individual',
          role: 'Experienced investor with significant wealth',
          painPoints: ['Managing investment risk', 'Ensuring consistent returns', 'Understanding fee structures'],
          contentNeeds: ['Performance case studies', 'Risk management insights', 'Market analysis']
        },
        {
          persona: 'Affluent Professional',
          role: 'Successful professional looking to grow wealth',
          painPoints: ['Limited investment knowledge', 'Time constraints', 'Risk vs reward balance'],
          contentNeeds: ['Investment education', 'Strategy comparisons', 'Performance explanations']
        }
      );
    } else if (industry === 'consulting') {
      personas.push(
        {
          persona: 'Business Owner',
          role: 'CEO/Founder of growing company',
          painPoints: ['Scaling challenges', 'Operational inefficiencies', 'Strategic direction'],
          contentNeeds: ['Growth frameworks', 'Case studies', 'Implementation guides']
        },
        {
          persona: 'C-Level Executive',
          role: 'Senior executive in established company',
          painPoints: ['Digital transformation', 'Market disruption', 'Team alignment'],
          contentNeeds: ['Strategic insights', 'Industry trends', 'Leadership guidance']
        }
      );
    } else {
      // Generic business personas
      personas.push(
        {
          persona: 'Business Decision Maker',
          role: 'Leader responsible for strategic decisions',
          painPoints: companyData.targetAudience.painPoints.length > 0 ?
            companyData.targetAudience.painPoints :
            ['Market uncertainty', 'Competitive pressure', 'Resource allocation'],
          contentNeeds: ['Strategic guidance', 'Best practices', 'Industry insights']
        }
      );
    }

    return personas.slice(0, 3);
  }

  private generateVoiceKeywords(companyData: CompanyData): string {
    return companyData.toneOfVoice.style.slice(0, 3).join(', ') || 'Professional, authoritative, trustworthy';
  }

  private generateToneLevel(industry: string): string {
    if (industry === 'financial services') {
      return 'Professional yet accessible, explaining complex concepts clearly';
    } else if (industry === 'legal') {
      return 'Formal but approachable, authoritative without being intimidating';
    } else {
      return 'Semi-formal, conversational yet expert';
    }
  }

  private extractBrandKeywords(companyData: CompanyData): string[] {
    const keywords: string[] = [];
    const text = `${companyData.businessPositioning.tagline} ${companyData.businessPositioning.promise}`.toLowerCase();

    if (text.includes('systematic') || text.includes('system')) keywords.push('Systematic');
    if (text.includes('data') || text.includes('driven')) keywords.push('Data-Driven');
    if (text.includes('transparent')) keywords.push('Transparent');
    if (text.includes('professional')) keywords.push('Professional');
    if (text.includes('innovative')) keywords.push('Innovative');

    // Add default keywords if none found
    if (keywords.length === 0) {
      keywords.push('Professional', 'Reliable', 'Expert');
    }

    return keywords.slice(0, 5);
  }

  private generateDefaultOutline(industry: string): string[] {
    if (industry === 'financial services') {
      return [
        'Market Context & Opportunity',
        'Strategic Approach & Methodology',
        'Implementation & Results',
        'Key Takeaways & Next Steps'
      ];
    } else if (industry === 'consulting') {
      return [
        'Challenge Identification',
        'Solution Framework',
        'Implementation Strategy',
        'Expected Outcomes'
      ];
    } else {
      return [
        'Problem Statement',
        'Solution Overview',
        'Implementation Guide',
        'Results & Benefits'
      ];
    }
  }

  private generatePrimaryKeywords(companyData: CompanyData, industry: string): string[] {
    const keywords: string[] = [];

    // Industry-based keywords
    keywords.push(`${industry} solutions`, `${industry} services`);

    // Company-specific keywords
    companyData.businessPositioning.valueProposition.forEach(vp => {
      keywords.push(vp.toLowerCase());
    });

    return [...new Set(keywords)].slice(0, 6);
  }

  private generateInternalLinkTargets(companyData: CompanyData): string[] {
    const targets: string[] = ['About Us', 'Contact', 'Services'];

    companyData.businessPositioning.valueProposition.forEach(service => {
      targets.push(`${service} page`);
    });

    return targets.slice(0, 6);
  }

  private generateExternalSources(industry: string): string[] {
    if (industry === 'financial services') {
      return ['Financial publications', 'Government financial sites', 'Industry research'];
    } else if (industry === 'consulting') {
      return ['Harvard Business Review', 'McKinsey', 'Industry reports'];
    } else {
      return ['Industry publications', 'Research institutions', 'Government sources'];
    }
  }

  private generateContentRequirements(industry: string): string[] {
    const requirements = [
      'Factual accuracy with verified data and statistics',
      'Clear explanations of technical concepts',
      'Real-world examples and case studies',
      'Actionable insights and next steps'
    ];

    if (industry === 'financial services') {
      requirements.push('Regulatory compliance and disclaimers');
    } else if (industry === 'legal') {
      requirements.push('Legal accuracy and current regulations');
    }

    return requirements;
  }

  private generateCTATypes(companyData: CompanyData, industry: string): string[] {
    const types: string[] = [];

    if (companyData.contentGoals.leadGeneration) {
      types.push('Free consultation', 'Download resource');
    }

    if (industry === 'financial services') {
      types.push('Portfolio analysis', 'Investment consultation');
    } else if (industry === 'consulting') {
      types.push('Strategy session', 'Business assessment');
    } else {
      types.push('Learn more', 'Get started');
    }

    return types.slice(0, 4);
  }

  private generateCTATone(industry: string): string {
    if (industry === 'financial services') {
      return 'Professional and helpful, focusing on value and education';
    } else if (industry === 'consulting') {
      return 'Confident and solution-oriented, emphasizing results';
    } else {
      return 'Friendly and professional, emphasizing benefits';
    }
  }

  private generateCTAExamples(companyData: CompanyData, industry: string): string[] {
    const companyName = companyData.name.split(' ')[0];

    if (industry === 'financial services') {
      return [
        'Get personalized investment guidance → Schedule Consultation',
        'See how your portfolio compares → Request Analysis',
        'Explore investment strategies → Learn More'
      ];
    } else if (industry === 'consulting') {
      return [
        `Transform your business with ${companyName} → Get Started`,
        'Schedule a strategy session → Contact Us',
        'Download our methodology → Access Resources'
      ];
    } else {
      return [
        'Ready to get started? → Contact Us',
        'Learn more about our services → Explore',
        'Get expert guidance → Schedule Call'
      ];
    }
  }

  private generateQualityChecklistFromTemplate(templateChecklist: any[], industry: string): any[] {
    // Start with template structure if available
    let checklist = templateChecklist && templateChecklist.length > 0 ?
      JSON.parse(JSON.stringify(templateChecklist)) : [];

    // Add default checklist items if template is empty
    if (checklist.length === 0) {
      checklist = [
        { "item": "Title includes primary keyword and ≤ 60 characters", "passed": null, "notes": "" },
        { "item": "Meta description optimized (150-160 chars)", "passed": null, "notes": "" },
        { "item": "Content provides actionable value", "passed": null, "notes": "" },
        { "item": "Internal links included naturally", "passed": null, "notes": "" },
        { "item": "Visual elements have descriptive alt text", "passed": null, "notes": "" }
      ];
    }

    // Add industry-specific items
    if (industry === 'financial services') {
      checklist.push(
        { "item": "Performance data cited and sourced", "passed": null, "notes": "" },
        { "item": "Risk disclaimers included where needed", "passed": null, "notes": "" }
      );
    } else if (industry === 'legal') {
      checklist.push(
        { "item": "Legal accuracy verified", "passed": null, "notes": "" },
        { "item": "Current regulations referenced", "passed": null, "notes": "" }
      );
    }

    return checklist;
  }


  private generateSampleTopics(companyData: CompanyData, industry: string): string[] {
    if (industry === 'financial services') {
      return [
        'Portfolio Management vs Mutual Funds: Which Strategy Fits Your Goals?',
        'Understanding Investment Risk: A Complete Guide',
        'Tax-Efficient Investment Strategies for Professionals',
        'How to Choose the Right Portfolio Manager',
        'Market Volatility and Your Investment Strategy'
      ];
    } else if (industry === 'consulting') {
      return [
        'The Complete Guide to Business Transformation',
        'Scaling Your Business: Systematic Approaches That Work',
        'Digital Transformation: Beyond Technology',
        'Leadership in Times of Change',
        'Measuring Business Performance: KPIs That Drive Growth'
      ];
    } else {
      const service = companyData.businessPositioning.valueProposition[0] || 'services';
      return [
        `How to Choose the Right ${service} for Your Business`,
        `The Complete Guide to ${service}: Best Practices`,
        `Common Mistakes in ${service} and How to Avoid Them`,
        `ROI of Professional ${service}: What to Expect`,
        `Future Trends in ${service}: Preparing for Change`
      ];
    }
  }

  private getDefaultTemplate(): any {
    return {
      "company": "<company name>",
      "website": "<company website or landing page>",
      "oneLineDescription": "<one-line business summary>",
      "brandBackground": {
        "mission": "<mission / positioning>",
        "productsServices": ["<service 1>", "<service 2>"],
        "uniqueDifferentiators": ["<differentiator 1>", "<differentiator 2>"]
      },
      "purposeGoals": [
        "<primary content goal 1>",
        "<goal 2>"
      ],
      "audiencePersonas": [
        {
          "persona": "<persona name>",
          "role": "<role/title>",
          "painPoints": ["<pain1>", "<pain2>"],
          "contentNeeds": ["<need1>", "<need2>"]
        }
      ],
      "toneStyle": {
        "voice": "<voice keywords (e.g., authoritative, friendly)>",
        "tone": "<formality>",
        "perspective": "<we/you/mix>",
        "brandKeywords": ["<kw1>", "<kw2>"]
      },
      "blogStructure": {
        "headlineGuidelines": "<rules>",
        "introGuidelines": "<rules>",
        "defaultOutline": ["<H2 1>", "<H2 2>", "<H2 3>"],
        "visualGuidelines": "<image/chart rules>"
      },
      "seoGuidelines": {
        "primaryKeywordExamples": ["<k1>", "<k2>"],
        "keywordPlacementRules": ["<where>"],
        "metaLengths": {"titleMax": 60, "descriptionMax": 160},
        "internalLinkTargets": ["<url1>", "<url2>"],
        "externalSourcesPreferred": ["<domain1>", "<domain2>"]
      },
      "contentRequirements": [
        "<requirement 1>",
        "<requirement 2>"
      ],
      "visualsMedia": {
        "featuredImageRequired": true,
        "inPostImages": 2,
        "allowedSources": ["CompanyAssets", "Stock", "CustomCharts"],
        "altTextRule": "<rule>"
      },
      "cta": {
        "primaryTypes": ["<CTA type 1>", "<CTA type 2>"],
        "placement": ["End", "Mid optional"],
        "tone": "<CTA tone>",
        "exampleCopy": ["<example CTA copy>"]
      },
      "formattingSubmission": {
        "outputFormats": ["markdown", "google-docs"],
        "fileNamingPattern": "<YYYY-MM-DD-topic-keyword>",
        "workflow": ["Draft", "Legal/Compliance review", "SEO review", "Publish"]
      },
      "qualityChecklist": [
        {"item": "Title contains keyword", "passed": null, "notes": ""},
        {"item": "Meta description present", "passed": null, "notes": ""}
      ],
      "sampleTopics": ["<topic 1>", "<topic 2>"]
    };
  }

  private cleanTagline(tagline: string): string {
    // Clean up extracted tagline
    return tagline
      .replace(/^\s*[•\-→]\s*/, '') // Remove bullet points
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 150); // Limit length
  }

  private filterAndPrioritizeServices(services: string[]): string[] {
    // Priority scoring for services
    const priorityTerms = ['marketing', 'consulting', 'strategy', 'development', 'management'];
    const blacklistTerms = ['cookie', 'privacy', 'terms', 'contact', 'about'];

    return services
      .filter(service => {
        const lower = service.toLowerCase();
        // Filter out blacklisted terms
        if (blacklistTerms.some(term => lower.includes(term))) return false;
        // Must have meaningful length
        if (service.length < 5 || service.length > 50) return false;
        // Must contain relevant business terms
        return priorityTerms.some(term => lower.includes(term)) ||
               lower.includes('services') ||
               lower.includes('solutions');
      })
      .sort((a, b) => {
        // Sort by priority - services with priority terms come first
        const aPriority = priorityTerms.some(term => a.toLowerCase().includes(term)) ? 1 : 0;
        const bPriority = priorityTerms.some(term => b.toLowerCase().includes(term)) ? 1 : 0;
        return bPriority - aPriority;
      });
  }

  private validateWritingInstructions(instructions: any): boolean {
    // Basic validation to ensure quality
    const requiredFields = ['company', 'website', 'oneLineDescription'];

    for (const field of requiredFields) {
      if (!instructions[field] || instructions[field].includes('not found')) {
        return false;
      }
    }

    // Check if we have meaningful brand background
    if (!instructions.brandBackground.mission ||
        instructions.brandBackground.mission.includes('not found') ||
        instructions.brandBackground.productsServices.length === 0) {
      return false;
    }

    return true;
  }

  private async enhanceWritingInstructions(instructions: any, websiteUrl: string): Promise<any> {
    // Create a copy to modify
    const enhanced = JSON.parse(JSON.stringify(instructions));

    try {
      // Try additional extraction methods for missing or poor quality data

      // Enhance mission if it's generic or missing
      if (!enhanced.brandBackground.mission || enhanced.brandBackground.mission.includes('not found')) {
        logger.updateSpinner('Extracting better mission statement...');

        // Try multiple extraction approaches
        const alternativeMissions = await this.extractAlternativeMissions(websiteUrl);
        if (alternativeMissions.length > 0) {
          enhanced.brandBackground.mission = alternativeMissions[0];
        }
      }

      // Enhance services if too generic
      if (enhanced.brandBackground.productsServices.length <= 3 ||
          enhanced.brandBackground.productsServices.some((s: string) => s.includes('Professional Services'))) {
        logger.updateSpinner('Extracting better service descriptions...');

        const betterServices = await this.extractAlternativeServices(websiteUrl);
        if (betterServices.length > 0) {
          enhanced.brandBackground.productsServices = betterServices;
        }
      }

      // Enhance tagline if it's generic
      if (enhanced.brandBackground.uniqueDifferentiators.some((d: string) => d.includes('not found'))) {
        logger.updateSpinner('Extracting better differentiators...');

        const betterDifferentiators = await this.extractAlternativeDifferentiators(websiteUrl);
        if (betterDifferentiators.length > 0) {
          enhanced.brandBackground.uniqueDifferentiators = betterDifferentiators;
        }
      }

      return enhanced;
    } catch (error) {
      logger.warn(`Enhancement failed: ${(error as Error).message}`);
      return instructions;
    }
  }

  private async extractAlternativeMissions(websiteUrl: string): Promise<string[]> {
    const missions: string[] = [];
    const pagesToTry = [`${websiteUrl}/about`, `${websiteUrl}/why-us`, `${websiteUrl}/story`];

    for (const pageUrl of pagesToTry) {
      try {
        const data = await this.scraper.scrapePageContent(pageUrl);

        // Look for mission-like statements with broader patterns
        const missionPatterns = [
          /we(?:\s+are|\s+specialize\s+in|\s+focus\s+on)[^.]{30,200}\./gi,
          /our\s+(?:goal|vision|mission|purpose)[^.]{20,200}\./gi,
          /helping\s+(?:businesses|companies|clients)[^.]{20,200}\./gi,
          /dedicated\s+to[^.]{20,200}\./gi
        ];

        for (const content of data.content) {
          for (const pattern of missionPatterns) {
            const matches = content.match(pattern);
            if (matches) {
              matches.forEach(match => {
                const cleaned = match.trim();
                if (cleaned.length > 30 && cleaned.length < 250) {
                  missions.push(cleaned);
                }
              });
            }
          }
        }
      } catch {
        continue;
      }
    }

    return missions.slice(0, 3);
  }

  private async extractAlternativeServices(websiteUrl: string): Promise<string[]> {
    const services: string[] = [];
    const pagesToTry = [
      `${websiteUrl}/services`,
      `${websiteUrl}/what-we-do`,
      `${websiteUrl}/solutions`,
      `${websiteUrl}/expertise`
    ];

    for (const pageUrl of pagesToTry) {
      try {
        const data = await this.scraper.scrapePageContent(pageUrl);

        // Look for service descriptions in headers and structured content
        for (const content of data.content) {
          // Look for service-like headings and descriptions
          if (content.length > 15 && content.length < 80) {
            const lower = content.toLowerCase();
            if ((lower.includes('marketing') || lower.includes('consulting') ||
                 lower.includes('strategy') || lower.includes('development')) &&
                !lower.includes('cookie') && !lower.includes('privacy')) {
              services.push(content.trim());
            }
          }
        }
      } catch {
        continue;
      }
    }

    return [...new Set(services)].slice(0, 6);
  }

  private async extractAlternativeDifferentiators(websiteUrl: string): Promise<string[]> {
    const differentiators: string[] = [];
    const pagesToTry = [`${websiteUrl}/why-choose-us`, `${websiteUrl}/about`, websiteUrl];

    for (const pageUrl of pagesToTry) {
      try {
        const data = await this.scraper.scrapePageContent(pageUrl);

        // Look for differentiator patterns
        const differentiatorPatterns = [
          /(?:what makes us|why choose us|our advantage)[^.]{20,150}\./gi,
          /(?:experienced|proven|trusted|certified)[^.]{20,150}\./gi,
          /(?:unique|different|specialized)[^.]{20,150}\./gi
        ];

        for (const content of data.content) {
          for (const pattern of differentiatorPatterns) {
            const matches = content.match(pattern);
            if (matches) {
              matches.forEach(match => {
                const cleaned = match.trim();
                if (cleaned.length > 20 && cleaned.length < 150) {
                  differentiators.push(cleaned);
                }
              });
            }
          }
        }
      } catch {
        continue;
      }
    }

    return differentiators.slice(0, 3);
  }
}