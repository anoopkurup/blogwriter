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
    logger.script(3, 'Internal Links Analyzer');

    try {
      // Load sitemap from Script 2
      logger.startSpinner('Loading sitemap...');
      const urls = await this.fileManager.loadSitemap(config.companyPath);

      if (urls.length === 0) {
        throw new Error('No sitemap found. Please run Script 2 (Sitemap Creator) first.');
      }

      logger.updateSpinner('Analyzing pages for internal linking opportunities...');

      const internalLinks: InternalLink[] = [];

      // Analyze each URL for linking opportunities
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        logger.updateSpinner(`Analyzing page ${i + 1}/${urls.length}: ${this.getShortUrl(url)}`);

        try {
          const pageData = await this.scraper.analyzePage(url);

          const internalLink: InternalLink = {
            url: pageData.url,
            title: pageData.title,
            pageType: pageData.pageType,
            usageNotes: this.generateUsageNotes(pageData),
            suggestedAnchorText: pageData.linkingOpportunities.suggestedAnchorText,
            contextualRelevance: pageData.linkingOpportunities.contextualRelevance
          };

          internalLinks.push(internalLink);

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

      // Save internal links data
      logger.updateSpinner('Saving internal links analysis...');
      await this.fileManager.saveInternalLinks(config.companyPath, sortedLinks);

      logger.stopSpinner();
      logger.success('Internal links analysis completed!');

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
}