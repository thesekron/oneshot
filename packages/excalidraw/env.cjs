const dotenv = require("dotenv");
const { readFileSync, existsSync } = require("fs");
const pkg = require("./package.json");
const parseEnvVariables = (filepath) => {
  const raw = existsSync(filepath) ? readFileSync(filepath) : Buffer.alloc(0);
  const envVars = Object.entries(dotenv.parse(raw)).reduce(
    (env, [key, value]) => {
      env[key] = value;
      return env;
    },
    {},
  );

  envVars.PKG_NAME = pkg.name;
  envVars.PKG_VERSION = pkg.version;

  return envVars;
};

module.exports = { parseEnvVariables };
