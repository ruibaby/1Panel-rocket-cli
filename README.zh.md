# 1Panel Rocket CLI

一个用于将静态网站部署到 1Panel 面板的命令行工具。

[English Documentation](README.md)

## 功能特点

- 将静态网站部署到 1Panel 服务器
- 如果网站不存在，自动创建
- 带有重试机制的文件上传
- 用于选择现有网站的交互模式
- 易于与 CI/CD 工作流集成

## 安装

```bash
# 使用 npm 全局安装
npm install -g 1panel-rocket-cli

# 或者使用 yarn
yarn global add 1panel-rocket-cli

# 或直接使用 npx
npx 1panel-rocket-cli -p ./dist -d example.com
```

## 基本用法

```bash
# 部署静态网站
1panel-rocket -p ./dist -d example.com

# 或使用简写命令
1p -p ./dist -d example.com
```

## 命令行选项

| 选项 | 简写 | 描述 | 环境变量 |
|------|------|------|---------|
| --baseUrl | -e | 1Panel API 的基础 URL | ONEPANEL_BASE_URL |
| --apiKey | -a | 1Panel API 的 API 密钥 | ONEPANEL_API_KEY |
| --path | -p | 静态网站构建目录的路径 | - |
| --domain | -d | 网站的域名 | - |
| --yes | -y | 跳过所有提示并使用默认值 | - |

## 使用示例

```bash
# 使用环境变量
export ONEPANEL_BASE_URL="http://your.1panel.com"
export ONEPANEL_API_KEY="your_api_key"
1panel-rocket -p ./dist -d example.com

# 使用命令行参数
1panel-rocket -e "http://your.1panel.com" -a "your_api_key" -p ./dist -d example.com

# 交互式模式（不指定域名）
1panel-rocket -e "http://your.1panel.com" -a "your_api_key" -p ./dist
# 系统将提示您从 1Panel 服务器中选择一个网站
```

## 配置选项

### 忽略文件

默认情况下，以下文件和目录将被忽略，不会上传：

- node_modules/
- .git/
- .vscode/
- .env
- .env.local

## GitHub Actions 集成

您可以轻松地将 1Panel Rocket CLI 与 GitHub Actions 集成，以自动部署您的静态网站。

### 工作流示例

在您的代码仓库中创建 `.github/workflows/deploy.yml` 文件：

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

### 配置密钥

确保在您的 GitHub 仓库中添加这些密钥：

1. 进入您的仓库 → Settings → Secrets and variables → Actions
2. 添加以下密钥：
   - `ONEPANEL_BASE_URL`：您的 1Panel 服务器的 URL
   - `ONEPANEL_API_KEY`：您的 1Panel API 密钥

## 开发

### 设置环境

```bash
# 克隆仓库
git clone https://github.com/ruibaby/1panel-rocket-cli.git
cd 1panel-rocket-cli

# 安装依赖
npm install
```

### 本地开发

```bash
# 链接包到本地
npm link

# 在开发模式下运行
1panel-rocket -p ./dist -d example.com
```

## 许可证

MIT
