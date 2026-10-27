import { Config } from "@remotion/cli/config";
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setPublicDir("./assets");
Config.setConcurrency(6);

Config.setBrowserExecutable("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
