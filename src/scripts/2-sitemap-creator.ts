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
    logger.script(1, 'Comprehensive Sitemap Creator'); // Updated to Script 1

    try {
      if (!config.websiteUrl) {
        throw new Error('Website URL is required for comprehensive sitemap creation');
      }

      logger.startSpinner('Creating comprehensive website sitemap...');

      // Phase 1: Standard website crawling
      logger.updateSpinner('Phase 1: Discovering website pages via crawling...');
      const crawledUrls = await this.scraper.createSitemap(config.websiteUrl);

      // Phase 2: Smart page discovery using common patterns
      logger.updateSpinner('Phase 2: Discovering pages via common URL patterns...');
      const discoveredUrls = await this.discoverAdditionalPages(config.websiteUrl);

      // Phase 3: Sitemap.xml discovery
      logger.updateSpinner('Phase 3: Checking for sitemap.xml...');
      const sitemapUrls = await this.discoverFromSitemap(config.websiteUrl);

      // Combine and deduplicate all URLs
      const allUrls = [...new Set([...crawledUrls, ...discoveredUrls, ...sitemapUrls])];

      // Phase 4: Validate and categorize URLs
      logger.updateSpinner('Phase 4: Validating and categorizing discovered pages...');
      const validatedUrls = await this.validateAndCategorizeUrls(allUrls, config.websiteUrl);

      // Sort URLs by type and importance for better processing order
      const sortedUrls = this.sortUrlsByImportance(validatedUrls);

      // Save comprehensive sitemap
      logger.updateSpinner('Saving comprehensive sitemap...');
      await this.fileManager.saveSitemap(config.companyPath, sortedUrls);

      logger.stopSpinner();
      logger.success('Comprehensive sitemap created successfully!');

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

  private async discoverAdditionalPages(websiteUrl: string): Promise<string[]> {
    const baseUrl = new URL(websiteUrl).origin;
    const commonPaths = [
      // Core business pages
      '/about', '/about-us', '/about-company', '/who-we-are', '/our-story',
      '/services', '/what-we-do', '/solutions', '/offerings', '/consulting',
      '/products', '/portfolio', '/work', '/case-studies', '/clients',
      '/contact', '/contact-us', '/get-in-touch', '/reach-us',

      // Team and company info
      '/team', '/our-team', '/leadership', '/management', '/founders',
      '/careers', '/jobs', '/join-us', '/work-with-us',
      '/news', '/press', '/media', '/announcements',

      // Resources and content
      '/blog', '/insights', '/articles', '/resources', '/knowledge',
      '/whitepapers', '/guides', '/downloads', '/library',
      '/faq', '/faqs', '/help', '/support', '/documentation',

      // Business specific
      '/industries', '/sectors', '/expertise', '/specialties',
      '/approach', '/methodology', '/process', '/how-we-work',
      '/why-us', '/why-choose-us', '/advantages', '/benefits',
      '/testimonials', '/reviews', '/success-stories', '/results',

      // Legal and policy
      '/privacy', '/privacy-policy', '/terms', '/terms-of-service',
      '/legal', '/disclaimer', '/cookies', '/gdpr'
    ];

    const discoveredUrls: string[] = [];

    for (const path of commonPaths) {
      try {
        const testUrl = `${baseUrl}${path}`;
        const pageContent = await this.scraper.scrapePageContent(testUrl);

        if (pageContent && pageContent.content.length > 0) {
          discoveredUrls.push(testUrl);
        }
      } catch (error) {
        // Page doesn't exist or isn't accessible, continue
        continue;
      }
    }

    return discoveredUrls;
  }

  private async discoverFromSitemap(websiteUrl: string): Promise<string[]> {
    try {
      const baseUrl = new URL(websiteUrl).origin;
      const sitemapUrls = [`${baseUrl}/sitemap.xml`, `${baseUrl}/sitemap_index.xml`];

      for (const sitemapUrl of sitemapUrls) {
        try {
          const pageContent = await this.scraper.scrapePageContent(sitemapUrl);
          if (pageContent && pageContent.content.length > 0) {
            // Basic XML parsing for URLs - look for <loc> tags
            const xmlContent = pageContent.content.join('\n');
            const urlMatches = xmlContent.match(/<loc>(.*?)<\/loc>/g);

            if (urlMatches) {
              return urlMatches.map(match => match.replace(/<\/?loc>/g, '').trim());
            }
          }
        } catch (error) {
          continue;
        }
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  private async validateAndCategorizeUrls(urls: string[], baseWebsiteUrl: string): Promise<string[]> {
    const baseUrl = new URL(baseWebsiteUrl).origin;
    const validUrls: string[] = [];

    for (const url of urls) {
      try {
        // Only include URLs from the same domain
        if (url.startsWith(baseUrl)) {
          // Basic validation - try to access the page
          const pageContent = await this.scraper.scrapePageContent(url);

          if (pageContent && pageContent.content.length > 0) {
            // Filter out common non-content pages
            const urlLower = url.toLowerCase();
            const skipPatterns = [
              '/wp-admin', '/admin', '/login', '/logout', '/register',
              '/cart', '/checkout', '/account', '/dashboard',
              '/search', '/tag/', '/category/', '/author/',
              '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
              '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico',
              '.css', '.js', '.xml', '.json', '.zip', '.rar'
            ];

            const shouldSkip = skipPatterns.some(pattern => urlLower.includes(pattern));

            if (!shouldSkip) {
              validUrls.push(url);
            }
          }
        }
      } catch (error) {
        // Page not accessible, skip it
        continue;
      }
    }

    return [...new Set(validUrls)]; // Remove duplicates
  }
}