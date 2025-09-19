import fs from 'fs-extra';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import inquirer from 'inquirer';
import { FileManager } from '../shared/fileManager.js';
import { logger } from '../shared/logger.js';
import { config } from '../shared/config.js';
import { ScriptConfig, KeywordTopic, WritingInstructions, InternalLink, ArticleContent } from '../types/index.js';

export class BlogWriterScript {
  private fileManager: FileManager;
  private anthropic: Anthropic;

  constructor() {
    this.fileManager = new FileManager();
    this.anthropic = new Anthropic({
      apiKey: config.anthropic.apiKey
    });
  }

  async execute(config: ScriptConfig): Promise<void> {
    logger.script(5, 'Blog Writer');

    try {
      // Load required data files
      logger.startSpinner('Loading project data...');
      const keywordTopics = await this.fileManager.loadKeywordTopics(config.companyPath);
      const writingInstructions = await this.fileManager.loadWritingInstructions(config.companyPath);
      const internalLinks = await this.fileManager.loadInternalLinks(config.companyPath);

      // Filter out used topics
      const availableTopics = keywordTopics.filter(topic => !topic.used);

      logger.stopSpinner();
      console.log('');
      logger.subsection('Available Topics:');

      if (availableTopics.length === 0) {
        throw new Error('No unused topics available. All topics have been used for article generation.');
      }

      // Show used topics count if any
      const usedCount = keywordTopics.length - availableTopics.length;
      if (usedCount > 0) {
        logger.info(`${usedCount} topic(s) already used and filtered out`);
        console.log('');
      }

      // Prepare topic choices for interactive selection
      const topTopics = availableTopics.slice(0, 5); // Show top 5 topics
      const topicChoices = topTopics.map((topic, index) => {
        const totalVolume = topic.keywords.reduce((sum, kw) => sum + kw.searchVolume, 0);
        const sampleKeywords = topic.keywords.slice(0, 3).map(kw => kw.keyword).join(', ');

        return {
          name: `${topic.topic}\n     Keywords: ${topic.keywords.length} | Volume: ${totalVolume}\n     Sample: ${sampleKeywords}`,
          value: index,
          short: topic.topic
        };
      });

      // Interactive topic selection
      const { selectedTopicIndex } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedTopicIndex',
          message: 'Select a topic for your blog article:',
          choices: topicChoices,
          pageSize: 10
        }
      ]);

      const selectedTopic = topTopics[selectedTopicIndex];

      // Show available keywords for the selected topic
      console.log('');
      logger.subsection(`Keywords for "${selectedTopic.topic}":`);
      selectedTopic.keywords.slice(0, 5).forEach((keyword, index) => {
        console.log(`  ${index + 1}. ${keyword.keyword} (Volume: ${keyword.searchVolume})`);
      });

      // Interactive keyword selection
      const keywordChoices = selectedTopic.keywords.slice(0, 5).map((keyword, index) => ({
        name: `${keyword.keyword} (Volume: ${keyword.searchVolume}, Difficulty: ${keyword.difficulty})`,
        value: index,
        short: keyword.keyword
      }));

      const { selectedKeywordIndex } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedKeywordIndex',
          message: 'Select the target keyword:',
          choices: keywordChoices
        }
      ]);

      const targetKeyword = selectedTopic.keywords[selectedKeywordIndex].keyword;

      console.log('');
      logger.info(`Selected topic: ${selectedTopic.topic}`);
      logger.info(`Target keyword: ${targetKeyword}`);

      // Generate article
      logger.startSpinner('Generating blog article...');
      const article = await this.generateArticle(
        selectedTopic,
        targetKeyword,
        writingInstructions,
        internalLinks
      );

      // Save article
      logger.updateSpinner('Saving article...');
      const filePath = await this.fileManager.saveArticle(config.companyPath, article);

      // Mark topic as used
      logger.updateSpinner('Marking topic as used...');
      const topicIndex = keywordTopics.findIndex(topic => topic.topic === selectedTopic.topic);
      if (topicIndex !== -1) {
        keywordTopics[topicIndex].used = true;
        keywordTopics[topicIndex].usedAt = new Date();
        await this.fileManager.updateKeywordTopics(config.companyPath, keywordTopics);
      }

      logger.stopSpinner();
      logger.success('Blog article generated successfully!');

      // Display summary
      console.log('');
      logger.subsection('Article Details:');
      logger.list([
        `Title: ${article.title}`,
        `Target keyword: ${article.metadata.targetKeyword}`,
        `Word count: ${article.metadata.wordCount}`,
        `Reading time: ${article.metadata.readingTime} minutes`,
        `Internal links: ${article.internalLinks.length}`,
        `Keywords: ${article.keywords.length}`
      ]);

      logger.info(`File saved: ${filePath}`);

      // Show article preview
      console.log('');
      logger.subsection('Article Preview:');
      const lines = article.content.split('\n');
      const preview = lines.slice(0, 10).join('\n');
      console.log(preview);
      if (lines.length > 10) {
        console.log(`\n... and ${lines.length - 10} more lines`);
      }

    } catch (error) {
      logger.stopSpinner(false);
      throw new Error(`Script 5 failed: ${(error as Error).message}`);
    }
  }

  private async generateArticle(
    topic: KeywordTopic,
    targetKeyword: string,
    writingInstructions: WritingInstructions,
    internalLinks: InternalLink[]
  ): Promise<ArticleContent> {
    try {
      // Load additional guidelines
      const seoGuidelines = await this.loadFile('SEO_BEST_PRACTICES.md');
      const editingInstructions = await this.loadFile('EDITING_INSTRUCTIONS.md');
      const writingBestPractices = await this.loadFile('writing-best-practises.md');

      // Create comprehensive prompt
      const prompt = this.createArticlePrompt(
        topic,
        targetKeyword,
        writingInstructions,
        internalLinks,
        seoGuidelines,
        editingInstructions,
        writingBestPractices
      );

      // Generate content using Claude
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0].type === 'text' ? response.content[0].text : '';

      // Extract title from content
      const title = this.extractTitle(content, targetKeyword);

      // Calculate metadata with accurate word counting
      const wordCount = this.calculateWordCount(content);
      const readingTime = Math.ceil(wordCount / 200); // 200 words per minute

      // Extract internal links used in content
      const usedInternalLinks = this.extractInternalLinks(content, internalLinks);

      return {
        title,
        content,
        keywords: [targetKeyword, ...topic.keywords.slice(1, 6).map(kw => kw.keyword)],
        internalLinks: usedInternalLinks,
        metadata: {
          wordCount,
          readingTime,
          articleType: 'educational',
          targetKeyword,
          createdAt: new Date()
        }
      };

    } catch (error) {
      throw new Error(`Failed to generate article: ${(error as Error).message}`);
    }
  }

  private createArticlePrompt(
    topic: KeywordTopic,
    targetKeyword: string,
    writingInstructions: WritingInstructions,
    internalLinks: InternalLink[],
    seoGuidelines: string,
    editingInstructions: string,
    writingBestPractices: string
  ): string {
    const relatedKeywords = topic.keywords.slice(1, 8).map(kw => kw.keyword).join(', ');
    const topInternalLinks = internalLinks
      .filter(link => ['homepage', 'service', 'about', 'contact'].includes(link.pageType))
      .slice(0, 5);

    return `You are a professional blog writer creating content for ${writingInstructions.company}.

ASSIGNMENT:
Write a comprehensive, narrative-driven blog article about "${targetKeyword}" that follows all the guidelines below.

TARGET KEYWORD: ${targetKeyword}
RELATED KEYWORDS TO INCLUDE: ${relatedKeywords}

COMPANY WRITING INSTRUCTIONS:
${JSON.stringify(writingInstructions, null, 2)}

AVAILABLE INTERNAL LINKS:
${topInternalLinks.map(link => `
- URL: ${link.url}
- Title: ${link.title}
- Usage Notes: ${link.usageNotes}
- Suggested Anchor Text: ${link.suggestedAnchorText.join(', ')}
`).join('\n')}

CRITICAL WRITING REQUIREMENTS:
- WRITE IN FLOWING PARAGRAPHS, NOT BULLET POINTS
- Use bullet points SPARINGLY (maximum 1-2 short lists in entire article)
- Focus on narrative, explanatory prose
- Each paragraph should be 3-6 sentences long
- Connect ideas smoothly between paragraphs
- Use transitional phrases and sentences

SEO REQUIREMENTS:
- Target keyword in title (H1)
- Keyword in first 100 words
- Keyword in at least one H2 heading
- Use keyword 3-5 times naturally throughout
- Include 3-5 internal links naturally
- 1,500-2,500 words
- Clear H2/H3 structure
- Meta description ready title

CONTENT STRUCTURE:
1. Compelling headline with target keyword
2. Hook introduction (100-150 words)
3. ${writingInstructions.blogStructure.defaultOutline.join('\n4. ')}
4. Strong conclusion with call-to-action

TONE & STYLE:
- Voice: ${writingInstructions.toneStyle.voice}
- Tone: ${writingInstructions.toneStyle.tone}
- Perspective: ${writingInstructions.toneStyle.perspective}
- Brand Keywords: ${writingInstructions.toneStyle.brandKeywords.join(', ')}

AUDIENCE:
${writingInstructions.audiencePersonas.map(persona => `
- ${persona.persona}: ${persona.role}
- Pain Points: ${persona.painPoints.join(', ')}
- Content Needs: ${persona.contentNeeds.join(', ')}
`).join('\n')}

CALL-TO-ACTION:
Use one of these CTAs: ${writingInstructions.cta.exampleCopy.join(' | ')}

WRITING STYLE GUIDELINES:
- Write in conversational, engaging prose
- Explain concepts in paragraph form, not lists
- Use examples and analogies to illustrate points
- Build arguments logically from paragraph to paragraph
- Include data and insights within narrative text
- Avoid excessive use of colons and dashes
- Write complete sentences that flow naturally

PARAGRAPH STRUCTURE:
- Introduction paragraph: Hook + context + preview of what's to come
- Body paragraphs: Topic sentence + supporting details + examples + transition
- Each section should tell a story or make a complete argument
- Use subheadings to organize major topics, but keep content in paragraph form

OUTPUT FORMAT:
Return only the article content in markdown format with:
- H1 title
- H2 and H3 subheadings
- Rich paragraph-based content (3-6 sentences per paragraph)
- Natural internal links woven into the narrative
- Professional formatting with minimal bullet points

EXAMPLES OF GOOD vs BAD WRITING:

BAD (bullet-heavy):
"Key benefits include:
- Higher returns
- Better diversification
- Professional management"

GOOD (narrative):
"Professional portfolio management delivers several compelling advantages for serious investors. The most significant benefit comes from higher risk-adjusted returns, as experienced managers can identify opportunities that individual investors often miss. Additionally, professional management provides sophisticated diversification strategies that go beyond simply spreading investments across different sectors."

Write the complete article now:`;
  }

  private async loadFile(fileName: string): Promise<string> {
    try {
      const filePath = path.join(process.cwd(), fileName);
      return await fs.readFile(filePath, 'utf8');
    } catch {
      return `${fileName} not available`;
    }
  }

  private extractTitle(content: string, fallback: string): string {
    // Look for H1 title in the content
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) {
      return h1Match[1].trim();
    }

    // Look for title in first line
    const lines = content.split('\n');
    const firstLine = lines[0].trim();
    if (firstLine.length > 10 && firstLine.length < 100) {
      return firstLine.replace(/^#+\s*/, '');
    }

    // Generate title from keyword
    return `The Complete Guide to ${fallback.split(' ').map(w =>
      w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;
  }

  private extractInternalLinks(content: string, availableLinks: InternalLink[]): Array<{
    url: string;
    anchorText: string;
    context: string;
  }> {
    const usedLinks: Array<{ url: string; anchorText: string; context: string; }> = [];

    // Look for markdown links in content
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      const anchorText = match[1];
      const url = match[2];

      // Find the context (sentence containing the link)
      const linkIndex = match.index;
      const beforeLink = content.substring(0, linkIndex);
      const afterLink = content.substring(linkIndex + match[0].length);

      const sentenceStart = beforeLink.lastIndexOf('.') + 1;
      const sentenceEnd = afterLink.indexOf('.');
      const context = content.substring(sentenceStart, linkIndex + match[0].length + sentenceEnd).trim();

      usedLinks.push({
        url,
        anchorText,
        context
      });
    }

    return usedLinks;
  }

  private calculateWordCount(content: string): number {
    // Remove markdown headers, links, and other formatting
    const cleanContent = content
      .replace(/#{1,6}\s+/g, '') // Remove markdown headers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert [text](url) to text
      .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1') // Remove bold/italic formatting
      .replace(/`([^`]+)`/g, '$1') // Remove code formatting
      .replace(/---[\s\S]*?---/g, '') // Remove frontmatter
      .replace(/^\s*[-*+]\s+/gm, '') // Remove bullet point markers
      .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Split by spaces and filter out empty strings
    const words = cleanContent.split(/\s+/).filter(word => word.length > 0);

    return words.length;
  }
}