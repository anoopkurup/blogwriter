import fs from 'fs-extra';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { FileManager } from '../shared/fileManager.js';
import { logger } from '../shared/logger.js';
import { config } from '../shared/config.js';
import { ScriptConfig, WritingInstructions, InternalLink } from '../types/index.js';

export class BlogEditorScript {
  private fileManager: FileManager;
  private anthropic: Anthropic;

  constructor() {
    this.fileManager = new FileManager();
    this.anthropic = new Anthropic({
      apiKey: config.anthropic.apiKey
    });
  }

  async execute(config: ScriptConfig & { articleFile: string }): Promise<void> {
    logger.script(6, 'Blog Editor');

    try {
      // Load the article to edit
      logger.startSpinner('Loading article...');
      const articleContent = await this.fileManager.loadArticle(config.companyPath, config.articleFile);

      // Load all guidelines and instructions
      logger.updateSpinner('Loading guidelines...');
      const writingInstructions = await this.fileManager.loadWritingInstructions(config.companyPath);
      const internalLinks = await this.fileManager.loadInternalLinks(config.companyPath);
      const seoGuidelines = await this.loadFile('SEO_BEST_PRACTICES.md');
      const editingInstructions = await this.loadFile('EDITING_INSTRUCTIONS.md');
      const writingBestPractices = await this.loadFile('writing-best-practises.md');

      // Analyze current article comprehensively
      logger.updateSpinner('Performing comprehensive quality analysis...');
      const analysis = this.analyzeArticle(articleContent, writingInstructions, internalLinks);

      // Show analysis results
      logger.stopSpinner();
      console.log('');
      logger.subsection('📊 Comprehensive Article Analysis:');

      logger.info('✅ Passed Quality Checks:');
      analysis.passed.forEach(check => console.log(`  ${check}`));

      if (analysis.seoIssues.length > 0) {
        console.log('');
        logger.warn('🔍 SEO Issues Found:');
        analysis.seoIssues.forEach(issue => console.log(`  • ${issue}`));
      }

      if (analysis.writingIssues.length > 0) {
        console.log('');
        logger.warn('✍️  Writing Quality Issues:');
        analysis.writingIssues.forEach(issue => console.log(`  • ${issue}`));
      }

      if (analysis.forbiddenWordsFound.length > 0) {
        console.log('');
        logger.warn('🚫 Forbidden Marketing Phrases Found:');
        analysis.forbiddenWordsFound.slice(0, 10).forEach(word => console.log(`  • "${word}"`));
        if (analysis.forbiddenWordsFound.length > 10) {
          console.log(`  • ... and ${analysis.forbiddenWordsFound.length - 10} more`);
        }
      }

      if (analysis.issues.length > 0) {

        // Edit the article
        logger.startSpinner('Editing article to fix issues...');
        const editedContent = await this.editArticle(
          articleContent,
          analysis,
          writingInstructions,
          internalLinks,
          seoGuidelines,
          editingInstructions,
          writingBestPractices
        );

        // Update article with improvements
        logger.updateSpinner('Updating article with improvements...');
        const editedPath = path.join(config.companyPath, 'articles', config.articleFile);
        await fs.writeFile(editedPath, editedContent, 'utf8');

        logger.stopSpinner();
        logger.success('Article updated and improved!');

        console.log('');
        logger.info(`Article updated: ${config.articleFile}`);

        // Show improvement summary
        const newAnalysis = this.analyzeArticle(editedContent, writingInstructions, internalLinks);
        console.log('');
        logger.subsection('📈 Improvement Summary:');
        const editedWordCount = this.countWords(editedContent);
        const editedReadingTime = this.calculateReadingTime(editedContent);
        const originalWordCount = this.countWords(articleContent);
        const originalReadingTime = this.calculateReadingTime(articleContent);

        logger.list([
          `Total issues fixed: ${analysis.issues.length - newAnalysis.issues.length}/${analysis.issues.length}`,
          `SEO issues fixed: ${analysis.seoIssues.length - newAnalysis.seoIssues.length}/${analysis.seoIssues.length}`,
          `Writing issues fixed: ${analysis.writingIssues.length - newAnalysis.writingIssues.length}/${analysis.writingIssues.length}`,
          `Forbidden words removed: ${analysis.forbiddenWordsFound.length - newAnalysis.forbiddenWordsFound.length}/${analysis.forbiddenWordsFound.length}`,
          `Quality score: ${newAnalysis.passed.length}/${newAnalysis.passed.length + newAnalysis.issues.length} checks passed`,
          `Word count: ${originalWordCount} → ${editedWordCount} words`,
          `Reading time: ${originalReadingTime} → ${editedReadingTime} minutes`,
          `Internal links: ${this.countInternalLinks(editedContent)}`
        ]);

        if (newAnalysis.forbiddenWordsFound.length > 0) {
          console.log('');
          logger.warn('⚠️  Remaining forbidden words that need manual review:');
          newAnalysis.forbiddenWordsFound.slice(0, 5).forEach(word => console.log(`  • "${word}"`));
        }

      } else {
        logger.success('No issues found! Article meets all quality standards.');

        console.log('');
        logger.subsection('🎉 Article Quality Summary:');
        const articleWordCount = this.countWords(articleContent);
        const articleReadingTime = this.calculateReadingTime(articleContent);

        logger.list([
          `Quality score: ${analysis.passed.length}/${analysis.passed.length} checks passed`,
          `Word count: ${articleWordCount} words`,
          `Reading time: ${articleReadingTime} minutes`,
          `Internal links: ${this.countInternalLinks(articleContent)}`,
          `SEO optimization: Complete`,
          `Writing quality: Excellent`,
          `Marketing language: Clean`
        ]);
      }

    } catch (error) {
      logger.stopSpinner(false);
      throw new Error(`Script 6 failed: ${(error as Error).message}`);
    }
  }

  private analyzeArticle(
    content: string,
    writingInstructions: WritingInstructions,
    internalLinks: InternalLink[]
  ): { passed: string[]; issues: string[]; seoIssues: string[]; writingIssues: string[]; forbiddenWordsFound: string[] } {
    const passed: string[] = [];
    const issues: string[] = [];
    const seoIssues: string[] = [];
    const writingIssues: string[] = [];
    const forbiddenWordsFound: string[] = [];

    // Extract title and meta description
    const titleMatch = content.match(/title:\s*"([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : this.extractH1Title(content);
    // Extract H1 title
    const h1Title = this.extractH1Title(content);
    const wordCount = this.countWords(content);

    // === COMPREHENSIVE SEO ANALYSIS ===

    // SEO Check 1: Title optimization
    if (title && title.length <= 60) {
      passed.push('✅ Title length ≤ 60 characters');
    } else {
      seoIssues.push('Title exceeds 60 characters or missing');
    }

    // SEO Check 2: Primary keyword in title
    const hasKeywordInTitle = writingInstructions.seoGuidelines.primaryKeywordExamples.some(keyword =>
      title.toLowerCase().includes(keyword.toLowerCase())
    );
    if (hasKeywordInTitle) {
      passed.push('✅ Primary keyword found in title');
    } else {
      seoIssues.push('Primary keyword missing from title');
    }

    // SEO Check 3: Meta description
    const metaDescMatch = content.match(/description:\s*"([^"]+)"/);
    if (metaDescMatch && metaDescMatch[1].length >= 150 && metaDescMatch[1].length <= 160) {
      passed.push('✅ Meta description optimized (150-160 chars)');
    } else {
      seoIssues.push('Meta description missing or wrong length');
    }

    // SEO Check 4: Keyword in first 100 words
    const first100Words = content.split(' ').slice(0, 100).join(' ').toLowerCase();
    const keywordInOpening = writingInstructions.seoGuidelines.primaryKeywordExamples.some(keyword =>
      first100Words.includes(keyword.toLowerCase())
    );
    if (keywordInOpening) {
      passed.push('✅ Keyword in first 100 words');
    } else {
      seoIssues.push('Primary keyword missing from first 100 words');
    }

    // SEO Check 5: Keyword in H2/H3 headings
    const headings = content.match(/^#{2,3}\s+(.+)$/gm) || [];
    const keywordInHeadings = headings.some(heading =>
      writingInstructions.seoGuidelines.primaryKeywordExamples.some(keyword =>
        heading.toLowerCase().includes(keyword.toLowerCase())
      )
    );
    if (keywordInHeadings) {
      passed.push('✅ Keyword found in subheadings');
    } else {
      seoIssues.push('Primary keyword missing from H2/H3 headings');
    }

    // SEO Check 6: Word count by content type
    const contentType = this.determineContentType(title, content);
    const { min, max } = this.getWordCountRange(contentType);
    if (wordCount >= min && wordCount <= max) {
      passed.push(`✅ Word count appropriate for ${contentType} (${wordCount} words)`);
    } else {
      seoIssues.push(`Word count ${wordCount} outside optimal range for ${contentType} (${min}-${max} words)`);
    }

    // SEO Check 7: Internal links optimization
    const internalLinkCount = this.countInternalLinks(content);
    const expectedLinks = Math.floor(wordCount / 1000) * 3; // 3-8 links per 1000 words
    const minLinks = Math.max(3, expectedLinks - 2);
    const maxLinks = expectedLinks + 5;
    if (internalLinkCount >= minLinks && internalLinkCount <= maxLinks) {
      passed.push(`✅ Internal links optimized (${internalLinkCount} links)`);
    } else {
      seoIssues.push(`Internal links suboptimal (${internalLinkCount} links, expected ${minLinks}-${maxLinks})`);
    }

    // SEO Check 8: Heading hierarchy
    const h1Count = (content.match(/^# /gm) || []).length;
    const h2Count = (content.match(/^## /gm) || []).length;
    const h3Count = (content.match(/^### /gm) || []).length;
    if (h1Count === 1 && h2Count >= 3 && h2Count <= 8) {
      passed.push(`✅ Proper heading structure (${h1Count} H1, ${h2Count} H2, ${h3Count} H3)`);
    } else {
      seoIssues.push(`Heading structure needs improvement (${h1Count} H1, ${h2Count} H2, ${h3Count} H3)`);
    }

    // SEO Check 9: Image alt text
    const images = content.match(/!\[([^\]]*)\]/g) || [];
    const imagesWithAlt = images.filter(img => {
      const altText = img.match(/!\[([^\]]+)\]/);
      return altText && altText[1].length > 0;
    });
    if (images.length === 0 || imagesWithAlt.length === images.length) {
      passed.push('✅ All images have alt text');
    } else {
      seoIssues.push(`${images.length - imagesWithAlt.length} images missing alt text`);
    }

    // === WRITING QUALITY ANALYSIS ===

    // Writing Check 1: Forbidden words detection
    const foundForbidden = this.detectForbiddenWords(content);
    if (foundForbidden.length === 0) {
      passed.push('✅ No forbidden marketing phrases found');
    } else {
      forbiddenWordsFound.push(...foundForbidden);
      writingIssues.push(`${foundForbidden.length} forbidden phrases found: ${foundForbidden.slice(0, 3).join(', ')}${foundForbidden.length > 3 ? '...' : ''}`);
    }

    // Writing Check 2: Paragraph length
    const paragraphs = content.split('\n\n').filter(p => p.trim() && !p.startsWith('#') && !p.startsWith('!'));
    const longParagraphs = paragraphs.filter(p => p.split(' ').length > 150);
    if (longParagraphs.length === 0) {
      passed.push('✅ All paragraphs ≤ 150 words');
    } else {
      writingIssues.push(`${longParagraphs.length} paragraphs exceed 150 words`);
    }

    // Writing Check 3: Bullet point usage
    const bulletPoints = content.match(/^\s*[-*+]\s/gm) || [];
    const numberedLists = content.match(/^\s*\d+\.\s/gm) || [];
    const totalLists = bulletPoints.length + numberedLists.length;
    if (totalLists <= Math.floor(wordCount / 500)) { // Max 1 list per 500 words
      passed.push('✅ Bullet points used sparingly');
    } else {
      writingIssues.push(`Too many bullet points/lists (${totalLists} found)`);
    }

    // Writing Check 4: Sentence length
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const longSentences = sentences.filter(s => s.split(' ').length > 25);
    if (longSentences.length <= sentences.length * 0.1) { // Max 10% long sentences
      passed.push('✅ Sentence lengths appropriate');
    } else {
      writingIssues.push(`${longSentences.length} sentences too long (>25 words)`);
    }

    // Writing Check 5: Brand keyword usage
    const brandKeywordUsage = writingInstructions.toneStyle.brandKeywords.some(keyword =>
      content.toLowerCase().includes(keyword.toLowerCase())
    );
    if (brandKeywordUsage) {
      passed.push('✅ Brand keywords included');
    } else {
      writingIssues.push('Brand keywords missing from content');
    }

    // Writing Check 6: Call-to-action
    const hasCTA = writingInstructions.cta.exampleCopy.some(cta =>
      content.toLowerCase().includes(cta.toLowerCase().split('→')[0].trim())
    );
    if (hasCTA) {
      passed.push('✅ Call-to-action present');
    } else {
      writingIssues.push('Call-to-action missing or unclear');
    }

    // Writing Check 7: Introduction structure
    const introSection = content.split('\n\n')[1] || ''; // First paragraph after title
    if (introSection.split(' ').length >= 25 && introSection.split(' ').length <= 150) {
      passed.push('✅ Introduction length appropriate');
    } else {
      writingIssues.push('Introduction too short or too long');
    }

    // Reading time calculation
    const readingTime = this.calculateReadingTime(content);
    passed.push(`📖 Reading time: ${readingTime} minutes`);

    // Combine all issues
    issues.push(...seoIssues, ...writingIssues);

    return { passed, issues, seoIssues, writingIssues, forbiddenWordsFound };
  }

  private async editArticle(
    content: string,
    analysis: { passed: string[]; issues: string[]; seoIssues: string[]; writingIssues: string[]; forbiddenWordsFound: string[] },
    writingInstructions: WritingInstructions,
    internalLinks: InternalLink[],
    seoGuidelines: string,
    editingInstructions: string,
    writingBestPractices: string
  ): Promise<string> {
    try {
      const prompt = this.createEditingPrompt(
        content,
        analysis,
        writingInstructions,
        internalLinks,
        seoGuidelines,
        editingInstructions,
        writingBestPractices
      );

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return response.content[0].type === 'text' ? response.content[0].text : content;

    } catch (error) {
      logger.warn(`AI editing failed: ${(error as Error).message}`);
      return this.performBasicEditing(content, analysis, writingInstructions);
    }
  }

  private createEditingPrompt(
    content: string,
    analysis: { passed: string[]; issues: string[]; seoIssues: string[]; writingIssues: string[]; forbiddenWordsFound: string[] },
    writingInstructions: WritingInstructions,
    internalLinks: InternalLink[],
    seoGuidelines: string,
    editingInstructions: string,
    writingBestPractices: string
  ): string {
    const forbiddenWordsList = this.loadForbiddenWords();

    return `You are a professional blog editor following a systematic editing workflow. Edit this article step-by-step according to both SEO best practices and natural writing guidelines.

## COMPANY CONTEXT
Company: ${writingInstructions.company}
Brand Voice: ${writingInstructions.toneStyle.voice}
Target Keywords: ${writingInstructions.seoGuidelines.primaryKeywordExamples.join(', ')}

## SYSTEMATIC EDITING WORKFLOW

### STEP 1: SEO OPTIMIZATION FIXES
${analysis.seoIssues.length > 0 ? analysis.seoIssues.map(issue => `- FIX: ${issue}`).join('\n') : '- SEO optimization complete'}

**SEO Requirements Checklist:**
- [ ] Title ≤ 60 characters with primary keyword
- [ ] Meta description 150-160 characters
- [ ] Primary keyword in first 100 words
- [ ] Keyword in H2/H3 headings
- [ ] Proper heading hierarchy (1 H1, 3-6 H2s)
- [ ] Internal links: 3-8 per 1000 words with descriptive anchor text
- [ ] All images have keyword-rich alt text

### STEP 2: FORBIDDEN WORDS REMOVAL
${analysis.forbiddenWordsFound.length > 0 ?
`**Remove and replace these forbidden marketing phrases:**
${analysis.forbiddenWordsFound.map(word => `- "${word}" → Replace with natural language`).join('\n')}

**Complete forbidden words list to avoid:**
${forbiddenWordsList.join(', ')}

**Replacement Guidelines:**
- Replace "unlock" with "access" or "use"
- Replace "dive into" with "explore" or "examine"
- Replace "leverage" with "use" or "apply"
- Replace "crucial/critical" with "important" or "necessary"
- Replace "journey" with "process" or "experience"
- Remove filler phrases like "it is important to note"
- Use direct, conversational language instead` :
'- No forbidden words detected'}

### STEP 3: WRITING QUALITY IMPROVEMENTS
${analysis.writingIssues.length > 0 ? analysis.writingIssues.map(issue => `- IMPROVE: ${issue}`).join('\n') : '- Writing quality meets standards'}

**Writing Quality Requirements:**
- Write in flowing paragraphs (3-6 sentences each, max 150 words)
- Use bullet points SPARINGLY (max 1-2 lists per article)
- Connect ideas with smooth transitions
- Keep sentences under 25 words
- Use conversational yet professional tone
- Include specific examples and data
- Address reader directly with "you"

### STEP 4: CONTENT STRUCTURE OPTIMIZATION
**Required Structure:**
1. **Introduction (100-150 words):** Hook + problem/opportunity + preview
2. **Body Sections:** ${writingInstructions.blogStructure.defaultOutline.join(', ')}
3. **Conclusion:** Summary + clear next steps + compelling CTA

**Content Metrics:**
- Target word count: ${this.getWordCountRange(this.determineContentType(content.split('\n')[0] || '', content)).min}-${this.getWordCountRange(this.determineContentType(content.split('\n')[0] || '', content)).max} words
- Target reading time: ${Math.ceil(this.getWordCountRange(this.determineContentType(content.split('\n')[0] || '', content)).min / 200)}-${Math.ceil(this.getWordCountRange(this.determineContentType(content.split('\n')[0] || '', content)).max / 200)} minutes

### STEP 5: INTERNAL LINKING ENHANCEMENT
**Available Internal Links:**
${internalLinks.slice(0, 8).map(link =>
`- [${link.title}](${link.url}) - Use when: ${link.usageNotes} - Anchor: "${link.suggestedAnchorText.join('" or "')}"`
).join('\n')}

**Linking Guidelines:**
- Use descriptive anchor text (avoid "click here")
- Link naturally within content flow
- Prioritize service/product pages
- Include 3-8 links total

## CURRENT ARTICLE TO EDIT:
\`\`\`
${content}
\`\`\`

## EDITING INSTRUCTIONS
1. Apply ALL fixes systematically in the order listed above
2. Maintain the article's core value and message
3. Ensure natural, conversational flow
4. Include compelling call-to-action from: ${writingInstructions.cta.exampleCopy.join(' | ')}
5. Verify all SEO requirements are met
6. Remove ALL forbidden marketing phrases
7. Optimize for readability and engagement

## OUTPUT FORMAT
Return ONLY the complete edited article in markdown format with:
- Frontmatter with title, keywords, word count, reading time, article type, target keyword
- H1 title with primary keyword
- Proper H2/H3 structure
- Natural paragraph flow with smooth transitions
- Strategic internal links
- Clear call-to-action
- Clean, professional language without marketing fluff

Begin editing now:`;
  }

  private performBasicEditing(
    content: string,
    analysis: { passed: string[]; issues: string[]; seoIssues: string[]; writingIssues: string[]; forbiddenWordsFound: string[] },
    writingInstructions: WritingInstructions
  ): string {
    let editedContent = content;

    // Basic fixes that can be done programmatically

    // Fix forbidden words
    analysis.forbiddenWordsFound.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      switch (word.toLowerCase()) {
        case 'unlock':
        case 'unleash':
          editedContent = editedContent.replace(regex, 'access');
          break;
        case 'dive':
        case 'diving':
        case 'delve':
          editedContent = editedContent.replace(regex, 'explore');
          break;
        case 'leverage':
          editedContent = editedContent.replace(regex, 'use');
          break;
        case 'crucial':
        case 'critical':
          editedContent = editedContent.replace(regex, 'important');
          break;
        case 'journey':
          editedContent = editedContent.replace(regex, 'process');
          break;
        default:
          // Remove the word if no replacement is obvious
          editedContent = editedContent.replace(regex, '');
      }
    });

    // Fix basic SEO issues
    analysis.seoIssues.forEach(issue => {
      if (issue.includes('Title exceeds 60 characters')) {
        const titleMatch = editedContent.match(/title:\s*"([^"]+)"/);
        if (titleMatch && titleMatch[1].length > 60) {
          const shortTitle = titleMatch[1].substring(0, 57) + '...';
          editedContent = editedContent.replace(titleMatch[0], `title: "${shortTitle}"`);
        }
      }
    });

    // Fix writing issues
    analysis.writingIssues.forEach(issue => {
      if (issue.includes('Call-to-action missing')) {
        const cta = writingInstructions.cta.exampleCopy[0] || 'Contact us to learn more → Get Started';
        editedContent += `\n\n## Ready to Get Started?\n\n${cta}`;
      }
    });

    return editedContent;
  }

  private async loadFile(fileName: string): Promise<string> {
    try {
      const filePath = path.join(process.cwd(), fileName);
      return await fs.readFile(filePath, 'utf8');
    } catch {
      return `${fileName} not available`;
    }
  }

  private extractH1Title(content: string): string {
    const h1Match = content.match(/^# (.+)$/m);
    return h1Match ? h1Match[1] : '';
  }

  private countWords(content: string): number {
    // Enhanced word counting with comprehensive markdown formatting removal
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

  private calculateReadingTime(content: string): number {
    const wordCount = this.countWords(content);
    return Math.ceil(wordCount / 200); // 200 words per minute
  }

  private countInternalLinks(content: string): number {
    const linkMatches = content.match(/\[([^\]]+)\]\(([^)]+)\)/g);
    return linkMatches ? linkMatches.length : 0;
  }

  private loadForbiddenWords(): string[] {
    return [
      'additionally', 'amidst', 'beacon', 'bespoke', 'bombastic', 'by storm', 'by the same token',
      'captivate', 'comparatively', 'competitive digital world', 'complexities', 'conclusion',
      'confluence', 'consciously', 'correspondingly', 'craft', 'credibility', 'crucial',
      'cultivate', 'cultivating', 'daunting', 'debunking', 'deciphering', 'decoding', 'deep',
      'delve', 'delving', 'demystified', 'demystifying', 'digital world', 'discover', 'dive',
      'diverse', 'diving', 'diving deeper', 'drawback', 'dynamic', 'ecosystem', 'elements',
      'elevate', 'embark', 'embrace', 'embracing', 'encompass', 'engaging', 'enhance',
      'enhancing', 'ensuring', 'epic', 'equally', 'equally important', 'equipped',
      'ever-changing', 'ever-evolving', 'evolving', 'explore', 'extensive', 'facilitate',
      'firstly', 'for instance', 'furry friend', 'furthermore', 'generated by al', 'glance',
      'glean', 'gone are the days', 'grappling', 'hailed', 'harness', 'hitherto', 'hype',
      'identically', 'imagine this', 'in conclusion', 'in light of', 'in the sea of',
      'in this digital landscape', 'in this way', 'in today', "in today's", 'incorporating',
      'initiating', 'interference', 'intricacies', 'intrinsically', 'it can be a daunting task',
      'it is crucial', 'it is essential', 'it is important', "it's about", "it's all about",
      'journey', 'key', 'landscape', 'lastly', "let's dive in", 'leverage', 'limited',
      'look no further', 'merely', 'meticulous', 'meticulously', 'moreover', 'navigating',
      'nested', 'nestled', 'not to mention', "now let's move on", 'numerous', 'overall',
      'pave', 'peeling back', 'picture this', 'pillar', 'plethora', 'quest', 'realm',
      'remember that', 'revolution', 'revolutionize', 'robust', 'say goodbye',
      'say hello to unlock', 'secondly', 'seeking', 'shed light', 'significant', 'similarly',
      'solace', 'solutions', 'specific', 'suite', 'supercharge', 'switching gears', 'tailor',
      'tailored', 'the digital age', 'the ultimate guide', 'these things', 'thirdly',
      'this information', 'this innovative solution', 'thumbs-up', 'thus',
      'to say nothing of', 'together with', 'top-notch', 'towards', 'trailblazer',
      'transformative', 'treasure box', 'treasure trove', 'ultimately', 'unable',
      'uncovering', 'underpins', 'understanding', 'unique', 'uniquely', 'unleash', 'unlock',
      'unraveling', 'unsatisfied', 'unveil', 'vibrant', "we've got you covered",
      'when it comes to', 'whilst', 'whimsical', 'world'
    ];
  }

  private detectForbiddenWords(content: string): string[] {
    const forbidden = this.loadForbiddenWords();
    const found: string[] = [];
    const contentLower = content.toLowerCase();

    forbidden.forEach(word => {
      if (contentLower.includes(word.toLowerCase())) {
        found.push(word);
      }
    });

    return found;
  }

  private determineContentType(title: string, content: string): string {
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();

    if (titleLower.includes('how to') || titleLower.includes('guide') || contentLower.includes('step')) return 'how-to guide';
    if (titleLower.match(/\d+\s+(ways|tips|strategies|methods)/) || contentLower.includes('list')) return 'list post';
    if (titleLower.includes('case study') || contentLower.includes('case study')) return 'case study';
    if (titleLower.includes('vs') || titleLower.includes('comparison') || titleLower.includes('versus')) return 'comparison post';
    if (titleLower.includes('analysis') || titleLower.includes('industry') || titleLower.includes('market')) return 'industry analysis';

    return 'general article';
  }

  private getWordCountRange(contentType: string): { min: number; max: number } {
    const ranges: Record<string, { min: number; max: number }> = {
      'how-to guide': { min: 1500, max: 3000 },
      'list post': { min: 1200, max: 2500 },
      'case study': { min: 1000, max: 2000 },
      'comparison post': { min: 1500, max: 2500 },
      'industry analysis': { min: 1800, max: 3500 },
      'general article': { min: 1500, max: 2500 }
    };

    return ranges[contentType] || ranges['general article'];
  }
}