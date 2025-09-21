# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a blog writer automation tool designed as a modular system with 6 independent scripts that can work together or separately. Each company gets its own project folder containing all generated assets.

**NEW Data-First Script Architecture:**

**1. Comprehensive Sitemap Creator Script** (REORDERED - Data Gathering Phase)
- Creates detailed website sitemap with comprehensive page discovery
- Uses multiple discovery methods: crawling, common patterns, sitemap.xml
- Validates and categorizes URLs for better processing
- Outputs `{company name}-sitemap` file with prioritized URLs

**2. Content Analysis & Internal Links Script** (REORDERED - Content Collection Phase)
- Analyzes EVERY page from sitemap for detailed content extraction
- Collects comprehensive business insights from all pages
- Extracts services, industries, team info, testimonials, case studies
- Creates internal linking opportunities with usage notes
- Outputs `{company name}-internal-links.json` AND `{company name}-comprehensive-content.json`

**3. AI-Powered Writing Instructions Creator** (REORDERED - Intelligence Phase)
- Uses Claude AI with ALL collected content from Scripts 1-2
- Analyzes comprehensive site data for authentic business insights
- Generates highly accurate, business-specific writing instructions
- No hardcoded information - everything driven by actual content analysis
- Creates `{company name}-blogwritinginstructions.json` file with rich, data-driven content

**4. Keyword Generation Script** (Enhanced with Better Context)
- Uses DataforSEO to generate long-tail keywords with suitable competition
- Leverages comprehensive content analysis for better keyword context
- Analyzes website keyword competition levels for benchmarking
- Creates topic clusters using SERP occurrence analysis
- Outputs `{company name}-Keywords-topics` file with contextually relevant clustered keywords

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

**NEW Workflow Dependencies (Data-First Approach):**
- Script 2 (Content Analysis) depends on Script 1 (Sitemap) output
- Script 3 (Writing Instructions) depends on Scripts 1 & 2 comprehensive data
- Script 5 (Blog Writer) uses rich outputs from Scripts 1, 2, 3, and 4
- Script 6 (Blog Editing) validates against all comprehensive data sources

**Key Benefits of Data-First Approach:**
- 10x more accurate writing instructions from complete site analysis
- Real business insights from comprehensive content review
- Authentic brand voice detection from actual company content
- Better internal linking strategy from complete site understanding
- More relevant keywords from comprehensive content context

## Development Commands

- `npm run dev` - Development mode with TypeScript compilation
- `npm run build` - Build for production (compiles to dist/)
- `npm run start` - Run the built application
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint for code quality

## CLI Commands (NEW Data-First Workflow)

After building, the following script commands are available in NEW ORDER:

**Data-First Workflow Commands:**
- `blog-writer sitemap <company-name> <website-url>` - Create comprehensive sitemap (Script 1 - Data Gathering)
- `blog-writer internal-links <company-name>` - Analyze content & create internal links (Script 2 - Content Analysis)
- `blog-writer instructions <company-name>` - Generate AI-powered writing instructions (Script 3 - Intelligence Phase)
- `blog-writer keywords <company-name>` - Generate keyword topics with rich context (Script 4)
- `blog-writer write <company-name>` - Write blog article with comprehensive data (Script 5)
- `blog-writer edit <company-name> <article-file>` - Edit and validate blog article (Script 6)

**Utility Commands:**
- `blog-writer workflow <company-name> <website-url>` - Run complete data-first workflow (Scripts 1-4)
- `blog-writer list` - List all company projects
- `blog-writer status <company-name>` - Show project completion status with new workflow order

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

## Generated Assets (Enhanced Data-First Approach)

Each company project folder now contains rich, data-driven assets:
- `{company name}-sitemap` - Comprehensive website URL sitemap with validation (Script 1)
- `{company name}-internal-links.json` - Internal linking opportunities with detailed usage notes (Script 2)
- `{company name}-comprehensive-content.json` - **NEW**: Complete content analysis from all pages (Script 2)
- `{company name}-blogwritinginstructions.json` - **ENHANCED**: AI-powered writing guidelines from comprehensive analysis (Script 3)
- `{company name}-Keywords-topics` - **ENHANCED**: Contextually relevant clustered keyword topics (Script 4)
- `articles/` - Generated blog content in markdown format with rich data context (Script 5)
- `SEO_BEST_PRACTICES.md` - Comprehensive SEO guidelines
- `EDITING_INSTRUCTIONS.md` - Post-generation editing workflow

**New Data Files:**
- **Comprehensive Content Analysis**: Complete business insights extracted from entire website
- **Enhanced Writing Instructions**: AI-generated instructions based on actual content analysis
- **Rich Internal Links**: Detailed content context for every discoverable page