import crypto from "node:crypto";
import path from "node:path";
import axios from "axios";
import FormData from "form-data";
import fs from "fs-extra";

/**
 * OnePanelAPI - API client for interacting with 1Panel server
 */
class OnePanelAPI {
  /**
   * Create a new OnePanelAPI instance
   *
   * @param {Object} config - Configuration object
   * @param {string} config.baseURL - Base URL of the 1Panel API
   * @param {string} config.apiKey - API key for authentication
   * @param {string} [config.languageCode="zh"] - Language code for API responses
   */
  constructor({ baseURL, apiKey, languageCode }) {
    this.apiClient = axios.create({
      baseURL: `${baseURL}/api/v1`,
    });
    this.apiClient.interceptors.request.use((config) => {
      const timestamp = Math.floor(Date.now() / 1000).toString();

      const content = `1panel${apiKey}${timestamp}`;
      const token = crypto.createHash("md5").update(content).digest("hex");

      config.headers["1Panel-Token"] = token;
      config.headers["1Panel-Timestamp"] = timestamp;
      config.headers["Accept-Language"] = languageCode || "en";
      return config;
    });
    this.ignoreFiles = ["node_modules/", ".git/", ".vscode/", ".env", ".env.local"];
  }

  /**
   * Create a new website on the 1Panel server
   * @param {Object} siteConfig - Website configuration
   * @param {string} siteConfig.domain - Primary domain for the website
   * @returns {Promise<Object>} - Created website details
   */
  async createWebsite(siteConfig) {
    try {
      const requestBody = {
        primaryDomain: siteConfig.domain,
        type: "static",
        alias: siteConfig.domain,
        remark: "",
        appType: "installed",
        webSiteGroupId: 2,
        otherDomains: "",
        proxy: "",
        appinstall: {
          appId: 0,
          name: "",
          appDetailId: 0,
          params: {},
          version: "",
          appkey: "",
          advanced: false,
          cpuQuota: 0,
          memoryLimit: 0,
          memoryUnit: "MB",
          containerName: "",
          allowPort: false,
        },
        IPV6: false,
        enableFtp: false,
        ftpUser: "",
        ftpPassword: "",
        proxyType: "tcp",
        port: 9000,
        proxyProtocol: "http://",
        proxyAddress: "",
        runtimeType: "php",
      };

      await this.apiClient.post("/websites", requestBody);

      const website = await this.getWebsiteDetail(siteConfig.domain);
      return website;
    } catch (error) {
      throw new Error(`Create website failed: ${error.message}`);
    }
  }

  /**
   * Get list of all websites on the 1Panel server
   * @returns {Promise<Array>} - List of websites
   */
  async getWebsiteList() {
    try {
      const { data } = await this.apiClient.post("/websites/search", {
        name: "",
        page: 1,
        pageSize: 999999,
        orderBy: "created_at",
        order: "null",
        websiteGroupId: 0,
      });

      return data.data.items;
    } catch (error) {
      throw new Error(`Get website list failed: ${error.message}`);
    }
  }

  /**
   * Get details of a specific website by domain
   * @param {string} domain - Website domain
   * @returns {Promise<Object|null>} - Website details or null if not found
   */
  async getWebsiteDetail(domain) {
    try {
      const websites = await this.getWebsiteList();

      const website = websites.find((w) => w.primaryDomain === domain);

      return website;
    } catch (error) {
      throw new Error(`Get website detail failed: ${error.message}`);
    }
  }

  /**
   * Upload a single file to the server
   * @param {string} filePath - Path to the file to upload
   * @param {string} targetDir - Target directory on the server
   * @returns {Promise<Object>} - Upload result
   */
  async uploadSingleFile(filePath, targetDir) {
    try {
      const formData = new FormData();

      formData.append("file", fs.createReadStream(filePath));
      formData.append("path", targetDir);
      formData.append("overwrite", "True");

      const response = await this.apiClient.post("/files/upload", formData, {
        headers: formData.getHeaders(),
      });

      return response.data.data || { message: "Upload success" };
    } catch (error) {
      throw new Error(`Upload file failed: ${filePath} - ${error.message}`);
    }
  }

  /**
   * Upload a single file with retry mechanism
   * @param {string} filePath - Path to the file to upload
   * @param {string} targetDir - Target directory on the server
   * @param {number} [retryCount=3] - Number of retry attempts
   * @param {number} [retryDelay=1000] - Delay between retries in milliseconds
   * @returns {Promise<Object>} - Upload result
   */
  async uploadSingleFileWithRetry(filePath, targetDir, retryCount = 3, retryDelay = 1000) {
    let lastError;

    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        return await this.uploadSingleFile(filePath, targetDir);
      } catch (error) {
        lastError = error;
        console.warn(`Upload attempt ${attempt}/${retryCount} failed for ${filePath}: ${error.message}`);
        if (attempt < retryCount) {
          console.log(`Retrying in ${retryDelay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Check if a file should be ignored based on ignoreFiles patterns
   * @param {string} filePath - Path to check
   * @returns {boolean} - True if the file should be ignored
   */
  shouldIgnore(filePath) {
    return this.ignoreFiles.some((pattern) => {
      return filePath.includes(pattern) || path.basename(filePath) === pattern;
    });
  }

  /**
   * Upload a directory recursively to the server
   * @param {string} sourceDir - Source directory to upload
   * @param {string} targetDir - Target directory on the server
   * @param {string} [basePath] - Base path for relative path calculation
   * @returns {Promise<Array>} - Upload results
   */
  async uploadDirectory(sourceDir, targetDir, basePath) {
    const normalizedTargetDir = targetDir.endsWith("/") ? targetDir : `${targetDir}/`;
    const normalizedBasePath = basePath || sourceDir;

    const results = [];
    const files = await fs.readdir(sourceDir);

    console.log(`Uploading directory: ${sourceDir}, ${files.length} files/directories`);

    for (const file of files) {
      const sourcePath = path.join(sourceDir, file);

      if (this.shouldIgnore(sourcePath)) {
        console.log(`Ignoring: ${sourcePath}`);
        continue;
      }

      const stats = await fs.stat(sourcePath);
      const relativePath = path.relative(normalizedBasePath, sourceDir);
      const currentTargetDir = relativePath
        ? path.join(normalizedTargetDir, relativePath).replace(/\\/g, "/")
        : normalizedTargetDir;

      if (stats.isDirectory()) {
        console.log(`Found subdirectory: ${file}, uploading recursively...`);
        const subSourceDir = path.join(sourceDir, file);
        const subResults = await this.uploadDirectory(subSourceDir, normalizedTargetDir, normalizedBasePath);
        results.push(...subResults);
      } else {
        console.log(`Upload file: ${file}`);
        try {
          const result = await this.uploadSingleFileWithRetry(sourcePath, currentTargetDir);
          results.push({
            file,
            targetPath: currentTargetDir,
            result,
            success: true,
          });
        } catch (error) {
          console.error(`Upload file ${file} failed after retries:`, error.message);
          results.push({
            file,
            targetPath: currentTargetDir,
            error: error.message,
            success: false,
          });
        }
      }
    }

    return results;
  }

  /**
   * Upload static files to a website
   * @param {string} domain - Website domain
   * @param {string} sourceDirPath - Source directory path
   * @returns {Promise<Object>} - Upload statistics
   */
  async uploadStaticFiles(domain, sourceDirPath) {
    try {
      const siteDetail = await this.getWebsiteDetail(domain);

      if (!siteDetail.sitePath) {
        throw new Error("Cannot get website physical path");
      }

      const sitePath = siteDetail.sitePath;
      console.log(`Website root path: ${sitePath}`);

      if (!fs.existsSync(sourceDirPath)) {
        throw new Error(`Source directory does not exist: ${sourceDirPath}`);
      }

      const targetPath = path.join(sitePath, "index");

      const results = await this.uploadDirectory(sourceDirPath, targetPath, sourceDirPath);

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      console.log(`Upload completed: ${results.length} files, ${successCount} success, ${failCount} failed`);

      return {
        totalFiles: results.length,
        successCount,
        failCount,
        details: results,
      };
    } catch (error) {
      throw new Error(`Upload files failed: ${error.message}`);
    }
  }
}

export default OnePanelAPI;
