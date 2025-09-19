# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a blog writer automation tool designed as a modular system with 6 independent scripts that can work together or separately. Each company gets its own project folder containing all generated assets.

**Script-Based Architecture:**

**1. Writing Instructions Creation Script**
- Visits company website and scrapes necessary details
- Fills the @sample-writing-instructions.json template
- Creates `{company name}-blogwritinginstructions.json` file

**2. Sitemap Creator Script**
- Scrapes website to create detailed sitemap
- Outputs `{company name}-sitemap` file with all URLs

**3. Internal Link Creator Script**
- Analyzes each URL from sitemap file
- Adds notes for when URLs can be used for internal links
- Creates `{company name}-internal-links.json` file

**4. Keyword Generation Script**
- Uses DataforSEO to generate long-tail keywords with suitable competition
- Analyzes website keyword competition levels for benchmarking
- Creates topic clusters using SERP occurrence analysis
- Outputs `{company name}-Keywords-topics` file with clustered keywords

**5. Blog Writer Script**
- Presents 3 topics from keywords file for user selection
- Uses writing instructions, SEO guidelines, and internal links to craft articles
- Outputs blog articles in markdown format

**6. Blog Editing Script**
- Validates articles against all guidelines and instructions
- Automatically fixes issues with SEO, internal linking, and writing standards
- Ensures compliance with company-specific requirements

## Project Structure

This is currently a minimal setup project with:
- `package.json` - Contains only `shadcn` as a dev dependency
- `project-outline.md` - Contains the detailed project requirements and workflow
- `.mcp.json` - Configures shadcn MCP server for UI component access
- No source code files exist yet - this is a planning/setup phase

## Development Environment

- The project has `shadcn` available via MCP server for UI component development
- No build, test, or lint commands are currently configured
- No TypeScript or other development tooling is set up yet

## Key Implementation Notes

**Modular Architecture:**
- Each script can run independently or as part of a complete workflow
- Scripts operate on company-specific project folders
- Data flows between scripts through standardized file formats

**Technical Requirements:**
- DataforSEO API integration for keyword research and competition analysis
- Website scraping with Puppeteer for sitemap and content analysis
- JSON template system using @sample-writing-instructions.json
- SERP occurrence analysis for keyword clustering algorithms
- File system operations for managing company project assets
- Claude AI integration for content generation and editing

**Workflow Dependencies:**
- Script 3 (Internal Links) depends on Script 2 (Sitemap) output
- Script 5 (Blog Writer) uses outputs from Scripts 1, 3, and 4
- Script 6 (Blog Editing) validates against all previous script outputs

## Development Commands

- `npm run dev` - Development mode with TypeScript compilation
- `npm run build` - Build for production (compiles to dist/)
- `npm run start` - Run the built application
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint for code quality

## CLI Commands

After building, the following script commands are available:

- `blog-writer instructions <company-name> <website-url>` - Create writing instructions (Script 1)
- `blog-writer sitemap <company-name>` - Generate website sitemap (Script 2)
- `blog-writer internal-links <company-name>` - Create internal links analysis (Script 3)
- `blog-writer keywords <company-name>` - Generate keyword topics and clusters (Script 4)
- `blog-writer write <company-name>` - Write blog article with topic selection (Script 5)
- `blog-writer edit <company-name> <article-file>` - Edit and validate blog article (Script 6)
- `blog-writer list` - List all company projects
- `blog-writer status <company-name>` - Show project completion status

## Implementation Status

✅ **Completed Features:**
- TypeScript project structure with modern tooling
- CLI interface with interactive prompts
- Website scraping engine with Puppeteer
- DataforSEO API integration for keyword research
- Template system for generating writing instructions
- Claude AI integration for content generation
- File management system for company projects
- Internal linking automation
- Multiple article types (educational, case studies, analysis, frameworks)
- SEO optimization and best practices

## Configuration Requirements

1. **DataforSEO API**: Credentials are configured in .env file
2. **Anthropic API**: Add your API key to .env file for Claude AI integration
3. **Puppeteer**: Browser automation for website scraping

## Generated Assets

Each company project folder contains:
- `{company name}-blogwritinginstructions.json` - Writing guidelines from website analysis (Script 1)
- `{company name}-sitemap` - Complete website URL sitemap (Script 2)
- `{company name}-internal-links.json` - Internal linking opportunities with usage notes (Script 3)
- `{company name}-Keywords-topics` - Clustered keyword topics for content planning (Script 4)
- `articles/` - Generated blog content in markdown format (Script 5)
- `SEO_BEST_PRACTICES.md` - Comprehensive SEO guidelines
- `EDITING_INSTRUCTIONS.md` - Post-generation editing workflow