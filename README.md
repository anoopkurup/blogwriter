# Blog Writer Automation

AI-powered blog writer automation for company-specific content generation. This tool creates high-quality, SEO-optimized blog articles tailored to your company's voice, audience, and industry.

## Features

### Phase 1: Company Analysis & Setup
- **Website Scraping**: Automatically extracts business positioning, target audience, and tone of voice
- **Content Analysis**: Analyzes existing content to understand writing style and preferences
- **Keyword Research**: Integrates with DataforSEO API for comprehensive keyword analysis
- **Writing Instructions**: Generates company-specific writing guidelines and templates
- **Site Mapping**: Creates internal linking opportunities from existing pages

### Phase 2: Article Generation
- **AI-Powered Writing**: Uses Claude AI to generate articles following company guidelines
- **Multiple Article Types**: Educational, case studies, industry analysis, and framework articles
- **Internal Linking**: Automatically adds relevant internal links based on site structure
- **SEO Optimization**: Incorporates target keywords and follows SEO best practices
- **Content Editing**: Applies editing guidelines for quality and consistency

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd blog-writer-automation
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your API credentials
```

4. Build the project:
```bash
npm run build
```

5. Install globally (optional):
```bash
npm link
```

## Configuration

Create a `.env` file with the following variables:

```env
# DataforSEO API Credentials
DATAFORSEO_LOGIN="your-dataforseo-login"
DATAFORSEO_PASSWORD="your-dataforseo-password"

# Anthropic API Credentials
ANTHROPIC_API_KEY="your-anthropic-api-key"
```

### Getting API Keys

- **DataforSEO**: Sign up at [dataforseo.com](https://dataforseo.com) for keyword research
- **Anthropic**: Get your API key from [console.anthropic.com](https://console.anthropic.com)

## Usage

### Initialize a New Company Project (Phase 1)

```bash
blog-writer init
```

This command will:
1. Prompt for company name and website URL
2. Scrape the website for company data
3. Generate keyword lists using DataforSEO API
4. Create writing instructions based on company analysis
5. Map site pages for internal linking opportunities

### Generate Articles (Phase 2)

```bash
blog-writer generate
```

This command will:
1. Select from existing company projects
2. Choose target keyword and article type
3. Generate AI-powered content following company guidelines
4. Add internal links and optimize for SEO
5. Save as formatted markdown file

### Additional Commands

```bash
# List all company projects
blog-writer list

# Update company data and keywords
blog-writer update
```

## Development

### Available Scripts

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Run type checking
npm run typecheck

# Run linter
npm run lint
```

### Project Structure

```
src/
├── cli/           # Command-line interface
├── scraper/       # Website scraping functionality
├── keywords/      # Keyword research integration
├── content/       # AI content generation
├── templates/     # Writing instruction templates
├── utils/         # Utility functions and configuration
└── types/         # TypeScript type definitions
```

## Article Types

### Educational/How-To Articles (2,500-4,000 words)
- Comprehensive guides with step-by-step instructions
- Problem-solution format with practical examples
- 40% of recommended content mix

### Case Study Articles (1,500-2,500 words)
- Real-world success stories with quantified results
- Challenge-solution-outcome format
- 25% of recommended content mix

### Industry Analysis Articles (1,800-2,500 words)
- Trend analysis and strategic recommendations
- Data-driven insights with future implications
- 25% of recommended content mix

### Framework/Methodology Articles (2,000-3,000 words)
- Systematic approaches and reusable frameworks
- Detailed implementation guides
- 10% of recommended content mix

## Generated Output

Each company project creates:

```
companies/
└── company-name/
    ├── company-data.yaml          # Scraped company information
    ├── writing-instructions.md    # AI-generated writing guidelines
    ├── site-pages.yaml           # Internal linking opportunities
    ├── keywords.yaml             # Keyword research results
    └── articles/                 # Generated blog articles
        ├── 2024-01-15-article-title.md
        └── ...
```

## Features in Detail

### Website Scraping
- Extracts business positioning and value propositions
- Analyzes target audience and pain points
- Identifies tone of voice and content preferences
- Maps site structure for internal linking

### Keyword Research
- Integrates with DataforSEO API for accurate data
- Generates keyword clusters and intent analysis
- Provides difficulty scores and search volumes
- Creates long-tail keyword strategies

### AI Content Generation
- Uses Claude AI for human-like writing
- Follows company-specific guidelines
- Incorporates SEO best practices
- Maintains consistent brand voice

### Internal Linking
- Automatically identifies linking opportunities
- Uses relevant anchor text
- Distributes links naturally throughout content
- Follows SEO linking best practices

## Troubleshooting

### Common Issues

**API Key Errors**: Ensure your `.env` file contains valid API credentials

**Scraping Failures**: Some websites may block automated scraping. Try different sites or use mock data for testing.

**Missing Dependencies**: Run `npm install` to ensure all dependencies are installed

**Build Errors**: Run `npm run typecheck` to identify TypeScript issues

### Mock Mode

If API keys are not configured, the system will run in mock mode with example data for testing purposes.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the API documentation for DataforSEO and Anthropic