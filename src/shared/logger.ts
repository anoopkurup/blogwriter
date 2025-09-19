import chalk from 'chalk';
import ora, { Ora } from 'ora';

class Logger {
  private spinner: Ora | null = null;

  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  success(message: string): void {
    console.log(chalk.green('✅'), message);
  }

  warn(message: string): void {
    console.log(chalk.yellow('⚠️'), message);
  }

  error(message: string): void {
    console.log(chalk.red('❌'), message);
  }

  startSpinner(text: string): void {
    this.spinner = ora(text).start();
  }

  updateSpinner(text: string): void {
    if (this.spinner) {
      this.spinner.text = text;
    }
  }

  stopSpinner(success: boolean = true): void {
    if (this.spinner) {
      if (success) {
        this.spinner.succeed();
      } else {
        this.spinner.fail();
      }
      this.spinner = null;
    }
  }

  section(title: string): void {
    console.log('\n' + chalk.bold.underline(title));
  }

  subsection(title: string): void {
    console.log('\n' + chalk.bold(title));
  }

  list(items: string[]): void {
    items.forEach(item => {
      console.log(`  • ${item}`);
    });
  }

  script(scriptNumber: number, scriptName: string): void {
    console.log(chalk.cyan(`\n📄 Script ${scriptNumber}: ${scriptName}`));
  }
}

export const logger = new Logger();