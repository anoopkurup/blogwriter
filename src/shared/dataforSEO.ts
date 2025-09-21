import axios from 'axios';
import { config } from './config.js';
import { KeywordData, CompanyData } from '../types/index.js';
import { logger } from './logger.js';

export class DataforSEOClient {
  private apiClient;

  constructor() {
    this.apiClient = axios.create({
      baseURL: config.dataforSEO.baseUrl,
      auth: {
        username: config.dataforSEO.login,
        password: config.dataforSEO.password
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async generateLongTailKeywords(companyData: CompanyData): Promise<KeywordData[]> {
    try {
      // First, analyze website keywords to determine competition level
      const websiteKeywords = await this.analyzeWebsiteKeywords(companyData.website);
      const targetDifficulty = this.calculateTargetDifficulty(websiteKeywords);

      // Generate seed keywords based on company data
      const seedKeywords = this.generateSeedKeywords(companyData);

      // Get keyword suggestions for each seed
      const allKeywords: KeywordData[] = [];

      for (const seed of seedKeywords) {
        logger.updateSpinner(`Researching keywords for: ${seed}`);

        const suggestions = await this.getKeywordSuggestions(seed, targetDifficulty);
        allKeywords.push(...suggestions);
      }

      // Filter and deduplicate
      const filteredKeywords = this.filterKeywords(allKeywords, targetDifficulty);

      // Sort by relevance and competition
      return filteredKeywords
        .sort((a, b) => this.calculateKeywordScore(b) - this.calculateKeywordScore(a))
        .slice(0, 50); // Limit to top 50 keywords

    } catch (error) {
      throw new Error(`Failed to generate keywords: ${(error as Error).message}`);
    }
  }

  async getKeywordClusters(keywords: KeywordData[]): Promise<{ [topic: string]: KeywordData[] }> {
    try {
      // Analyze SERP overlaps to cluster keywords
      const clusters: { [topic: string]: KeywordData[] } = {};

      // Simple clustering based on shared words
      for (const keyword of keywords) {
        const topic = this.extractTopic(keyword.keyword);

        if (!clusters[topic]) {
          clusters[topic] = [];
        }

        clusters[topic].push(keyword);
      }

      // Filter out small clusters
      Object.keys(clusters).forEach(topic => {
        if (clusters[topic].length < 2) {
          delete clusters[topic];
        }
      });

      return clusters;

    } catch (error) {
      throw new Error(`Failed to cluster keywords: ${(error as Error).message}`);
    }
  }

  async getPeopleAlsoAskQuestions(keywords: string[]): Promise<{ [keyword: string]: string[] }> {
    try {
      const paaQuestions: { [keyword: string]: string[] } = {};

      // Get PAA questions for each keyword (limit to top 10 keywords)
      const topKeywords = keywords.slice(0, 10);

      for (const keyword of topKeywords) {
        logger.updateSpinner(`Fetching People Also Ask questions for: ${keyword}`);

        try {
          // Mock implementation - in real usage, you'd call DataforSEO's Google PAA API
          const questions = await this.getMockPAAQuestions(keyword);
          if (questions.length > 0) {
            paaQuestions[keyword] = questions;
          }

          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
          logger.warn(`Failed to get PAA questions for "${keyword}": ${(error as Error).message}`);
        }
      }

      return paaQuestions;

    } catch (error) {
      throw new Error(`Failed to fetch People Also Ask questions: ${(error as Error).message}`);
    }
  }

  private async analyzeWebsiteKeywords(websiteUrl: string): Promise<KeywordData[]> {
    try {
      // Mock implementation - in real usage, you'd call DataforSEO to get website's ranking keywords
      // For now, we'll return some sample data to determine competition baseline
      return [
        {
          keyword: 'sample website keyword',
          searchVolume: 500,
          difficulty: 35,
          cpc: 2.5,
          competition: 'MEDIUM',
          intent: 'informational',
          cluster: 'main'
        }
      ];
    } catch (error) {
      logger.warn(`Could not analyze website keywords: ${(error as Error).message}`);
      return [];
    }
  }

  private async getKeywordSuggestions(seed: string, targetDifficulty: number): Promise<KeywordData[]> {
    try {
      // Mock implementation - replace with actual DataforSEO API call
      const mockKeywords = this.generateMockKeywords(seed, targetDifficulty);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      return mockKeywords;

    } catch (error) {
      logger.warn(`Failed to get suggestions for "${seed}": ${(error as Error).message}`);
      return [];
    }
  }

  private generateSeedKeywords(companyData: CompanyData): string[] {
    const seeds: string[] = [];

    // Detect industry and generate relevant seeds
    const industry = this.detectIndustry(companyData);

    // Start with industry-specific terms based on company data
    seeds.push(...this.getIndustrySeeds(industry));

    // Add company-specific services and value propositions
    companyData.businessPositioning.valueProposition.forEach(service => {
      seeds.push(service.toLowerCase());
      seeds.push(`${service.toLowerCase()} services`);
      seeds.push(`professional ${service.toLowerCase()}`);
    });

    // Add core business terms from company positioning
    if (companyData.businessPositioning.tagline) {
      const taglineWords = this.extractMeaningfulWords(companyData.businessPositioning.tagline);
      seeds.push(...taglineWords);
    }

    if (companyData.businessPositioning.promise) {
      const promiseWords = this.extractMeaningfulWords(companyData.businessPositioning.promise);
      seeds.push(...promiseWords);
    }

    // Add target audience related keywords
    if (companyData.targetAudience.segments.length > 0) {
      companyData.targetAudience.segments.forEach(segment => {
        seeds.push(`${segment.toLowerCase()} solutions`);
        seeds.push(`${segment.toLowerCase()} services`);
      });
    }

    // Add educational/informational modifiers for content marketing
    const educationalModifiers = ['how to', 'guide to', 'best practices for', 'tips for'];
    const coreBusinessTerms = this.extractCoreBusinessTerms(companyData, industry);

    coreBusinessTerms.forEach(term => {
      educationalModifiers.forEach(modifier => {
        seeds.push(`${modifier} ${term}`);
      });
    });

    return [...new Set(seeds)].slice(0, 20); // Deduplicate and limit to reasonable number
  }

  private detectIndustry(companyData: CompanyData): string {
    const text = `${companyData.name} ${companyData.businessPositioning.tagline} ${companyData.businessPositioning.promise} ${companyData.businessPositioning.valueProposition.join(' ')}`.toLowerCase();

    // More specific industry detection with better categorization
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

  private getIndustrySeeds(industry: string): string[] {
    const seeds: { [key: string]: string[] } = {
      'financial services': [
        'financial planning',
        'investment advice',
        'wealth building',
        'financial strategy',
        'risk management'
      ],
      'marketing consulting': [
        'marketing strategy',
        'brand consulting',
        'marketing campaigns',
        'digital strategy',
        'marketing optimization',
        'growth marketing'
      ],
      'digital marketing': [
        'digital marketing',
        'seo services',
        'social media marketing',
        'content marketing',
        'online advertising',
        'digital strategy'
      ],
      'management consulting': [
        'business consulting',
        'management consulting',
        'strategy consulting',
        'business strategy',
        'operational efficiency',
        'organizational change'
      ],
      'consulting': [
        'business consulting',
        'strategic consulting',
        'professional consulting',
        'advisory services',
        'business optimization'
      ],
      'marketing': [
        'marketing services',
        'brand development',
        'marketing campaigns',
        'customer acquisition',
        'brand strategy'
      ],
      'technology': [
        'technology solutions',
        'software development',
        'tech consulting',
        'digital transformation',
        'it services'
      ],
      'healthcare': [
        'healthcare services',
        'medical solutions',
        'healthcare consulting',
        'patient care',
        'health management'
      ],
      'legal': [
        'legal services',
        'legal consulting',
        'law practice',
        'legal advice',
        'legal representation'
      ],
      'real estate': [
        'real estate services',
        'property management',
        'real estate consulting',
        'property investment',
        'real estate strategy'
      ],
      'education': [
        'educational services',
        'training programs',
        'learning solutions',
        'educational consulting',
        'professional development'
      ],
      'design': [
        'design services',
        'creative solutions',
        'graphic design',
        'design consulting',
        'brand design'
      ]
    };

    return seeds[industry] || ['business services', 'professional services'];
  }

  private generateMockKeywords(seed: string, targetDifficulty: number): KeywordData[] {
    // Generate realistic long-tail variations
    const variations = [
      `how to ${seed}`,
      `${seed} for beginners`,
      `${seed} guide`,
      `${seed} strategy`,
      `${seed} tips`,
      `${seed} vs alternatives`,
      `${seed} benefits`,
      `${seed} cost`,
      `${seed} services`,
      `best ${seed}`
    ];

    return variations.map((keyword, index) => ({
      keyword,
      searchVolume: Math.floor(Math.random() * 1000) + 100,
      difficulty: targetDifficulty + Math.floor(Math.random() * 20) - 10,
      cpc: Math.round((Math.random() * 5 + 0.5) * 100) / 100,
      competition: this.getDifficultyLevel(targetDifficulty + Math.floor(Math.random() * 20) - 10),
      intent: this.determineIntent(keyword),
      cluster: seed
    }));
  }

  private calculateTargetDifficulty(websiteKeywords: KeywordData[]): number {
    if (websiteKeywords.length === 0) return 30; // Default target

    const avgDifficulty = websiteKeywords.reduce((sum, kw) => sum + kw.difficulty, 0) / websiteKeywords.length;
    return Math.min(avgDifficulty + 10, 50); // Slightly higher but cap at 50
  }

  private filterKeywords(keywords: KeywordData[], targetDifficulty: number): KeywordData[] {
    return keywords.filter(kw => {
      // Filter for suitable competition level
      if (kw.difficulty > targetDifficulty + 20) return false;

      // Filter for minimum search volume
      if (kw.searchVolume < 50) return false;

      // Prefer long-tail (3+ words)
      if (kw.keyword.split(' ').length < 3) return false;

      return true;
    });
  }

  private calculateKeywordScore(keyword: KeywordData): number {
    // Higher search volume is better
    const volumeScore = Math.log(keyword.searchVolume + 1) * 10;

    // Lower difficulty is better
    const difficultyScore = (100 - keyword.difficulty) * 2;

    // Longer tail is better
    const wordCount = keyword.keyword.split(' ').length;
    const lengthScore = wordCount * 5;

    return volumeScore + difficultyScore + lengthScore;
  }

  private extractTopic(keyword: string): string {
    const kw = keyword.toLowerCase();

    // Define professional topic mappings for investment/finance domain
    const topicMappings: { [pattern: string]: string } = {
      'portfolio management': 'Portfolio Management',
      'pms': 'Portfolio Management Services',
      'investment': 'Investment Strategies',
      'mutual fund': 'Mutual Funds',
      'equity': 'Equity Investment',
      'wealth': 'Wealth Management',
      'financial planning': 'Financial Planning',
      'asset allocation': 'Asset Allocation',
      'risk management': 'Risk Management',
      'retirement': 'Retirement Planning',
      'tax': 'Tax Planning',
      'sip': 'Systematic Investment',
      'market': 'Market Analysis',
      'stock': 'Stock Investment',
      'bond': 'Bond Investment',
      'fund': 'Fund Management',
      'advisor': 'Investment Advisory',
      'return': 'Investment Returns',
      'performance': 'Performance Analysis'
    };

    // Check for exact pattern matches first
    for (const [pattern, topic] of Object.entries(topicMappings)) {
      if (kw.includes(pattern)) {
        return topic;
      }
    }

    // Extract meaningful concept using better logic
    const words = kw.split(' ');
    const stopWords = ['how', 'to', 'what', 'is', 'the', 'best', 'for', 'vs', 'guide', 'tips', 'beginners', 'alternatives', 'services', 'benefits', 'cost'];
    const meaningfulWords = words.filter(word =>
      !stopWords.includes(word) &&
      word.length > 2 &&
      !word.match(/^\d+$/) // Remove pure numbers
    );

    // Create professional topic name
    if (meaningfulWords.length >= 2) {
      // Use two words for better context
      const topicWords = meaningfulWords.slice(0, 2);
      return topicWords
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    } else if (meaningfulWords.length === 1) {
      const word = meaningfulWords[0];
      return word.charAt(0).toUpperCase() + word.slice(1);
    }

    // Fallback to a generic but professional topic
    return 'Investment Strategy';
  }

  private getDifficultyLevel(difficulty: number): string {
    if (difficulty < 30) return 'LOW';
    if (difficulty < 60) return 'MEDIUM';
    return 'HIGH';
  }

  private determineIntent(keyword: string): 'informational' | 'commercial' | 'navigational' | 'transactional' {
    const kw = keyword.toLowerCase();

    if (kw.includes('how to') || kw.includes('what is') || kw.includes('guide')) return 'informational';
    if (kw.includes('buy') || kw.includes('price') || kw.includes('cost')) return 'transactional';
    if (kw.includes('best') || kw.includes('review') || kw.includes('vs')) return 'commercial';

    return 'informational';
  }

  private async getMockPAAQuestions(keyword: string): Promise<string[]> {
    // Generate realistic PAA questions based on the keyword
    const kw = keyword.toLowerCase();
    const questions: string[] = [];

    // Define PAA question patterns based on keyword type and industry
    const questionPatterns = [
      `What is ${keyword}?`,
      `How does ${keyword} work?`,
      `What are the benefits of ${keyword}?`,
      `How much does ${keyword} cost?`,
      `Is ${keyword} worth it?`,
      `What are the best ${keyword} options?`,
      `How to choose ${keyword}?`,
      `What are the risks of ${keyword}?`,
      `Who should consider ${keyword}?`,
      `When to use ${keyword}?`
    ];

    // Industry-specific patterns for portfolio management/investment
    if (kw.includes('portfolio') || kw.includes('investment') || kw.includes('pms')) {
      questions.push(
        `What is the minimum investment for ${keyword}?`,
        `How to evaluate ${keyword} performance?`,
        `What are the fees for ${keyword}?`,
        `Is ${keyword} better than mutual funds?`,
        `What are the tax implications of ${keyword}?`,
        `How to select the best ${keyword} provider?`,
        `What documents are required for ${keyword}?`,
        `Can NRIs invest in ${keyword}?`,
        `What is the lock-in period for ${keyword}?`,
        `How is ${keyword} regulated in India?`
      );
    }

    // Add general business/service patterns
    if (kw.includes('service') || kw.includes('management') || kw.includes('strategy')) {
      questions.push(
        `How to get started with ${keyword}?`,
        `What are the requirements for ${keyword}?`,
        `How long does ${keyword} take?`,
        `What makes ${keyword} successful?`,
        `Common mistakes in ${keyword}`,
        `${keyword} vs alternatives - which is better?`
      );
    }

    // Select 4-6 most relevant questions
    const relevantQuestions = questionPatterns
      .concat(questions)
      .filter(q => q.toLowerCase().includes(keyword.split(' ')[0].toLowerCase()))
      .slice(0, Math.floor(Math.random() * 3) + 4); // 4-6 questions

    return relevantQuestions;
  }

  private extractMeaningfulWords(text: string): string[] {
    if (!text) return [];

    const words = text.toLowerCase().split(/\s+/);
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'];

    return words
      .filter(word =>
        word.length > 2 &&
        !stopWords.includes(word) &&
        /^[a-zA-Z]+$/.test(word) // Only alphabetic words
      )
      .slice(0, 5); // Limit to 5 meaningful words
  }

  private extractCoreBusinessTerms(companyData: CompanyData, industry: string): string[] {
    const terms: string[] = [];

    // Add industry-specific core terms
    if (industry === 'marketing consulting') {
      terms.push('marketing strategy', 'brand development', 'campaign optimization');
    } else if (industry === 'consulting') {
      terms.push('business strategy', 'operational efficiency', 'organizational development');
    } else if (industry === 'technology') {
      terms.push('software development', 'digital transformation', 'technology strategy');
    }

    // Add company-specific terms from value propositions
    companyData.businessPositioning.valueProposition.forEach(vp => {
      if (vp.length > 3) { // Only meaningful terms
        terms.push(vp.toLowerCase());
      }
    });

    // Add pain point related terms
    companyData.targetAudience.painPoints.forEach(pain => {
      if (pain.length > 5) { // Only substantial pain points
        terms.push(pain.toLowerCase());
      }
    });

    return [...new Set(terms)].slice(0, 8); // Deduplicate and limit
  }
}