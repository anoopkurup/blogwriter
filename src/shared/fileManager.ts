import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { CompanyData, WritingInstructions, SitePage, KeywordTopic, InternalLink, ArticleContent } from '../types/index.js';
import { config } from './config.js';

export class FileManager {
  async ensureCompaniesDirectory(): Promise<void> {
    await fs.ensureDir(config.paths.companies);
  }

  async createCompanyFolder(companyName: string): Promise<string> {
    const sanitizedName = this.sanitizeFileName(companyName);
    const companyPath = path.join(config.paths.companies, sanitizedName);

    await fs.ensureDir(companyPath);
    await fs.ensureDir(path.join(companyPath, 'articles'));

    return companyPath;
  }

  async companyExists(companyName: string): Promise<boolean> {
    const companyPath = await this.getCompanyPath(companyName);
    return fs.pathExists(companyPath);
  }

  async getCompanyPath(companyName: string): Promise<string> {
    const sanitizedName = this.sanitizeFileName(companyName);
    return path.join(config.paths.companies, sanitizedName);
  }

  async listCompanies(): Promise<string[]> {
    await this.ensureCompaniesDirectory();
    const entries = await fs.readdir(config.paths.companies, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
  }

  // Script 1: Writing Instructions
  async saveWritingInstructions(companyPath: string, instructions: WritingInstructions): Promise<void> {
    const companyName = path.basename(companyPath);
    const fileName = `${companyName}-blogwritinginstructions.json`;
    const filePath = path.join(companyPath, fileName);
    await fs.writeFile(filePath, JSON.stringify(instructions, null, 2), 'utf8');
  }

  async loadWritingInstructions(companyPath: string): Promise<WritingInstructions> {
    const companyName = path.basename(companyPath);
    const fileName = `${companyName}-blogwritinginstructions.json`;
    const filePath = path.join(companyPath, fileName);

    if (!(await fs.pathExists(filePath))) {
      throw new Error(`Writing instructions not found: ${fileName}`);
    }

    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  }

  // Script 2: Sitemap
  async saveSitemap(companyPath: string, urls: string[]): Promise<void> {
    const companyName = path.basename(companyPath);
    const fileName = `${companyName}-sitemap`;
    const filePath = path.join(companyPath, fileName);
    const content = urls.join('\n');
    await fs.writeFile(filePath, content, 'utf8');
  }

  async loadSitemap(companyPath: string): Promise<string[]> {
    const companyName = path.basename(companyPath);
    const fileName = `${companyName}-sitemap`;
    const filePath = path.join(companyPath, fileName);

    if (!(await fs.pathExists(filePath))) {
      throw new Error(`Sitemap not found: ${fileName}`);
    }

    const content = await fs.readFile(filePath, 'utf8');
    return content.split('\n').filter(url => url.trim().length > 0);
  }

  // Script 3: Internal Links
  async saveInternalLinks(companyPath: string, links: InternalLink[]): Promise<void> {
    const companyName = path.basename(companyPath);
    const fileName = `${companyName}-internal-links.json`;
    const filePath = path.join(companyPath, fileName);
    await fs.writeFile(filePath, JSON.stringify(links, null, 2), 'utf8');
  }

  async loadInternalLinks(companyPath: string): Promise<InternalLink[]> {
    const companyName = path.basename(companyPath);
    const fileName = `${companyName}-internal-links.json`;
    const filePath = path.join(companyPath, fileName);

    if (!(await fs.pathExists(filePath))) {
      throw new Error(`Internal links not found: ${fileName}`);
    }

    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  }

  // Comprehensive Content Analysis for AI Writing Instructions
  async saveComprehensiveContent(companyPath: string, comprehensiveContent: any): Promise<void> {
    const companyName = path.basename(companyPath);
    const fileName = `${companyName}-comprehensive-content.json`;
    const filePath = path.join(companyPath, fileName);
    await fs.writeFile(filePath, JSON.stringify(comprehensiveContent, null, 2), 'utf8');
  }

  async loadComprehensiveContent(companyPath: string): Promise<any> {
    const companyName = path.basename(companyPath);
    const fileName = `${companyName}-comprehensive-content.json`;
    const filePath = path.join(companyPath, fileName);

    if (!(await fs.pathExists(filePath))) {
      throw new Error(`Comprehensive content analysis not found: ${fileName}`);
    }

    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  }

  // Script 4: Keywords
  async saveKeywordTopics(companyPath: string, topics: KeywordTopic[]): Promise<void> {
    const companyName = path.basename(companyPath);
    const fileName = `${companyName}-Keywords-topics`;
    const filePath = path.join(companyPath, fileName);
    await fs.writeFile(filePath, JSON.stringify(topics, null, 2), 'utf8');
  }

  async loadKeywordTopics(companyPath: string): Promise<KeywordTopic[]> {
    const companyName = path.basename(companyPath);
    const fileName = `${companyName}-Keywords-topics`;
    const filePath = path.join(companyPath, fileName);

    if (!(await fs.pathExists(filePath))) {
      throw new Error(`Keyword topics not found: ${fileName}`);
    }

    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  }

  async updateKeywordTopics(companyPath: string, topics: KeywordTopic[]): Promise<void> {
    const companyName = path.basename(companyPath);
    const fileName = `${companyName}-Keywords-topics`;
    const filePath = path.join(companyPath, fileName);
    await fs.writeFile(filePath, JSON.stringify(topics, null, 2), 'utf8');
  }

  // Script 5: Articles
  async saveArticle(companyPath: string, article: ArticleContent): Promise<string> {
    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedTitle = this.sanitizeFileName(article.title);
    const fileName = `${timestamp}-${sanitizedTitle}.md`;
    const filePath = path.join(companyPath, 'articles', fileName);

    const content = this.formatArticle(article);
    await fs.writeFile(filePath, content, 'utf8');

    return filePath;
  }

  async listArticles(companyPath: string): Promise<string[]> {
    const articlesPath = path.join(companyPath, 'articles');

    if (!(await fs.pathExists(articlesPath))) {
      return [];
    }

    const files = await fs.readdir(articlesPath);
    return files.filter(file => file.endsWith('.md'));
  }

  async loadArticle(companyPath: string, fileName: string): Promise<string> {
    const filePath = path.join(companyPath, 'articles', fileName);

    if (!(await fs.pathExists(filePath))) {
      throw new Error(`Article not found: ${fileName}`);
    }

    return fs.readFile(filePath, 'utf8');
  }

  // Utility methods
  private sanitizeFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private formatArticle(article: ArticleContent): string {
    const frontMatter = [
      '---',
      `title: "${article.title}"`,
      `keywords: [${article.keywords.map(k => `"${k}"`).join(', ')}]`,
      `wordCount: ${article.metadata.wordCount}`,
      `readingTime: ${article.metadata.readingTime}`,
      `articleType: "${article.metadata.articleType}"`,
      `targetKeyword: "${article.metadata.targetKeyword}"`,
      `createdAt: ${article.metadata.createdAt.toISOString()}`,
      '---',
      ''
    ];

    return frontMatter.join('\n') + article.content;
  }

  // Check script completion status
  async getScriptStatus(companyPath: string): Promise<{
    script1: boolean; // Writing Instructions
    script2: boolean; // Sitemap
    script3: boolean; // Internal Links
    script4: boolean; // Keywords
  }> {
    const companyName = path.basename(companyPath);

    const script1 = await fs.pathExists(path.join(companyPath, `${companyName}-blogwritinginstructions.json`));
    const script2 = await fs.pathExists(path.join(companyPath, `${companyName}-sitemap`));
    const script3 = await fs.pathExists(path.join(companyPath, `${companyName}-internal-links.json`));
    const script4 = await fs.pathExists(path.join(companyPath, `${companyName}-Keywords-topics`));

    return { script1, script2, script3, script4 };
  }
}