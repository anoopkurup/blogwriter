#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import { logger } from './shared/logger.js';
import { config, validateConfig } from './shared/config.js';
import { FileManager } from './shared/fileManager.js';

// Import all scripts
import { WritingInstructionsScript } from './scripts/1-writing-instructions.js';
import { SitemapCreatorScript } from './scripts/2-sitemap-creator.js';
import { InternalLinksScript } from './scripts/3-internal-links.js';
import { KeywordGenerationScript } from './scripts/4-keyword-generation.js';
import { BlogWriterScript } from './scripts/5-blog-writer.js';
import { BlogEditorScript } from './scripts/6-blog-editor.js';

const program = new Command();
const fileManager = new FileManager();

program
  .name('blog-writer')
  .description('Modular blog writer automation with 6 independent scripts')
  .version('2.0.0');

// Script 1: Writing Instructions Creator
program
  .command('instructions')
  .description('Create writing instructions from company website (Script 1)')
  .argument('<company-name>', 'Company name for the project')
  .argument('<website-url>', 'Company website URL to analyze')
  .action(async (companyName: string, websiteUrl: string) => {
    try {
      await validateEnvironment();

      logger.section(`Blog Writer Automation - Script 1`);
      logger.info(`Company: ${companyName}`);
      logger.info(`Website: ${websiteUrl}`);

      const companyPath = await setupCompanyFolder(companyName);
      const script = new WritingInstructionsScript();

      await script.execute({
        companyName,
        companyPath,
        websiteUrl
      });

    } catch (error) {
      logger.error(`Script 1 failed: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// Script 2: Sitemap Creator
program
  .command('sitemap')
  .description('Create detailed website sitemap (Script 2)')
  .argument('<company-name>', 'Company name')
  .option('-u, --url <url>', 'Website URL (if not using existing company data)')
  .action(async (companyName: string, options) => {
    try {
      await validateEnvironment();

      logger.section(`Blog Writer Automation - Script 2`);
      logger.info(`Company: ${companyName}`);

      const companyPath = await getCompanyPath(companyName);
      const script = new SitemapCreatorScript();

      await script.execute({
        companyName,
        companyPath,
        websiteUrl: options.url
      });

    } catch (error) {
      logger.error(`Script 2 failed: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// Script 3: Internal Links Analyzer
program
  .command('internal-links')
  .description('Analyze sitemap URLs for internal linking opportunities (Script 3)')
  .argument('<company-name>', 'Company name')
  .action(async (companyName: string) => {
    try {
      await validateEnvironment();

      logger.section(`Blog Writer Automation - Script 3`);
      logger.info(`Company: ${companyName}`);

      const companyPath = await getCompanyPath(companyName);
      const script = new InternalLinksScript();

      await script.execute({
        companyName,
        companyPath
      });

    } catch (error) {
      logger.error(`Script 3 failed: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// Script 4: Keyword Generation
program
  .command('keywords')
  .description('Generate keyword topics using DataforSEO (Script 4)')
  .argument('<company-name>', 'Company name')
  .action(async (companyName: string) => {
    try {
      await validateEnvironment();

      logger.section(`Blog Writer Automation - Script 4`);
      logger.info(`Company: ${companyName}`);

      const companyPath = await getCompanyPath(companyName);
      const script = new KeywordGenerationScript();

      await script.execute({
        companyName,
        companyPath
      });

    } catch (error) {
      logger.error(`Script 4 failed: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// Script 5: Blog Writer
program
  .command('write')
  .description('Write blog article with topic selection (Script 5)')
  .argument('<company-name>', 'Company name')
  .action(async (companyName: string) => {
    try {
      await validateEnvironment();

      logger.section(`Blog Writer Automation - Script 5`);
      logger.info(`Company: ${companyName}`);

      const companyPath = await getCompanyPath(companyName);
      const script = new BlogWriterScript();

      await script.execute({
        companyName,
        companyPath
      });

    } catch (error) {
      logger.error(`Script 5 failed: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// Script 6: Blog Editor
program
  .command('edit')
  .description('Edit and validate blog article (Script 6)')
  .argument('<company-name>', 'Company name')
  .argument('<article-file>', 'Article filename to edit')
  .action(async (companyName: string, articleFile: string) => {
    try {
      await validateEnvironment();

      logger.section(`Blog Writer Automation - Script 6`);
      logger.info(`Company: ${companyName}`);
      logger.info(`Article: ${articleFile}`);

      const companyPath = await getCompanyPath(companyName);
      const script = new BlogEditorScript();

      await script.execute({
        companyName,
        companyPath,
        articleFile
      } as any);

    } catch (error) {
      logger.error(`Script 6 failed: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// Utility commands
program
  .command('list')
  .description('List all company projects')
  .action(async () => {
    try {
      const companies = await fileManager.listCompanies();
      if (companies.length === 0) {
        logger.info('No company projects found.');
        return;
      }

      logger.section('Company Projects:');
      companies.forEach(company => {
        logger.info(`• ${company}`);
      });

    } catch (error) {
      logger.error(`Failed to list companies: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show project completion status')
  .argument('<company-name>', 'Company name')
  .action(async (companyName: string) => {
    try {
      const companyPath = await getCompanyPath(companyName);

      if (!(await fileManager.companyExists(companyName))) {
        logger.error(`Company project "${companyName}" not found.`);
        process.exit(1);
      }

      const status = await fileManager.getScriptStatus(companyPath);

      logger.section(`Project Status: ${companyName}`);
      logger.info(`✅ Script 1 (Writing Instructions): ${status.script1 ? 'Complete' : 'Pending'}`);
      logger.info(`✅ Script 2 (Sitemap): ${status.script2 ? 'Complete' : 'Pending'}`);
      logger.info(`✅ Script 3 (Internal Links): ${status.script3 ? 'Complete' : 'Pending'}`);
      logger.info(`✅ Script 4 (Keywords): ${status.script4 ? 'Complete' : 'Pending'}`);

      // Check for articles
      const articles = await fileManager.listArticles(companyPath);
      logger.info(`📄 Articles: ${articles.length} generated`);

      // Show next steps
      console.log('');
      logger.subsection('Next Steps:');
      if (!status.script1) {
        logger.info('1. Run: blog-writer instructions <company-name> <website-url>');
      } else if (!status.script2) {
        logger.info('2. Run: blog-writer sitemap <company-name>');
      } else if (!status.script3) {
        logger.info('3. Run: blog-writer internal-links <company-name>');
      } else if (!status.script4) {
        logger.info('4. Run: blog-writer keywords <company-name>');
      } else {
        logger.info('5. Run: blog-writer write <company-name>');
        if (articles.length > 0) {
          logger.info('6. Run: blog-writer edit <company-name> <article-file>');
        }
      }

    } catch (error) {
      logger.error(`Failed to check status: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// Workflow command (run multiple scripts in sequence)
program
  .command('workflow')
  .description('Run complete workflow (Scripts 1-4) for a company')
  .argument('<company-name>', 'Company name')
  .argument('<website-url>', 'Company website URL')
  .action(async (companyName: string, websiteUrl: string) => {
    try {
      await validateEnvironment();

      logger.section(`Blog Writer Automation - Complete Workflow`);
      logger.info(`Company: ${companyName}`);
      logger.info(`Website: ${websiteUrl}`);

      const companyPath = await setupCompanyFolder(companyName);

      // Run Scripts 1-4 in sequence
      logger.subsection('Running Script 1: Writing Instructions...');
      const script1 = new WritingInstructionsScript();
      await script1.execute({ companyName, companyPath, websiteUrl });

      logger.subsection('Running Script 2: Sitemap Creator...');
      const script2 = new SitemapCreatorScript();
      await script2.execute({ companyName, companyPath, websiteUrl });

      logger.subsection('Running Script 3: Internal Links...');
      const script3 = new InternalLinksScript();
      await script3.execute({ companyName, companyPath });

      logger.subsection('Running Script 4: Keyword Generation...');
      const script4 = new KeywordGenerationScript();
      await script4.execute({ companyName, companyPath });

      logger.success('Complete workflow finished!');
      logger.info('Ready for content generation with: blog-writer write <company-name>');

    } catch (error) {
      logger.error(`Workflow failed: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// Helper functions
async function validateEnvironment(): Promise<void> {
  const configValidation = validateConfig();
  if (!configValidation.valid) {
    logger.error('Configuration errors:');
    configValidation.errors.forEach(error => logger.error(`  ${error}`));
    process.exit(1);
  }
}

async function setupCompanyFolder(companyName: string): Promise<string> {
  await fileManager.ensureCompaniesDirectory();

  const exists = await fileManager.companyExists(companyName);
  if (exists) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `Company project "${companyName}" already exists. Overwrite?`,
        default: false
      }
    ]);

    if (!overwrite) {
      logger.info('Operation cancelled.');
      process.exit(0);
    }
  }

  return fileManager.createCompanyFolder(companyName);
}

async function getCompanyPath(companyName: string): Promise<string> {
  const exists = await fileManager.companyExists(companyName);
  if (!exists) {
    throw new Error(`Company project "${companyName}" not found. Create it first with the 'instructions' command.`);
  }

  return fileManager.getCompanyPath(companyName);
}

export { program };