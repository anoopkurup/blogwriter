import { WebScraper } from '../shared/webscraper.js';
import { FileManager } from '../shared/fileManager.js';
import { logger } from '../shared/logger.js';
import { ScriptConfig, InternalLink } from '../types/index.js';

export class InternalLinksScript {
  private scraper: WebScraper;
  private fileManager: FileManager;

  constructor() {
    this.scraper = new WebScraper();
    this.fileManager = new FileManager();
  }

  async execute(config: ScriptConfig): Promise<void> {
    logger.script(2, 'Content Analysis & Internal Links'); // Updated to Script 2

    try {
      // Load comprehensive sitemap from Script 1
      logger.startSpinner('Loading comprehensive sitemap...');
      const urls = await this.fileManager.loadSitemap(config.companyPath);

      if (urls.length === 0) {
        throw new Error('No sitemap found. Please run Script 1 (Sitemap Creator) first.');
      }

      logger.updateSpinner('Analyzing pages for content and internal linking opportunities...');

      const internalLinks: InternalLink[] = [];
      const comprehensiveContent: any = {
        allPageContents: [],
        contentByCategory: {
          homepage: [],
          about: [],
          services: [],
          products: [],
          team: [],
          resources: [],
          blog: [],
          contact: [],
          other: []
        },
        businessInsights: {
          services: new Set(),
          industries: new Set(),
          keyTerms: new Set(),
          teamInfo: new Set(),
          testimonials: [],
          caseStudies: []
        }
      };

      // Analyze each URL for content and linking opportunities
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        logger.updateSpinner(`Analyzing page ${i + 1}/${urls.length}: ${this.getShortUrl(url)}`);

        try {
          // Get detailed page analysis
          const pageData = await this.scraper.analyzePage(url);

          // Get comprehensive page content
          const pageContent = await this.scraper.scrapePageContent(url);

          // Create internal link entry
          const internalLink: InternalLink = {
            url: pageData.url,
            title: pageData.title,
            pageType: pageData.pageType,
            usageNotes: this.generateUsageNotes(pageData),
            suggestedAnchorText: pageData.linkingOpportunities.suggestedAnchorText,
            contextualRelevance: pageData.linkingOpportunities.contextualRelevance
          };

          internalLinks.push(internalLink);

          // Collect comprehensive content for AI analysis
          const pageContentData = {
            url,
            title: pageData.title,
            type: pageData.pageType,
            content: pageContent.content,
            extractedInfo: this.extractBusinessInfo(pageContent.content, pageData.pageType)
          };

          comprehensiveContent.allPageContents.push(pageContentData);
          this.categorizeContent(pageContentData, comprehensiveContent.contentByCategory);
          this.extractBusinessInsights(pageContentData, comprehensiveContent.businessInsights);

        } catch (pageError) {
          logger.warn(`Failed to analyze ${url}: ${(pageError as Error).message}`);

          // Add basic entry for failed pages
          internalLinks.push({
            url,
            title: 'Failed to analyze',
            pageType: 'other',
            usageNotes: 'Analysis failed - manual review required',
            suggestedAnchorText: [this.extractUrlTitle(url)],
            contextualRelevance: 'Unknown - requires manual analysis'
          });
        }
      }

      // Sort by importance
      const sortedLinks = this.sortLinksByImportance(internalLinks);

      // Convert Sets to Arrays for JSON serialization
      comprehensiveContent.businessInsights.services = Array.from(comprehensiveContent.businessInsights.services);
      comprehensiveContent.businessInsights.industries = Array.from(comprehensiveContent.businessInsights.industries);
      comprehensiveContent.businessInsights.keyTerms = Array.from(comprehensiveContent.businessInsights.keyTerms);
      comprehensiveContent.businessInsights.teamInfo = Array.from(comprehensiveContent.businessInsights.teamInfo);

      // Save internal links data
      logger.updateSpinner('Saving internal links analysis...');
      await this.fileManager.saveInternalLinks(config.companyPath, sortedLinks);

      // Save comprehensive content analysis for AI writing instructions
      logger.updateSpinner('Saving comprehensive content analysis...');
      await this.fileManager.saveComprehensiveContent(config.companyPath, comprehensiveContent);

      logger.stopSpinner();
      logger.success('Content analysis and internal links completed!');

      // Display summary
      console.log('');
      logger.subsection('Internal Links Analysis Summary:');
      logger.list([
        `Total pages analyzed: ${sortedLinks.length}`,
        `Homepage: ${this.countByType(sortedLinks, 'homepage')} pages`,
        `Service pages: ${this.countByType(sortedLinks, 'service')} pages`,
        `Blog articles: ${this.countByType(sortedLinks, 'blog')} pages`,
        `Product pages: ${this.countByType(sortedLinks, 'product')} pages`,
        `About/Contact: ${this.countByType(sortedLinks, 'about')} + ${this.countByType(sortedLinks, 'contact')} pages`,
        `Other pages: ${this.countByType(sortedLinks, 'other')} pages`
      ]);

      const fileName = `${config.companyName}-internal-links.json`;
      logger.info(`File saved: ${config.companyPath}/${fileName}`);

      // Show high-priority links
      console.log('');
      logger.subsection('High-Priority Links for Blog Content:');
      const highPriorityLinks = sortedLinks
        .filter(link => ['homepage', 'service', 'about', 'contact'].includes(link.pageType))
        .slice(0, 5);

      highPriorityLinks.forEach(link => {
        console.log(`  • ${link.title} (${link.pageType})`);
        console.log(`    Usage: ${link.usageNotes}`);
        console.log(`    Anchor text: ${link.suggestedAnchorText.slice(0, 2).join(', ')}`);
        console.log('');
      });

    } catch (error) {
      logger.stopSpinner(false);
      throw new Error(`Script 3 failed: ${(error as Error).message}`);
    }
  }

  private generateUsageNotes(pageData: any): string {
    const notes = [];

    // When to link
    notes.push(`WHEN: ${pageData.linkingOpportunities.whenToLink}`);

    // Contextual relevance
    notes.push(`CONTEXT: ${pageData.linkingOpportunities.contextualRelevance}`);

    // Page type specific guidance
    switch (pageData.pageType) {
      case 'homepage':
        notes.push('PRIORITY: High - Use for general company introductions');
        break;
      case 'service':
        notes.push('PRIORITY: High - Critical for conversion and service explanation');
        break;
      case 'about':
        notes.push('PRIORITY: Medium - Great for authority building and credibility');
        break;
      case 'contact':
        notes.push('PRIORITY: High - Essential for call-to-action sections');
        break;
      case 'blog':
        notes.push('PRIORITY: Medium - Use for related topics and additional context');
        break;
      case 'product':
        notes.push('PRIORITY: High - Direct conversion opportunity');
        break;
      default:
        notes.push('PRIORITY: Low - Use when contextually relevant');
    }

    return notes.join(' | ');
  }

  private sortLinksByImportance(links: InternalLink[]): InternalLink[] {
    const importance = {
      homepage: 10,
      service: 9,
      product: 8,
      about: 7,
      contact: 6,
      blog: 5,
      other: 1
    };

    return links.sort((a, b) => {
      const aScore = importance[a.pageType as keyof typeof importance] || 0;
      const bScore = importance[b.pageType as keyof typeof importance] || 0;
      return bScore - aScore;
    });
  }

  private countByType(links: InternalLink[], type: string): number {
    return links.filter(link => link.pageType === type).length;
  }

  private getShortUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return url.slice(0, 50) + (url.length > 50 ? '...' : '');
    }
  }

  private extractUrlTitle(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
      if (pathParts.length > 0) {
        return pathParts[pathParts.length - 1]
          .replace(/-/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
      }
      return 'Homepage';
    } catch {
      return 'Unknown Page';
    }
  }

  private extractBusinessInfo(content: string[], pageType: string): any {
    const allText = content.join(' ').toLowerCase();

    const businessInfo: any = {
      keyTerms: [],
      services: [],
      industries: [],
      teamMembers: [],
      testimonials: [],
      caseStudies: []
    };

    // Extract services based on page type and content
    if (pageType === 'service' || allText.includes('service') || allText.includes('solution')) {
      const serviceKeywords = [
        'consulting', 'advisory', 'strategy', 'planning', 'implementation',
        'analysis', 'research', 'development', 'management', 'optimization',
        'digital transformation', 'marketing', 'sales', 'operations'
      ];

      serviceKeywords.forEach(keyword => {
        if (allText.includes(keyword)) {
          businessInfo.services.push(keyword);
        }
      });
    }

    // Extract industry information
    const industryKeywords = [
      'healthcare', 'finance', 'technology', 'manufacturing', 'retail',
      'education', 'non-profit', 'government', 'startup', 'enterprise',
      'b2b', 'b2c', 'saas', 'fintech', 'healthtech'
    ];

    industryKeywords.forEach(keyword => {
      if (allText.includes(keyword)) {
        businessInfo.industries.push(keyword);
      }
    });

    // Extract team information
    if (pageType === 'team' || allText.includes('team') || allText.includes('leadership')) {
      content.forEach(item => {
        if (item.toLowerCase().includes('ceo') ||
            item.toLowerCase().includes('founder') ||
            item.toLowerCase().includes('director') ||
            item.toLowerCase().includes('manager')) {
          businessInfo.teamMembers.push(item.trim());
        }
      });
    }

    // Extract testimonials and case studies
    content.forEach(item => {
      if (item.length > 50 && item.length < 500) {
        if (item.toLowerCase().includes('testimonial') ||
            item.toLowerCase().includes('"') ||
            item.toLowerCase().includes('review')) {
          businessInfo.testimonials.push(item.trim());
        }

        if (item.toLowerCase().includes('case study') ||
            item.toLowerCase().includes('success story') ||
            item.toLowerCase().includes('client story')) {
          businessInfo.caseStudies.push(item.trim());
        }
      }
    });

    return businessInfo;
  }

  private categorizeContent(pageData: any, contentByCategory: any): void {
    const { type, content } = pageData;

    switch (type) {
      case 'homepage':
        contentByCategory.homepage.push(pageData);
        break;
      case 'about':
        contentByCategory.about.push(pageData);
        break;
      case 'service':
        contentByCategory.services.push(pageData);
        break;
      case 'product':
        contentByCategory.products.push(pageData);
        break;
      case 'team':
        contentByCategory.team.push(pageData);
        break;
      case 'blog':
        contentByCategory.blog.push(pageData);
        break;
      case 'contact':
        contentByCategory.contact.push(pageData);
        break;
      default:
        if (pageData.url.toLowerCase().includes('resource') ||
            pageData.url.toLowerCase().includes('download') ||
            pageData.url.toLowerCase().includes('guide')) {
          contentByCategory.resources.push(pageData);
        } else {
          contentByCategory.other.push(pageData);
        }
    }
  }

  private extractBusinessInsights(pageData: any, businessInsights: any): void {
    const extractedInfo = pageData.extractedInfo;

    // Add services
    extractedInfo.services.forEach((service: string) => {
      businessInsights.services.add(service);
    });

    // Add industries
    extractedInfo.industries.forEach((industry: string) => {
      businessInsights.industries.add(industry);
    });

    // Add team info
    extractedInfo.teamMembers.forEach((member: string) => {
      businessInsights.teamInfo.add(member);
    });

    // Add testimonials
    extractedInfo.testimonials.forEach((testimonial: string) => {
      if (testimonial.length > 20) {
        businessInsights.testimonials.push(testimonial);
      }
    });

    // Add case studies
    extractedInfo.caseStudies.forEach((caseStudy: string) => {
      if (caseStudy.length > 20) {
        businessInsights.caseStudies.push(caseStudy);
      }
    });

    // Extract key terms from content
    const allText = pageData.content.join(' ').toLowerCase();
    const keyTermPatterns = [
      /\b\w+ing\b/g, // -ing words (consulting, marketing, etc.)
      /\b\w+tion\b/g, // -tion words (solution, implementation, etc.)
      /\b\w+ment\b/g, // -ment words (management, development, etc.)
      /\b\w+ence\b/g, // -ence words (experience, excellence, etc.)
    ];

    keyTermPatterns.forEach(pattern => {
      const matches = allText.match(pattern);
      if (matches) {
        matches.forEach((match: string) => {
          if (match.length > 4 && match.length < 20) {
            businessInsights.keyTerms.add(match);
          }
        });
      }
    });
  }
}