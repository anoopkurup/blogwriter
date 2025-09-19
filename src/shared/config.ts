import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface Config {
  dataforSEO: {
    login: string;
    password: string;
    baseUrl: string;
  };
  anthropic: {
    apiKey: string;
  };
  scraping: {
    timeout: number;
    maxPages: number;
    userAgent: string;
  };
  paths: {
    companies: string;
    templates: string;
  };
}

export const config: Config = {
  dataforSEO: {
    login: process.env.DATAFORSEO_LOGIN || '',
    password: process.env.DATAFORSEO_PASSWORD || '',
    baseUrl: 'https://api.dataforseo.com/v3'
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || ''
  },
  scraping: {
    timeout: 30000,
    maxPages: 200,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  },
  paths: {
    companies: path.join(process.cwd(), 'companies'),
    templates: path.join(process.cwd(), 'templates')
  }
};

export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.dataforSEO.login) {
    errors.push('DATAFORSEO_LOGIN environment variable is required');
  }

  if (!config.dataforSEO.password) {
    errors.push('DATAFORSEO_PASSWORD environment variable is required');
  }

  if (!config.anthropic.apiKey) {
    errors.push('ANTHROPIC_API_KEY environment variable is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}