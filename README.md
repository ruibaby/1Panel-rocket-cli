# 1Panel Rocket CLI

A command-line tool for deploying static websites to 1Panel server.

[中文文档](README.zh.md)

## Features

- Deploy static websites to 1Panel server
- Automatic website creation if it doesn't exist
- File uploading with retry mechanism
- Interactive mode for selecting existing websites
- Easy integration with CI/CD workflows

## Installation

```bash
# Install globally with npm
npm install -g 1panel-rocket-cli

# Or with yarn
yarn global add 1panel-rocket-cli

# Or use directly with npx
npx 1panel-rocket-cli -p ./dist -d example.com
```

## Basic Usage

```bash
# Deploy a static website
1panel-rocket -p ./dist -d example.com

# Or use the short alias
1p -p ./dist -d example.com
```

## Command Line Options

| Option | Alias | Description | Environment Variable |
|--------|-------|-------------|---------------------|
| --baseUrl | -e | Base URL of the 1Panel API | ONEPANEL_BASE_URL |
| --apiKey | -a | API key for the 1Panel API | ONEPANEL_API_KEY |
| --path | -p | Path to the static website build directory | - |
| --domain | -d | Domain name of the website | - |
| --yes | -y | Skip all prompts and use default values | - |

## Examples

```bash
# Using environment variables
export ONEPANEL_BASE_URL="http://your.1panel.com"
export ONEPANEL_API_KEY="your_api_key"
1panel-rocket -p ./dist -d example.com

# Using command line arguments
1panel-rocket -e "http://your.1panel.com" -a "your_api_key" -p ./dist -d example.com

# Interactive mode (without specifying domain)
1panel-rocket -e "http://your.1panel.com" -a "your_api_key" -p ./dist
# You will be prompted to select a website from your 1Panel server
```

## Configuration Options

### Ignored Files

By default, the following files and directories are ignored and will not be uploaded:

- node_modules/
- .git/
- .vscode/
- .env
- .env.local

## GitHub Actions Integration

You can easily integrate 1Panel Rocket CLI with GitHub Actions to automate the deployment of your static website.

### Example Workflow

Create a `.github/workflows/deploy.yml` file in your repository:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 10
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build
        run: pnpm build
      
      - name: Deploy to 1Panel
        env:
          ONEPANEL_BASE_URL: ${{ secrets.ONEPANEL_BASE_URL }}
          ONEPANEL_API_KEY: ${{ secrets.ONEPANEL_API_KEY }}
        run: |
          npx 1panel-rocket-cli -p ./dist -d example.com
```

### Secrets Configuration

Make sure to add these secrets in your GitHub repository:

1. Go to your repository → Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `ONEPANEL_BASE_URL`: The URL of your 1Panel server
   - `ONEPANEL_API_KEY`: Your 1Panel API key

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/ruibaby/1panel-rocket-cli.git
cd 1panel-rocket-cli

# Install dependencies
npm install
```

### Local Development

```bash
# Link the package locally
npm link

# Run in development mode
1panel-rocket -p ./dist -d example.com
```

## License

MIT
