import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import { CompanyData, SitePage } from '../types/index.js';
import { config } from './config.js';
import { logger } from './logger.js';

export class WebScraper {
  private readonly userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

  async scrapeCompanyData(websiteUrl: string): Promise<CompanyData> {
    try {
      logger.updateSpinner('Loading website...');

      // Fetch page using axios instead of Puppeteer
      const response = await axios.get(websiteUrl, {
        timeout: config.scraping.timeout,
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      });

      const $ = cheerio.load(response.data);

      logger.updateSpinner('Extracting business data...');

      // Extract basic company info
      const companyName = this.extractCompanyName($, websiteUrl);

      // Extract business positioning
      const businessPositioning = {
        tagline: this.extractTagline($),
        promise: this.extractPromise($),
        valueProposition: this.extractValueProposition($)
      };

      // Extract target audience info
      const targetAudience = {
        segments: this.extractTargetSegments($),
        painPoints: this.extractPainPoints($),
        decisionTriggers: this.extractDecisionTriggers($)
      };

      // Extract content goals (heuristic analysis)
      const contentGoals = {
        seo: this.detectSEOFocus($),
        authority: this.detectAuthorityFocus($),
        leadGeneration: this.detectLeadGenFocus($),
        brandAwareness: this.detectBrandAwarenessFocus($)
      };

      // Extract tone and style
      const toneOfVoice = {
        style: this.extractStyle($),
        preferences: this.extractPreferences($)
      };

      // Extract existing content samples
      logger.updateSpinner('Analyzing existing content...');
      const existingContent = await this.extractExistingContent($, websiteUrl);

      return {
        name: companyName,
        website: websiteUrl,
        businessPositioning,
        targetAudience,
        contentGoals,
        toneOfVoice,
        existingContent
      };

    } catch (error) {
      throw new Error(`Failed to scrape company data: ${(error as Error).message}`);
    }
  }

  async scrapePageContent(url: string): Promise<{ content: string[] }> {
    try {
      const response = await axios.get(url, {
        timeout: config.scraping.timeout,
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      });

      const $ = cheerio.load(response.data);
      const content: string[] = [];

      // Extract text content from various elements
      $('h1, h2, h3, h4, p, li, div.content, div.text, div.description').each((_, element) => {
        const text = $(element).text().trim();
        if (text.length > 20 && text.length < 500) {
          content.push(text);
        }
      });

      return { content };
    } catch (error) {
      return { content: [] };
    }
  }

  async createSitemap(websiteUrl: string): Promise<string[]> {
    try {
      const urls: string[] = [];
      const visitedUrls = new Set<string>();
      const baseUrl = new URL(websiteUrl);
      const pagesToVisit = [websiteUrl];

      while (pagesToVisit.length > 0 && urls.length < config.scraping.maxPages) {
        const currentUrl = pagesToVisit.shift()!;

        if (visitedUrls.has(currentUrl)) continue;
        visitedUrls.add(currentUrl);

        try {
          logger.updateSpinner(`Scanning: ${currentUrl}`);

          // Fetch page using axios instead of Puppeteer
          const response = await axios.get(currentUrl, {
            timeout: config.scraping.timeout,
            headers: {
              'User-Agent': this.userAgent,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate',
              'Connection': 'keep-alive',
            }
          });

          // Only process HTML content
          const contentType = response.headers['content-type'] || '';
          if (!contentType.includes('text/html')) {
            continue;
          }

          const $ = cheerio.load(response.data);
          urls.push(currentUrl);

          // Find internal links
          const internalLinks = this.findInternalLinks($, baseUrl);

          // Enhanced handling for blog and content listing pages
          const urlLower = currentUrl.toLowerCase();
          const isBlogOrContentPage =
            urlLower.includes('/blog') ||
            urlLower.includes('/article') ||
            urlLower.includes('/news') ||
            urlLower.includes('/commentary') ||
            urlLower.includes('/insights') ||
            urlLower.includes('/posts') ||
            // Check if page title suggests it's a blog listing
            ($('title').text().toLowerCase().includes('blog') ||
             $('h1').text().toLowerCase().includes('blog') ||
             $('.blog').length > 0);

          if (isBlogOrContentPage) {
            const blogPostLinks = this.findBlogPostLinks($, baseUrl);

            blogPostLinks.forEach(link => {
              if (!internalLinks.includes(link)) {
                internalLinks.push(link);
              }
            });

            // Also look for pagination links to discover more blog posts
            const paginationLinks = this.findPaginationLinks($, baseUrl);
            paginationLinks.forEach(link => {
              if (!internalLinks.includes(link) && !pagesToVisit.includes(link)) {
                internalLinks.push(link);
              }
            });
          }

          // Add new links to visit queue
          internalLinks.forEach(link => {
            if (!visitedUrls.has(link) && !pagesToVisit.includes(link)) {
              pagesToVisit.push(link);
            }
          });

        } catch (pageError) {
          logger.warn(`Failed to fetch ${currentUrl}: ${(pageError as Error).message}`);
        }
      }

      return urls;

    } catch (error) {
      throw new Error(`Failed to create sitemap: ${(error as Error).message}`);
    }
  }

  async analyzePage(url: string): Promise<SitePage> {
    try {
      // Fetch page using axios instead of Puppeteer
      const response = await axios.get(url, {
        timeout: config.scraping.timeout,
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      });

      const $ = cheerio.load(response.data);

      const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';
      const description = $('meta[name="description"]').attr('content') ||
                         $('meta[property="og:description"]').attr('content') ||
                         this.extractFirstParagraph($) ||
                         'No description available';

      const pageType = this.determinePageType(url, title, $);
      const linkingOpportunities = this.generateLinkingOpportunities($, title, url, pageType);

      return {
        url,
        title,
        description,
        pageType,
        linkingOpportunities
      };

    } catch (error) {
      throw new Error(`Failed to analyze page ${url}: ${(error as Error).message}`);
    }
  }


  private extractCompanyName($: cheerio.CheerioAPI, websiteUrl: string): string {
    // Try multiple strategies to extract company name
    const strategies = [
      () => $('meta[property="og:site_name"]').attr('content'),
      () => $('meta[name="application-name"]').attr('content'),
      () => $('.logo').text().trim(),
      () => $('[class*="logo"]').text().trim(),
      () => $('h1').first().text().trim(),
      () => $('title').text().split(' | ')[0].split(' - ')[0].trim(),
      () => new URL(websiteUrl).hostname.replace('www.', '').split('.')[0]
    ];

    for (const strategy of strategies) {
      const result = strategy();
      if (result && result.length > 0 && result.length < 100) {
        return result;
      }
    }

    return 'Unknown Company';
  }

  private extractTagline($: cheerio.CheerioAPI): string {
    const selectors = [
      'meta[name="description"]',
      'meta[property="og:description"]',
      '.tagline',
      '.hero-subtitle',
      '.subtitle',
      'h2',
      '.lead'
    ];

    for (const selector of selectors) {
      const text = $(selector).first().text().trim();
      if (text && text.length > 10 && text.length < 200) {
        return text;
      }
    }

    return 'Tagline not found';
  }

  private extractPromise($: cheerio.CheerioAPI): string {
    const text = $('body').text();
    const promisePatterns = [
      /we help[^.]{20,200}\./gi,
      /we provide[^.]{20,200}\./gi,
      /we deliver[^.]{20,200}\./gi,
      /our mission[^.]{20,200}\./gi
    ];

    for (const pattern of promisePatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }

    return 'Promise not found';
  }

  private extractValueProposition($: cheerio.CheerioAPI): string[] {
    const propositions: string[] = [];

    // Look for lists and bullet points
    $('ul li, ol li').each((_, element) => {
      const text = $(element).text().trim();
      if (text.length > 20 && text.length < 150) {
        propositions.push(text);
      }
    });

    // Look for feature/benefit sections
    $('[class*="feature"], [class*="benefit"], [class*="advantage"]').each((_, element) => {
      const text = $(element).text().trim();
      if (text.length > 20 && text.length < 150) {
        propositions.push(text);
      }
    });

    return propositions.slice(0, 5);
  }

  private extractTargetSegments($: cheerio.CheerioAPI): string[] {
    const segments: string[] = [];
    const text = $('body').text();

    const segmentPatterns = [
      /\b(?:small|medium|large|enterprise)\s+(?:business|companies|organizations)\b/gi,
      /\b(?:startups?|entrepreneurs?|founders?)\b/gi,
      /\b(?:professionals?|executives?|managers?)\b/gi,
      /\b(?:agencies?|consultants?|freelancers?)\b/gi
    ];

    segmentPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (!segments.includes(match.toLowerCase())) {
            segments.push(match.toLowerCase());
          }
        });
      }
    });

    return segments.slice(0, 5);
  }

  private extractPainPoints($: cheerio.CheerioAPI): string[] {
    const painPoints: string[] = [];
    const text = $('body').text();

    const painPatterns = [
      /(?:struggling with|challenges? with|problems? with|difficulties with)[^.]{10,100}\./gi,
      /(?:tired of|frustrated with|overwhelmed by)[^.]{10,100}\./gi,
      /(?:without|lacking|missing)[^.]{10,100}\./gi
    ];

    painPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.slice(0, 3).forEach(match => {
          painPoints.push(match.trim());
        });
      }
    });

    return painPoints.slice(0, 5);
  }

  private extractDecisionTriggers($: cheerio.CheerioAPI): string[] {
    const triggers: string[] = [];
    const text = $('body').text();

    const triggerPatterns = [
      /\b(?:roi|return on investment|cost savings?|efficiency)\b/gi,
      /\b(?:results?|outcomes?|success|growth)\b/gi,
      /\b(?:expertise|experience|proven|trusted)\b/gi,
      /\b(?:fast|quick|immediate|instant)\b/gi
    ];

    triggerPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.slice(0, 2).forEach(match => {
          if (!triggers.includes(match.toLowerCase())) {
            triggers.push(match.toLowerCase());
          }
        });
      }
    });

    return triggers.slice(0, 5);
  }

  private detectSEOFocus($: cheerio.CheerioAPI): boolean {
    const seoIndicators = [
      $('meta[name="keywords"]').length > 0,
      $('meta[name="description"]').attr('content')?.length || 0 > 120,
      $('h1').length > 0,
      $('h2').length > 2,
      $('[alt]').length > 5
    ];

    return seoIndicators.filter(Boolean).length >= 3;
  }

  private detectAuthorityFocus($: cheerio.CheerioAPI): boolean {
    const text = $('body').text().toLowerCase();
    const authorityKeywords = ['expert', 'experience', 'proven', 'award', 'certified', 'leader', 'industry'];
    return authorityKeywords.some(keyword => text.includes(keyword));
  }

  private detectLeadGenFocus($: cheerio.CheerioAPI): boolean {
    const leadGenIndicators = [
      $('form').length > 0,
      $('[type="email"]').length > 0,
      $('button, .btn').text().toLowerCase().includes('contact'),
      $('button, .btn').text().toLowerCase().includes('demo'),
      $('button, .btn').text().toLowerCase().includes('quote')
    ];

    return leadGenIndicators.filter(Boolean).length >= 2;
  }

  private detectBrandAwarenessFocus($: cheerio.CheerioAPI): boolean {
    const brandIndicators = [
      $('meta[property="og:image"]').length > 0,
      $('[class*="social"]').length > 0,
      $('[href*="facebook"], [href*="twitter"], [href*="linkedin"]').length > 0,
      $('.logo, [class*="logo"]').length > 0
    ];

    return brandIndicators.filter(Boolean).length >= 2;
  }

  private extractStyle($: cheerio.CheerioAPI): string[] {
    const styles: string[] = [];
    const text = $('body').text();

    // Analyze writing style
    const sentences = text.split('.').filter(s => s.trim().length > 10);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;

    if (avgSentenceLength > 100) styles.push('detailed and comprehensive');
    else if (avgSentenceLength < 50) styles.push('concise and direct');
    else styles.push('balanced and accessible');

    // Look for tone indicators
    if (text.includes('we believe') || text.includes('our mission')) styles.push('mission-driven');
    if (text.match(/\d+%|\$[\d,]+|[\d,]+\s*years?/)) styles.push('data-driven');
    if (text.includes('industry-leading') || text.includes('cutting-edge')) styles.push('innovative');

    return styles;
  }

  private extractPreferences($: cheerio.CheerioAPI): string[] {
    const preferences: string[] = [];

    // Analyze formatting preferences
    if ($('strong, b').length > 5) preferences.push('emphasizes key points');
    if ($('ul, ol').length > 3) preferences.push('uses structured lists');
    if ($('h2, h3, h4').length > 5) preferences.push('well-organized sections');
    if ($('img').length > 3) preferences.push('visual content');

    return preferences;
  }

  private async extractExistingContent($: cheerio.CheerioAPI, websiteUrl: string): Promise<{
    websiteCopy: string[];
    linkedinPosts: string[];
    pastBlogs: string[];
  }> {

    // Extract website copy samples
    const websiteCopy: string[] = [];
    $('p').each((_, element) => {
      const text = $(element).text().trim();
      if (text.length > 50 && text.length < 300) {
        websiteCopy.push(text);
      }
    });

    // Try to find blog links
    const pastBlogs: string[] = [];
    $('a[href*="blog"], a[href*="article"], a[href*="news"]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        try {
          const url = new URL(href, websiteUrl);
          pastBlogs.push(url.toString());
        } catch {
          // Ignore invalid URLs
        }
      }
    });

    return {
      websiteCopy: websiteCopy.slice(0, 5),
      linkedinPosts: [], // Would need LinkedIn integration
      pastBlogs: pastBlogs.slice(0, 10)
    };
  }

  private findInternalLinks($: cheerio.CheerioAPI, baseUrl: URL): string[] {
    const links: string[] = [];

    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        try {
          const url = new URL(href, baseUrl.toString());
          if (url.hostname === baseUrl.hostname &&
              !href.includes('#') &&
              !href.includes('mailto:') &&
              !href.includes('tel:')) {
            links.push(url.toString());
          }
        } catch {
          // Ignore invalid URLs
        }
      }
    });

    return [...new Set(links)];
  }

  private findBlogPostLinks($: cheerio.CheerioAPI, baseUrl: URL): string[] {
    const blogLinks: string[] = [];

    // Enhanced blog post link selectors based on real website analysis
    const blogSelectors = [
      // Generic selectors
      'article a[href]',
      '.blog-post a[href]',
      '.post a[href]',
      '.entry a[href]',
      '[class*="blog"] a[href]',
      '[class*="post"] a[href]',
      '[class*="article"] a[href]',

      // Common blog title selectors
      'h1 a[href]',
      'h2 a[href]',
      'h3 a[href]',
      '.title a[href]',
      '[class*="title"] a[href]',

      // More specific blog listing selectors
      '.blogs-listing a[href]',
      '.blog-post-link',
      '.blog-item a[href]',
      '.post-title a[href]',
      '.entry-title a[href]',

      // WordPress-style selectors
      '.post-link',
      '.entry-link',
      '.read-more',
      '[rel="bookmark"]',

      // Generic content links that might be blog posts
      'a[href*="/blog/"]',
      'a[href*="/article/"]',
      'a[href*="/post/"]',
      'a[href*="/news/"]',
      'a[href*="/commentary/"]'
    ];

    blogSelectors.forEach(selector => {
      $(selector).each((_, element) => {
        const href = $(element).attr('href');
        if (href) {
          try {
            const url = new URL(href, baseUrl.toString());
            if (url.hostname === baseUrl.hostname &&
                !href.includes('#') &&
                !href.includes('mailto:') &&
                !href.includes('tel:') &&
                href !== '/') {

              // Enhanced blog post URL detection
              const urlLower = url.pathname.toLowerCase();
              const isValidBlogPost =
                // Direct blog URL patterns
                urlLower.includes('/blog/') ||
                urlLower.includes('/article/') ||
                urlLower.includes('/post/') ||
                urlLower.includes('/news/') ||
                urlLower.includes('/commentary/') ||
                urlLower.includes('/insight/') ||
                // Date patterns (2024, 2023, etc)
                /\/20\d{2}\//.test(urlLower) ||
                // Blog post-like URLs (at least 3 path segments and ends with content slug)
                (url.pathname.split('/').length >= 3 &&
                 /\/blog\/[^\/]+\/?$/.test(urlLower)) ||
                // Generic content pattern with meaningful slug
                (url.pathname.split('/').length >= 3 &&
                 url.pathname.split('/').pop()?.includes('-') &&
                 url.pathname.split('/').pop()!.length > 10);

              if (isValidBlogPost) {
                blogLinks.push(url.toString());
              }
            }
          } catch {
            // Ignore invalid URLs
          }
        }
      });
    });

    return [...new Set(blogLinks)];
  }

  private findPaginationLinks($: cheerio.CheerioAPI, baseUrl: URL): string[] {
    const paginationLinks: string[] = [];

    // Common pagination selectors
    const paginationSelectors = [
      '.pagination a[href]',
      '.page-numbers a[href]',
      '.nav-links a[href]',
      '[class*="pagination"] a[href]',
      '[class*="pager"] a[href]',
      'a[href*="page="]',
      'a[href*="/page/"]',
      '.next a[href]',
      '.prev a[href]',
      '.previous a[href]',
      'a[rel="next"]',
      'a[rel="prev"]'
    ];

    paginationSelectors.forEach(selector => {
      $(selector).each((_, element) => {
        const href = $(element).attr('href');
        if (href) {
          try {
            const url = new URL(href, baseUrl.toString());
            if (url.hostname === baseUrl.hostname &&
                !href.includes('#') &&
                !href.includes('mailto:') &&
                !href.includes('tel:')) {

              // Check if this looks like a pagination URL
              const urlLower = url.pathname.toLowerCase();
              const isPagination =
                url.search.includes('page=') ||
                urlLower.includes('/page/') ||
                urlLower.includes('/blog') ||
                urlLower.includes('/posts');

              if (isPagination) {
                paginationLinks.push(url.toString());
              }
            }
          } catch {
            // Ignore invalid URLs
          }
        }
      });
    });

    return [...new Set(paginationLinks)];
  }

  private extractFirstParagraph($: cheerio.CheerioAPI): string {
    const firstP = $('p').first().text().trim();
    return firstP.length > 20 ? firstP : '';
  }

  private determinePageType(url: string, title: string, $: cheerio.CheerioAPI): 'homepage' | 'service' | 'about' | 'blog' | 'contact' | 'product' | 'other' {
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();

    // Check URL patterns first - more specific homepage detection
    const urlObj = new URL(urlLower);
    if (urlObj.pathname === '/' || urlObj.pathname === '/index' || urlObj.pathname === '/home') return 'homepage';
    if (urlLower.includes('/about') || urlLower.includes('/team') || titleLower.includes('about')) return 'about';
    if (urlLower.includes('/contact') || titleLower.includes('contact')) return 'contact';

    // Enhanced blog detection
    if (urlLower.includes('/blog') || urlLower.includes('/article') || urlLower.includes('/news') ||
        urlLower.includes('/post') || urlLower.includes('/insights') || urlLower.includes('/commentary') ||
        titleLower.includes('blog') || titleLower.includes('article') || titleLower.includes('commentary')) return 'blog';

    if (urlLower.includes('/product/') || urlLower.includes('/solution/')) return 'product';

    // Check for service indicators
    const serviceKeywords = ['service', 'portfolio', 'strategy', 'management', 'solution', 'offering'];
    if (serviceKeywords.some(keyword => titleLower.includes(keyword) || urlLower.includes(keyword))) {
      return 'service';
    }

    // Check content for service indicators
    const headings = $('h1, h2, h3').text().toLowerCase();
    if (serviceKeywords.some(keyword => headings.includes(keyword))) {
      return 'service';
    }

    return 'other';
  }

  private generateLinkingOpportunities($: cheerio.CheerioAPI, title: string, url: string, pageType: string): {
    whenToLink: string;
    suggestedAnchorText: string[];
    contextualRelevance: string;
  } {
    let whenToLink = '';
    let suggestedAnchorText: string[] = [];
    let contextualRelevance = '';

    switch (pageType) {
      case 'homepage':
        whenToLink = 'When providing company overview or introducing services';
        suggestedAnchorText = ['homepage', 'main page', 'company overview'];
        contextualRelevance = 'Good for general introductions and overview content';
        break;

      case 'service':
        whenToLink = 'When discussing specific services or solutions';
        suggestedAnchorText = [title, 'service details', 'learn more about services'];
        contextualRelevance = 'Essential for converting educational content into service inquiries';
        break;

      case 'about':
        whenToLink = 'When establishing credibility or introducing company background';
        suggestedAnchorText = ['about us', 'company background', 'our story'];
        contextualRelevance = 'Perfect for building trust and authority in content';
        break;

      case 'contact':
        whenToLink = 'In call-to-action sections or when inviting engagement';
        suggestedAnchorText = ['contact us', 'get in touch', 'reach out'];
        contextualRelevance = 'Primary conversion point for lead generation';
        break;

      case 'blog':
        whenToLink = 'When referencing related topics or providing additional context';
        suggestedAnchorText = [title, 'related article', 'read more'];
        contextualRelevance = 'Valuable for keeping readers engaged with related content';
        break;

      case 'product':
        whenToLink = 'When mentioning specific products or solutions';
        suggestedAnchorText = [title, 'product details', 'solution overview'];
        contextualRelevance = 'Direct conversion opportunity for product-focused content';
        break;

      default:
        whenToLink = 'When contextually relevant to the content topic';
        suggestedAnchorText = [title];
        contextualRelevance = 'Use when naturally fits the content flow';
    }

    // Clean up anchor text suggestions
    suggestedAnchorText = suggestedAnchorText
      .filter(text => text && text.length > 2)
      .slice(0, 4);

    return {
      whenToLink,
      suggestedAnchorText,
      contextualRelevance
    };
  }
}