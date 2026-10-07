import { defineConfig, loadEnv } from "vite";

// These env values are inlined into the client bundle by Vite; never ship them in a build.
const SECRET_SUFFIXES = ["_BOT_KEY", "_MINT_MATERIAL"];

function isSecretEnvKey(key) {
  return key === "VITE_AE_API_KEY" || SECRET_SUFFIXES.some((suffix) => key.endsWith(suffix));
}

export default defineConfig(({ command, mode }) => {
  if (command === "build" && process.env.AE_FACTORY_ALLOW_SECRET_BUILD !== "1") {
    const env = loadEnv(mode, process.cwd(), "VITE_AE_");
    const leaking = Object.keys(env)
      .filter((key) => isSecretEnvKey(key) && String(env[key]).trim())
      .sort();
    if (leaking.length > 0) {
      throw new Error(
        `Refusing to build: ${leaking.join(", ")} would be embedded in the public client bundle. ` +
        "Clear these values (for example in .env.local) before building. " +
        "Set AE_FACTORY_ALLOW_SECRET_BUILD=1 only for a deliberate local-only build.",
      );
    }
  }
  return {};
});
