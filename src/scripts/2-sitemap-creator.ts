import { WebScraper } from '../shared/webscraper.js';
import { FileManager } from '../shared/fileManager.js';
import { logger } from '../shared/logger.js';
import { ScriptConfig } from '../types/index.js';

export class SitemapCreatorScript {
  private scraper: WebScraper;
  private fileManager: FileManager;

  constructor() {
    this.scraper = new WebScraper();
    this.fileManager = new FileManager();
  }

  async execute(config: ScriptConfig): Promise<void> {
    logger.script(2, 'Sitemap Creator');

    try {
      // Check if we have company data to get the website URL
      let websiteUrl = config.websiteUrl;

      if (!websiteUrl) {
        // Try to load from existing company data
        try {
          const companyDataPath = `${config.companyPath}/company-data.yaml`;
          // For now, we'll require the website URL to be provided
          throw new Error('Website URL is required for sitemap creation');
        } catch {
          throw new Error('Website URL is required for sitemap creation. Please provide it or run Script 1 first.');
        }
      }

      logger.startSpinner('Creating comprehensive sitemap...');

      // Create sitemap by crawling the website
      logger.updateSpinner('Discovering website pages...');
      const urls = await this.scraper.createSitemap(websiteUrl);

      // Sort URLs by type and importance
      const sortedUrls = this.sortUrlsByImportance(urls);

      // Save sitemap
      logger.updateSpinner('Saving sitemap...');
      await this.fileManager.saveSitemap(config.companyPath, sortedUrls);

      logger.stopSpinner();
      logger.success('Sitemap created successfully!');

      // Display summary
      console.log('');
      logger.subsection('Sitemap Summary:');
      logger.list([
        `Total pages discovered: ${sortedUrls.length}`,
        `Homepage: ${this.countPageType(sortedUrls, 'homepage')} pages`,
        `Service pages: ${this.countPageType(sortedUrls, 'service')} pages`,
        `Blog articles: ${this.countPageType(sortedUrls, 'blog')} pages`,
        `Product pages: ${this.countPageType(sortedUrls, 'product')} pages`,
        `About/Contact: ${this.countPageType(sortedUrls, 'about|contact')} pages`
      ]);

      const fileName = `${config.companyName}-sitemap`;
      logger.info(`File saved: ${config.companyPath}/${fileName}`);

      // Show first few URLs as preview
      console.log('');
      logger.subsection('Sample URLs:');
      sortedUrls.slice(0, 5).forEach(url => {
        console.log(`  • ${url}`);
      });

      if (sortedUrls.length > 5) {
        console.log(`  ... and ${sortedUrls.length - 5} more`);
      }

    } catch (error) {
      logger.stopSpinner(false);
      throw new Error(`Script 2 failed: ${(error as Error).message}`);
    }
  }

  private sortUrlsByImportance(urls: string[]): string[] {
    // Sort URLs by importance and type
    return urls.sort((a, b) => {
      const scoreA = this.getUrlImportanceScore(a);
      const scoreB = this.getUrlImportanceScore(b);
      return scoreB - scoreA;
    });
  }

  private getUrlImportanceScore(url: string): number {
    const urlLower = url.toLowerCase();

    // Homepage gets highest priority
    if (urlLower.match(/\/(index|home)?$/) || url.split('/').length <= 4) {
      return 100;
    }

    // Core pages
    if (urlLower.includes('/about')) return 90;
    if (urlLower.includes('/contact')) return 85;

    // Service/product pages
    if (urlLower.includes('/service') || urlLower.includes('/solution')) return 80;
    if (urlLower.includes('/product')) return 75;

    // Blog/content pages
    if (urlLower.includes('/blog') || urlLower.includes('/article')) return 60;
    if (urlLower.includes('/news')) return 55;

    // Other pages
    if (urlLower.includes('/team')) return 50;
    if (urlLower.includes('/portfolio')) return 45;

    // Default score for other pages
    return 30;
  }

  private countPageType(urls: string[], type: string): number {
    const patterns = type.split('|');
    return urls.filter(url => {
      const urlLower = url.toLowerCase();
      return patterns.some(pattern => {
        if (pattern === 'homepage') {
          return urlLower.match(/\/(index|home)?$/) || url.split('/').length <= 4;
        }
        return urlLower.includes(`/${pattern}`);
      });
    }).length;
  }
}