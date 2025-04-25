#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import prompts from "prompts";
import OnePanelAPI from "./api.mjs";
const program = new Command();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

program
  .name("1panel-rocket")
  .alias("1p")
  .version(packageJson.version)
  .description("🚀 A CLI tool for deploy static website to 1Panel.")
  .option(
    "-e, --baseUrl <baseUrl>",
    "Base URL of the 1Panel API(You can also use environment variable: ONEPANEL_BASE_URL)"
  )
  .option(
    "-a, --apiKey <apiKey>",
    "API key of the 1Panel API(You can also use environment variable: ONEPANEL_API_KEY)"
  )
  .requiredOption(
    "-p, --path <path>",
    "Path to the static website build directory"
  )
  .option("-d, --domain <domain>", "Domain name of the website")
  .option("-y, --yes", "Skip all prompts and use default values")
  .action(async (options) => {
    const { path, baseUrl, apiKey, yes } = options;
    let { domain } = options;

    if (!fs.existsSync(path)) {
      throw new Error(`Build directory ${path} does not exist`);
    }

    const finalBaseUrl = baseUrl || process.env.ONEPANEL_BASE_URL;
    const finalApiKey = apiKey || process.env.ONEPANEL_API_KEY;

    if (!finalBaseUrl || !finalApiKey) {
      throw new Error("Base URL and API key are required");
    }

    const api = new OnePanelAPI({
      baseURL: finalBaseUrl,
      apiKey: finalApiKey,
    });

    if (!domain) {
      const websites = await api.getWebsiteList();
      if (websites.length === 0) {
        throw new Error("No websites found");
      }

      const answer = await prompts({
        type: "select",
        name: "value",
        message: "Select a website",
        choices: websites.map((website) => ({
          title: website.primaryDomain,
          value: website.primaryDomain,
        })),
      });

      if (!answer.value) {
        throw new Error("No website selected");
      }

      domain = answer.value;
    }

    let website = await api.getWebsiteDetail(domain);

    if (!website) {
      if (yes) {
        website = await api.createWebsite({ domain });
      } else {
        const answer = await prompts({
          type: "confirm",
          name: "value",
          message: "Website not found, create it? (y/n)",
        });
        if (answer.value) {
          website = await api.createWebsite({ domain });
        } else {
          throw new Error("Website not found");
        }
      }
    }
    const uploadResult = await api.uploadStaticFiles(domain, path);
    console.log("\n");
    console.log("🚀 Deployed to 1Panel successfully");
    console.log(`🌐 Website: https://${domain}`);
    console.log(`📁 Files uploaded: ${uploadResult.successCount}`);
  });

program.parse(process.argv);
