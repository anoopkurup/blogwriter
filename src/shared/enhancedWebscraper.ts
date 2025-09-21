import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import { CompanyData } from '../types/index.js';
import { logger } from './logger.js';

interface ScrapedPageContent {
  url: string;
  title: string;
  headings: string[];
  paragraphs: string[];
  listItems: string[];
  metaDescription?: string;
  rawText: string;
  keyContent?: any;
}

export class EnhancedWebScraper {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    if (!this.browser) {
      try {
        this.browser = await puppeteer.launch({
          headless: 'new',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--timeout=30000'
          ]
        });
      } catch (error) {
        logger.warn(`Browser initialization failed: ${(error as Error).message}`);
        throw new Error('Failed to initialize browser for web scraping');
      }
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrapeCompanyData(websiteUrl: string): Promise<CompanyData> {
    await this.initialize();

    try {
      logger.updateSpinner('Starting comprehensive website analysis...');

      // Define pages to scrape in order of priority
      const pagesToScrape = [
        { url: websiteUrl, type: 'homepage' },
        { url: `${websiteUrl}/about`, type: 'about' },
        { url: `${websiteUrl}/about-us`, type: 'about' },
        { url: `${websiteUrl}/services`, type: 'services' },
        { url: `${websiteUrl}/consulting`, type: 'services' },
        { url: `${websiteUrl}/what-we-do`, type: 'services' },
        { url: `${websiteUrl}/why-us`, type: 'differentiators' },
        { url: `${websiteUrl}/approach`, type: 'differentiators' },
      ];

      const scrapedPages: ScrapedPageContent[] = [];

      for (const pageInfo of pagesToScrape) {
        try {
          logger.updateSpinner(`Analyzing ${pageInfo.type} page...`);
          const content = await this.scrapePage(pageInfo.url);
          if (content) {
            scrapedPages.push(content);
            logger.updateSpinner(`✓ ${pageInfo.type} page analyzed`);
          }
        } catch (error) {
          logger.updateSpinner(`⚠ ${pageInfo.type} page not accessible`);
          continue;
        }
      }

      if (scrapedPages.length === 0) {
        throw new Error('Unable to access any pages on the website');
      }

      logger.updateSpinner('Extracting business insights...');

      // Extract company data from all scraped pages
      const companyData = this.extractCompanyDataFromPages(scrapedPages, websiteUrl);

      return companyData;

    } catch (error) {
      throw new Error(`Enhanced scraping failed: ${(error as Error).message}`);
    }
  }

  async scrapePage(url: string, maxRetries: number = 3): Promise<ScrapedPageContent | null> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const page = await this.browser.newPage();

      try {
        // Set user agent and viewport
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.setViewport({ width: 1280, height: 720 });

        // Set request interceptors to handle potential blocks
        await page.setRequestInterception(true);
        page.on('request', (req) => {
          if (req.resourceType() === 'stylesheet' || req.resourceType() === 'font' || req.resourceType() === 'image') {
            req.abort();
          } else {
            req.continue();
          }
        });

        // Navigate with timeout and wait for network to be idle
        await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        // Wait for dynamic content to load (longer for JS-heavy sites)
        await page.waitForTimeout(3000);

        // Wait for common content selectors to be present
        try {
          await page.waitForSelector('h1, h2, main, article, .content, #content', {
            timeout: 8000
          });
        } catch (error) {
          // Continue if selectors don't exist
        }

        // Get page content
        const content = await page.content();
        const $ = cheerio.load(content);

      // Remove unwanted elements that clutter content
      $('script, style, nav, footer, header, .nav, .menu, .sidebar, .advertisement, .ads, .cookie, .popup, .modal').remove();

      // Extract structured content with improved selectors
      const title = $('title').text().trim() || $('h1').first().text().trim() || '';
      const metaDescription = $('meta[name="description"]').attr('content') ||
                             $('meta[property="og:description"]').attr('content') || '';

      const headings: string[] = [];
      $('h1, h2, h3, h4').each((_, element) => {
        const heading = this.cleanText($(element).text());
        if (heading && heading.length > 3 && heading.length < 200 && this.isValidContent(heading)) {
          headings.push(heading);
        }
      });

      const paragraphs: string[] = [];
      // Look in main content areas first
      const contentSelectors = [
        'main p', 'article p', '.content p', '#content p', '.main p',
        'section p', '.post p', '.entry p', '.description p'
      ];

      let foundContentParagraphs = false;
      for (const selector of contentSelectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          elements.each((_, element) => {
            const paragraph = this.cleanText($(element).text());
            if (paragraph && paragraph.length > 30 && paragraph.length < 800 && this.isValidContent(paragraph)) {
              paragraphs.push(paragraph);
            }
          });
          if (paragraphs.length > 0) {
            foundContentParagraphs = true;
            break;
          }
        }
      }

      // Fallback to all paragraphs if no content-specific paragraphs found
      if (!foundContentParagraphs) {
        $('p').each((_, element) => {
          const paragraph = this.cleanText($(element).text());
          if (paragraph && paragraph.length > 30 && paragraph.length < 800 && this.isValidContent(paragraph)) {
            paragraphs.push(paragraph);
          }
        });
      }

      const listItems: string[] = [];
      $('ul li, ol li').each((_, element) => {
        const item = this.cleanText($(element).text());
        if (item && item.length > 10 && item.length < 300 && this.isValidContent(item)) {
          listItems.push(item);
        }
      });

      // Extract key sections content
      const keyContent = this.extractKeyContent($);

      // Get clean text content from main areas
      const mainContentSelectors = ['main', 'article', '.content', '#content', '.main', 'section:not(nav):not(footer)'];
      let rawText = '';

      for (const selector of mainContentSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          rawText = this.cleanText(element.text());
          if (rawText.length > 200) break;
        }
      }

      // Fallback to body if no main content found
      if (!rawText || rawText.length < 200) {
        rawText = this.cleanText($('body').text());
      }

        return {
          url,
          title,
          headings,
          paragraphs,
          listItems,
          metaDescription,
          rawText,
          keyContent
        };

      } catch (error) {
        logger.warn(`Attempt ${attempt}/${maxRetries} failed for ${url}: ${(error as Error).message}`);

        if (attempt === maxRetries) {
          logger.warn(`All ${maxRetries} attempts failed for ${url}`);
          return null;
        }

        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
      } finally {
        await page.close();
      }
    }

    return null;
  }

  private extractCompanyDataFromPages(pages: ScrapedPageContent[], websiteUrl: string): CompanyData {
    const homePage = pages.find(p => p.url === websiteUrl);
    const aboutPages = pages.filter(p => p.url.includes('/about'));
    const servicePages = pages.filter(p => p.url.includes('/service') || p.url.includes('/consulting') || p.url.includes('/what-we-do'));
    const differentiatorPages = pages.filter(p => p.url.includes('/why-us') || p.url.includes('/approach'));

    // Extract company name
    const companyName = this.extractCompanyName(pages, websiteUrl);

    // Extract business positioning
    const businessPositioning = {
      tagline: this.extractTagline(pages),
      promise: this.extractPromise(pages),
      valueProposition: this.extractValueProposition(servicePages, homePage ? [homePage] : [])
    };

    // Extract target audience information
    const targetAudience = {
      segments: this.extractTargetSegments(pages),
      painPoints: this.extractPainPoints(pages),
      decisionTriggers: ['ROI', 'Quality', 'Results', 'Expertise']
    };

    // Determine content goals based on website structure
    const contentGoals = {
      seo: pages.some(p => p.metaDescription && p.metaDescription.length > 100),
      authority: this.detectAuthorityFocus(pages),
      leadGeneration: this.detectLeadGenFocus(pages),
      brandAwareness: true
    };

    // Extract tone and style
    const toneOfVoice = {
      style: this.extractWritingStyle(pages),
      preferences: this.extractContentPreferences(pages)
    };

    // Placeholder for existing content (would need additional API integration)
    const existingContent = {
      websiteCopy: pages.slice(0, 3).map(p => p.paragraphs[0]).filter(Boolean),
      linkedinPosts: [],
      pastBlogs: []
    };

    return {
      name: companyName,
      website: websiteUrl,
      businessPositioning,
      targetAudience,
      contentGoals,
      toneOfVoice,
      existingContent
    };
  }

  private extractCompanyName(pages: ScrapedPageContent[], websiteUrl: string): string {
    // Try to find company name from various sources
    for (const page of pages) {
      // Check title for company name patterns
      if (page.title) {
        const titleParts = page.title.split(/[\|\-\–]/).map(part => part.trim());
        if (titleParts.length > 1) {
          // Often company name is after the separator
          const possibleName = titleParts[titleParts.length - 1];
          if (possibleName.length > 2 && possibleName.length < 50) {
            return possibleName;
          }
        }
      }

      // Check headings for company name
      for (const heading of page.headings) {
        if (heading.toLowerCase().includes('about') && heading.length < 50) {
          const words = heading.split(' ');
          if (words.length <= 3 && !heading.toLowerCase().includes('about us')) {
            return heading;
          }
        }
      }
    }

    // Fallback to domain name
    try {
      const domain = new URL(websiteUrl).hostname.replace('www.', '');
      return domain.split('.')[0].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    } catch {
      return 'Company';
    }
  }

  private extractTagline(pages: ScrapedPageContent[]): string {
    // First, try to extract from keyContent value proposition
    for (const page of pages) {
      if (page.keyContent?.valueProposition) {
        const valueProps = Array.isArray(page.keyContent.valueProposition) ?
          page.keyContent.valueProposition : [page.keyContent.valueProposition];

        for (const valueProp of valueProps) {
          const cleaned = this.cleanText(valueProp);
          if (cleaned && cleaned.length > 20 && cleaned.length < 200 && this.isValidContent(cleaned)) {
            return cleaned;
          }
        }
      }
    }

    // Look for taglines in various places with enhanced validation
    for (const page of pages) {
      // Check meta description
      if (page.metaDescription && page.metaDescription.length > 20 && page.metaDescription.length < 200) {
        const cleaned = this.cleanText(page.metaDescription);
        if (cleaned && this.isValidContent(cleaned)) {
          return cleaned;
        }
      }

      // Check for tagline patterns in headings
      for (const heading of page.headings.slice(1, 4)) { // Skip main title, check next few
        const cleaned = this.cleanText(heading);
        if (cleaned.length > 20 && cleaned.length < 150 && this.isValidContent(cleaned)) {
          const lower = cleaned.toLowerCase();
          if (lower.includes('we help') || lower.includes('we provide') ||
              lower.includes('we specialize') || lower.includes('your') ||
              lower.includes('marketing') || lower.includes('consulting') ||
              lower.includes('strategy') || lower.includes('solutions')) {
            return cleaned;
          }
        }
      }

      // Check first meaningful paragraph
      for (const paragraph of page.paragraphs.slice(0, 3)) {
        const cleaned = this.cleanText(paragraph);
        if (cleaned.length > 30 && cleaned.length < 250 && this.isValidContent(cleaned)) {
          const lower = cleaned.toLowerCase();
          if (lower.includes('we help') || lower.includes('we provide') ||
              lower.includes('we specialize') || lower.includes('our mission') ||
              lower.includes('marketing') || lower.includes('consulting') ||
              lower.includes('expertise') || lower.includes('focus on')) {
            return cleaned;
          }
        }
      }
    }

    return 'Professional services provider';
  }

  private extractPromise(pages: ScrapedPageContent[]): string {
    // Look for mission/promise statements
    for (const page of pages) {
      const allText = [...page.paragraphs, ...page.headings].join(' ');

      const promisePatterns = [
        /(?:our mission|we believe|we are committed to|our purpose|we strive to)[^.]{20,200}\./gi,
        /(?:we help|we enable|we empower)[^.]{20,200}\./gi,
        /(?:dedicated to|focused on)[^.]{20,200}\./gi
      ];

      for (const pattern of promisePatterns) {
        const matches = allText.match(pattern);
        if (matches && matches[0]) {
          return matches[0].trim();
        }
      }
    }

    return 'Committed to delivering exceptional results for our clients';
  }

  private extractValueProposition(servicePages: ScrapedPageContent[], homePages: ScrapedPageContent[]): string[] {
    const services: string[] = [];
    const allPages = [...servicePages, ...homePages];

    // First, try to extract from keyContent if available
    for (const page of allPages) {
      if (page.keyContent?.services && Array.isArray(page.keyContent.services)) {
        services.push(...page.keyContent.services);
      }
    }

    // If we have services from keyContent and they're valid, use them
    if (services.length > 0) {
      const validServices = services
        .filter(service => service && service.length > 5 && service.length < 150 && this.isValidContent(service))
        .slice(0, 8);

      if (validServices.length > 0) {
        return validServices;
      }
    }

    // Fallback to original extraction method
    services.length = 0; // Clear array

    for (const page of allPages) {
      // Extract from headings with better validation
      for (const heading of page.headings) {
        if (this.isServiceHeading(heading) && this.isValidContent(heading)) {
          services.push(this.cleanText(heading));
        }
      }

      // Extract from list items with better validation
      for (const item of page.listItems) {
        if (this.isServiceItem(item) && this.isValidContent(item)) {
          services.push(this.cleanText(item));
        }
      }

      // Extract service-like paragraphs
      for (const paragraph of page.paragraphs) {
        if (this.isServiceDescription(paragraph)) {
          const serviceName = this.extractServiceFromParagraph(paragraph);
          if (serviceName && this.isValidContent(serviceName)) {
            services.push(this.cleanText(serviceName));
          }
        }
      }
    }

    // Deduplicate and filter with enhanced validation
    const uniqueServices = [...new Set(services)]
      .filter(service => {
        const cleaned = service.trim();
        return cleaned.length > 5 &&
               cleaned.length < 150 &&
               this.isValidContent(cleaned) &&
               !this.isGenericService(cleaned);
      })
      .slice(0, 8);

    return uniqueServices.length > 0 ? uniqueServices : ['Professional Services', 'Strategic Consulting', 'Business Advisory'];
  }

  private isGenericService(service: string): boolean {
    const genericPatterns = [
      /^(services?|solutions?|offerings?|products?)$/i,
      /^(we offer|we provide|our services)$/i,
      /^(home|about|contact)$/i
    ];

    return genericPatterns.some(pattern => pattern.test(service.trim()));
  }

  private isServiceHeading(heading: string): boolean {
    const lower = heading.toLowerCase();
    return (lower.includes('marketing') || lower.includes('consulting') ||
            lower.includes('strategy') || lower.includes('development') ||
            lower.includes('services') || lower.includes('solutions')) &&
           !lower.includes('about') && !lower.includes('contact') &&
           heading.split(' ').length <= 6;
  }

  private isServiceItem(item: string): boolean {
    const lower = item.toLowerCase();
    return (lower.includes('marketing') || lower.includes('consulting') ||
            lower.includes('strategy') || lower.includes('development') ||
            lower.includes('planning') || lower.includes('management')) &&
           item.split(' ').length <= 8;
  }

  private isServiceDescription(paragraph: string): boolean {
    const lower = paragraph.toLowerCase();
    return (lower.includes('we offer') || lower.includes('we provide') ||
            lower.includes('our services') || lower.includes('we specialize')) &&
           paragraph.length < 300;
  }

  private extractServiceFromParagraph(paragraph: string): string | null {
    // Try to extract service names from service description paragraphs
    const patterns = [
      /(?:we offer|we provide|including|such as)\s+([^.]{10,80})/gi,
      /(?:our|these)\s+(marketing|consulting|strategy|development)[^.]{5,60}/gi
    ];

    for (const pattern of patterns) {
      const match = paragraph.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  private extractTargetSegments(pages: ScrapedPageContent[]): string[] {
    const segments: string[] = [];

    for (const page of pages) {
      const allText = [...page.paragraphs, ...page.headings].join(' ');

      const segmentPatterns = [
        /\b(?:small|medium|large|enterprise|growing)\s+(?:business|companies|organizations|firms)\b/gi,
        /\b(?:startups?|entrepreneurs?|founders?|ceos?)\b/gi,
        /\b(?:professionals?|executives?|managers?|leaders?)\b/gi,
        /\b(?:agencies?|consultants?|freelancers?|firms?)\b/gi,
        /\b(?:b2b|b2c|saas|technology)\s+(?:companies?|businesses?)\b/gi
      ];

      segmentPatterns.forEach(pattern => {
        const matches = allText.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const cleaned = match.toLowerCase().trim();
            if (!segments.includes(cleaned) && cleaned.length > 3) {
              segments.push(cleaned);
            }
          });
        }
      });
    }

    return segments.slice(0, 5);
  }

  private extractPainPoints(pages: ScrapedPageContent[]): string[] {
    const painPoints: string[] = [];

    for (const page of pages) {
      const allText = [...page.paragraphs].join(' ');

      const painPatterns = [
        /(?:struggling with|challenges? with|problems? with|difficulties with|pain points?)[^.]{10,100}[.]/gi,
        /(?:tired of|frustrated with|overwhelmed by|concerned about)[^.]{10,100}[.]/gi,
        /(?:lacking|missing|without|need help with)[^.]{10,100}[.]/gi
      ];

      painPatterns.forEach(pattern => {
        const matches = allText.match(pattern);
        if (matches) {
          matches.slice(0, 2).forEach(match => {
            painPoints.push(match.trim());
          });
        }
      });
    }

    return painPoints.slice(0, 5);
  }

  private detectAuthorityFocus(pages: ScrapedPageContent[]): boolean {
    const allText = pages.map(p => p.rawText).join(' ').toLowerCase();
    const authorityKeywords = ['expert', 'experience', 'proven', 'award', 'certified', 'leader', 'industry', 'years', 'established'];
    return authorityKeywords.some(keyword => allText.includes(keyword));
  }

  private detectLeadGenFocus(pages: ScrapedPageContent[]): boolean {
    const allText = pages.map(p => p.rawText).join(' ').toLowerCase();
    const leadGenKeywords = ['contact', 'demo', 'consultation', 'quote', 'get started', 'learn more', 'schedule', 'book'];
    return leadGenKeywords.filter(keyword => allText.includes(keyword)).length >= 3;
  }

  private extractWritingStyle(pages: ScrapedPageContent[]): string[] {
    const styles: string[] = [];

    // Analyze content characteristics
    const allParagraphs = pages.flatMap(p => p.paragraphs);
    const avgLength = allParagraphs.reduce((sum, p) => sum + p.length, 0) / allParagraphs.length;

    if (avgLength > 150) styles.push('detailed and comprehensive');
    else if (avgLength < 80) styles.push('concise and direct');
    else styles.push('balanced and accessible');

    const allText = pages.map(p => p.rawText).join(' ').toLowerCase();

    if (allText.includes('data') || allText.includes('results') || allText.includes('metrics')) {
      styles.push('data-driven');
    }

    if (allText.includes('innovative') || allText.includes('cutting-edge')) {
      styles.push('innovative');
    }

    if (allText.includes('proven') || allText.includes('established')) {
      styles.push('authoritative');
    }

    return styles.slice(0, 3);
  }

  private extractContentPreferences(pages: ScrapedPageContent[]): string[] {
    const preferences: string[] = [];

    // Analyze structural preferences
    const totalHeadings = pages.reduce((sum, p) => sum + p.headings.length, 0);
    const totalLists = pages.reduce((sum, p) => sum + p.listItems.length, 0);

    if (totalHeadings > 10) preferences.push('well-organized sections');
    if (totalLists > 5) preferences.push('uses structured lists');

    const allText = pages.map(p => p.rawText).join(' ');
    if (allText.includes('•') || allText.includes('→')) preferences.push('emphasizes key points');

    return preferences.slice(0, 3);
  }

  private cleanText(text: string): string {
    if (!text) return '';

    return text
      // Remove extra whitespace and normalize
      .replace(/\s+/g, ' ')
      // Remove common UI text that's not meaningful
      .replace(/\b(click here|read more|learn more|contact us|get started|subscribe|follow us)\b/gi, '')
      // Remove email addresses and URLs
      .replace(/\S+@\S+\.\S+/g, '')
      .replace(/https?:\/\/\S+/g, '')
      // Remove phone numbers
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '')
      // Remove excessive punctuation
      .replace(/[.,;:!?]{2,}/g, '.')
      // Clean up common artifacts
      .replace(/\b(home|about|services|contact|blog|menu|navigation)\s*/gi, '')
      .trim();
  }

  private isValidContent(text: string): boolean {
    if (!text || text.length < 10) return false;

    // Filter out common non-content text
    const invalidPatterns = [
      /^(home|about|services|contact|blog|menu|navigation|login|register|subscribe)$/i,
      /^(click here|read more|learn more|contact us|get started)$/i,
      /^(\d+|\w{1,2})$/,  // Single numbers or very short words
      /^\s*[.,;:!?]+\s*$/,  // Just punctuation
      /^(©|copyright|all rights reserved)/i,
      /^(privacy policy|terms of service|cookies)/i,
      /^(follow us|social media|share)/i
    ];

    return !invalidPatterns.some(pattern => pattern.test(text.trim()));
  }

  private extractKeyContent($: any): any {
    const keyContent: any = {};

    // Extract hero/main value proposition
    const heroSelectors = [
      'h1', '.hero h2', '.hero p', '.hero .lead',
      '[class*="hero"] h1', '[class*="hero"] h2', '[class*="hero"] p',
      '.main-heading', '.tagline', '.subtitle'
    ];

    for (const selector of heroSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        const text = this.cleanText(element.text());
        if (text && text.length > 20 && text.length < 300) {
          keyContent.valueProposition = text;
          break;
        }
      }
    }

    // Extract about/description content
    const aboutSelectors = [
      '.about p', '#about p', '[class*="about"] p',
      '.description p', '.intro p', '.overview p'
    ];

    const aboutTexts: string[] = [];
    for (const selector of aboutSelectors) {
      $(selector).each((_: any, element: any) => {
        const text = this.cleanText($(element).text());
        if (text && text.length > 30 && text.length < 400) {
          aboutTexts.push(text);
        }
      });
      if (aboutTexts.length > 0) break;
    }
    if (aboutTexts.length > 0) {
      keyContent.about = aboutTexts.slice(0, 3);
    }

    // Extract services/offerings
    const serviceSelectors = [
      '.services li', '.offerings li', '.features li',
      '[class*="service"] h3', '[class*="service"] h4',
      '.service-item', '.offering-item'
    ];

    const services: string[] = [];
    for (const selector of serviceSelectors) {
      $(selector).each((_: any, element: any) => {
        const text = this.cleanText($(element).text());
        if (text && text.length > 5 && text.length < 150 && this.isValidContent(text)) {
          services.push(text);
        }
      });
      if (services.length > 0) break;
    }
    if (services.length > 0) {
      keyContent.services = services.slice(0, 8);
    }

    return keyContent;
  }
}