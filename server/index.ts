import 'dotenv/config';
import { createApp } from './app';
import { ModelSettingsStore, settingsFilePath } from './model-settings';

const config = { baseUrl: process.env.LLM_BASE_URL, key: process.env.LLM_API_KEY, model: process.env.LLM_MODEL, format: process.env.LLM_RESPONSE_FORMAT };
const settings = new ModelSettingsStore(config, process.env.ALGOMOTION_SETTINGS_MODE === 'memory' ? undefined : settingsFilePath);
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '127.0.0.1';
const server = createApp(config, fetch, undefined, settings).listen(port, host, () => {
  console.log(`AlgoMotion API: http://${host}:${port}`);
  console.log(settings.publicView().configured ? 'AI configured (server-side key). Generation additionally requires the Docker image.' : 'Local presets enabled. Configure AI via Model Settings or .env. No host Python fallback.');
});
server.on('error', (error) => { console.error('Server could not start:', error.message); process.exit(1); });
