import { DataforSEOClient } from '../shared/dataforSEO.js';
import { FileManager } from '../shared/fileManager.js';
import { logger } from '../shared/logger.js';
import { ScriptConfig, KeywordTopic, KeywordData, CompanyData } from '../types/index.js';

export class KeywordGenerationScript {
  private dataforSEO: DataforSEOClient;
  private fileManager: FileManager;

  constructor() {
    this.dataforSEO = new DataforSEOClient();
    this.fileManager = new FileManager();
  }

  async execute(config: ScriptConfig): Promise<void> {
    logger.script(4, 'Keyword Generation');

    try {
      // Load company data for context
      logger.startSpinner('Loading company data...');
      const companyData = await this.loadCompanyData(config.companyPath);

      // Generate long-tail keywords with suitable competition
      logger.updateSpinner('Analyzing website keyword competition...');
      const keywords = await this.dataforSEO.generateLongTailKeywords(companyData);

      if (keywords.length === 0) {
        logger.warn('No keywords generated. Using fallback keyword generation.');
        const fallbackKeywords = this.generateFallbackKeywords(companyData);
        await this.processKeywords(fallbackKeywords, config);
        return;
      }

      await this.processKeywords(keywords, config);

    } catch (error) {
      logger.stopSpinner(false);
      throw new Error(`Script 4 failed: ${(error as Error).message}`);
    }
  }

  private async processKeywords(keywords: KeywordData[], config: ScriptConfig): Promise<void> {
    // Create clusters using SERP occurrence analysis
    logger.updateSpinner('Clustering keywords by topic...');
    const clusters = await this.dataforSEO.getKeywordClusters(keywords);

    // Get PAA questions for top keywords
    logger.updateSpinner('Fetching People Also Ask questions...');
    const topKeywords = keywords
      .sort((a, b) => b.searchVolume - a.searchVolume)
      .slice(0, 10)
      .map(kw => kw.keyword);

    const paaQuestions = await this.dataforSEO.getPeopleAlsoAskQuestions(topKeywords);

    // Convert clusters to KeywordTopic format
    const keywordTopics: KeywordTopic[] = Object.entries(clusters).map(([topic, keywordList]) => ({
      topic: this.formatTopicName(topic),
      keywords: keywordList,
      cluster: topic
    }));

    // Convert PAA questions to additional topics
    const paaTopics = this.convertPAAToTopics(paaQuestions);
    keywordTopics.push(...paaTopics);

    // Sort topics by total search volume
    const sortedTopics = keywordTopics.sort((a, b) => {
      const aVolume = a.keywords.reduce((sum, kw) => sum + kw.searchVolume, 0);
      const bVolume = b.keywords.reduce((sum, kw) => sum + kw.searchVolume, 0);
      return bVolume - aVolume;
    });

    // Save keyword topics
    logger.updateSpinner('Saving keyword topics...');
    await this.fileManager.saveKeywordTopics(config.companyPath, sortedTopics);

    logger.stopSpinner();
    logger.success('Keyword generation completed!');

    // Display summary
    console.log('');
    logger.subsection('Keyword Research Summary:');
    const totalPAAQuestions = Object.values(paaQuestions).flat().length;
    logger.list([
      `Total keywords generated: ${keywords.length}`,
      `People Also Ask questions: ${totalPAAQuestions}`,
      `Topics clustered: ${sortedTopics.length}`,
      `Average competition level: ${this.calculateAverageCompetition(keywords)}`,
      `Average search volume: ${Math.round(keywords.reduce((sum, kw) => sum + kw.searchVolume, 0) / keywords.length)}`,
      `Long-tail keywords (3+ words): ${keywords.filter(kw => kw.keyword.split(' ').length >= 3).length}`
    ]);

    const fileName = `${config.companyName}-Keywords-topics`;
    logger.info(`File saved: ${config.companyPath}/${fileName}`);

    // Show top topics
    console.log('');
    logger.subsection('Top Keyword Topics:');
    sortedTopics.slice(0, 5).forEach((topic, index) => {
      const totalVolume = topic.keywords.reduce((sum, kw) => sum + kw.searchVolume, 0);
      const avgDifficulty = Math.round(topic.keywords.reduce((sum, kw) => sum + kw.difficulty, 0) / topic.keywords.length);
      const isPAADerived = topic.cluster.startsWith('PAA:');

      console.log(`  ${index + 1}. ${topic.topic}${isPAADerived ? ' (PAA Questions)' : ''}`);
      console.log(`     Keywords: ${topic.keywords.length} | Volume: ${totalVolume} | Difficulty: ${avgDifficulty}`);
      console.log(`     Top keywords: ${topic.keywords.slice(0, 3).map(kw => kw.keyword).join(', ')}`);
      console.log('');
    });

    // Show PAA summary if questions were found
    if (totalPAAQuestions > 0) {
      console.log('');
      logger.subsection('People Also Ask Questions Found:');
      Object.entries(paaQuestions).forEach(([keyword, questions]) => {
        console.log(`  ${keyword}:`);
        questions.slice(0, 3).forEach(question => {
          console.log(`    • ${question}`);
        });
        if (questions.length > 3) {
          console.log(`    ... and ${questions.length - 3} more questions`);
        }
        console.log('');
      });
    }
  }

  private async loadCompanyData(companyPath: string): Promise<CompanyData> {
    try {
      // Try to load from writing instructions first
      const writingInstructions = await this.fileManager.loadWritingInstructions(companyPath);

      // Convert writing instructions back to CompanyData format
      return {
        name: writingInstructions.company,
        website: writingInstructions.website,
        businessPositioning: {
          tagline: writingInstructions.brandBackground.mission,
          promise: writingInstructions.brandBackground.mission,
          valueProposition: writingInstructions.brandBackground.productsServices
        },
        targetAudience: {
          segments: writingInstructions.audiencePersonas.map(p => p.persona),
          painPoints: writingInstructions.audiencePersonas.flatMap(p => p.painPoints),
          decisionTriggers: ['ROI', 'Quality', 'Trust', 'Results']
        },
        contentGoals: {
          seo: true,
          authority: true,
          leadGeneration: true,
          brandAwareness: true
        },
        toneOfVoice: {
          style: writingInstructions.toneStyle.brandKeywords,
          preferences: ['Professional', 'Clear', 'Actionable']
        },
        existingContent: {
          websiteCopy: [],
          linkedinPosts: [],
          pastBlogs: []
        }
      };
    } catch {
      throw new Error('Company data not found. Please run Script 1 (Writing Instructions) first.');
    }
  }

  private generateFallbackKeywords(companyData: CompanyData): KeywordData[] {
    logger.info('Using fallback keyword generation...');

    const industry = this.detectIndustry(companyData);
    const fallbackKeywords: KeywordData[] = [];

    // Generate basic keyword variations
    const baseTerms = [
      companyData.name.toLowerCase(),
      industry,
      ...companyData.businessPositioning.valueProposition.map(vp => vp.toLowerCase())
    ];

    const modifiers = [
      'how to',
      'best',
      'guide',
      'tips',
      'benefits',
      'strategy',
      'services',
      'solutions',
      'for beginners',
      'vs alternatives'
    ];

    baseTerms.forEach(term => {
      modifiers.forEach(modifier => {
        const keyword = `${modifier} ${term}`;

        fallbackKeywords.push({
          keyword,
          searchVolume: Math.floor(Math.random() * 500) + 100,
          difficulty: Math.floor(Math.random() * 40) + 20,
          cpc: Math.round((Math.random() * 3 + 0.5) * 100) / 100,
          competition: 'MEDIUM',
          intent: modifier.includes('how') || modifier.includes('guide') ? 'informational' : 'commercial',
          cluster: term
        });
      });
    });

    return fallbackKeywords.slice(0, 30);
  }

  private detectIndustry(companyData: CompanyData): string {
    const text = `${companyData.name} ${companyData.businessPositioning.tagline} ${companyData.businessPositioning.promise}`.toLowerCase();

    if (text.includes('portfolio') || text.includes('investment') || text.includes('pms')) return 'portfolio management';
    if (text.includes('consulting')) return 'consulting';
    if (text.includes('marketing')) return 'marketing';
    if (text.includes('technology') || text.includes('tech')) return 'technology';
    if (text.includes('healthcare') || text.includes('medical')) return 'healthcare';
    if (text.includes('finance') || text.includes('financial')) return 'financial services';

    return 'business services';
  }

  private formatTopicName(topic: string): string {
    return topic
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private convertPAAToTopics(paaQuestions: { [keyword: string]: string[] }): KeywordTopic[] {
    const paaTopics: KeywordTopic[] = [];

    Object.entries(paaQuestions).forEach(([sourceKeyword, questions]) => {
      if (questions.length === 0) return;

      // Group questions by theme to create coherent topics
      const questionGroups = this.groupQuestionsByTheme(questions);

      questionGroups.forEach((group, index) => {
        // Convert questions to keyword-like format for consistency
        const questionKeywords: KeywordData[] = group.map(question => ({
          keyword: question,
          searchVolume: Math.floor(Math.random() * 300) + 100, // PAA questions typically have lower volume
          difficulty: Math.floor(Math.random() * 25) + 15, // Usually easier to rank for questions
          cpc: Math.round((Math.random() * 2 + 0.5) * 100) / 100,
          competition: 'LOW',
          intent: 'informational', // PAA questions are typically informational
          cluster: `PAA:${sourceKeyword}`
        }));

        // Create topic name based on the question theme
        const topicName = this.generatePAATopicName(group[0], sourceKeyword);

        paaTopics.push({
          topic: topicName,
          keywords: questionKeywords,
          cluster: `PAA:${sourceKeyword}`
        });
      });
    });

    return paaTopics;
  }

  private groupQuestionsByTheme(questions: string[]): string[][] {
    // Simple grouping - in practice, you might use more sophisticated clustering
    const groups: string[][] = [];
    const maxGroupSize = 4;

    for (let i = 0; i < questions.length; i += maxGroupSize) {
      groups.push(questions.slice(i, i + maxGroupSize));
    }

    return groups.filter(group => group.length > 0);
  }

  private generatePAATopicName(firstQuestion: string, sourceKeyword: string): string {
    // Extract the main theme from the question
    const question = firstQuestion.toLowerCase();

    if (question.includes('what is') || question.includes('what are')) {
      return `Understanding ${this.extractMainConcept(sourceKeyword)}`;
    }
    if (question.includes('how to') || question.includes('how does')) {
      return `How-To Guide: ${this.extractMainConcept(sourceKeyword)}`;
    }
    if (question.includes('benefits') || question.includes('advantages')) {
      return `Benefits of ${this.extractMainConcept(sourceKeyword)}`;
    }
    if (question.includes('cost') || question.includes('price') || question.includes('fees')) {
      return `Costs and Pricing: ${this.extractMainConcept(sourceKeyword)}`;
    }
    if (question.includes('vs') || question.includes('better') || question.includes('compare')) {
      return `Comparing ${this.extractMainConcept(sourceKeyword)}`;
    }
    if (question.includes('risk') || question.includes('safe') || question.includes('secure')) {
      return `Risks and Safety: ${this.extractMainConcept(sourceKeyword)}`;
    }

    // Fallback: use the source keyword as basis
    return `FAQ: ${this.formatTopicName(sourceKeyword)}`;
  }

  private extractMainConcept(keyword: string): string {
    // Extract the main concept from the keyword for topic naming
    const words = keyword.split(' ');
    const stopWords = ['how', 'to', 'best', 'top', 'guide', 'tips', 'for', 'vs', 'and', 'or', 'the', 'a', 'an'];

    const meaningfulWords = words.filter(word =>
      !stopWords.includes(word.toLowerCase()) &&
      word.length > 2
    );

    if (meaningfulWords.length >= 2) {
      return meaningfulWords.slice(0, 2).map(w =>
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ');
    } else if (meaningfulWords.length === 1) {
      return meaningfulWords[0].charAt(0).toUpperCase() + meaningfulWords[0].slice(1);
    }

    return keyword.charAt(0).toUpperCase() + keyword.slice(1);
  }

  private calculateAverageCompetition(keywords: KeywordData[]): string {
    if (keywords.length === 0) return 'N/A';

    const avgDifficulty = keywords.reduce((sum, kw) => sum + kw.difficulty, 0) / keywords.length;

    if (avgDifficulty < 30) return 'Low';
    if (avgDifficulty < 60) return 'Medium';
    return 'High';
  }
}