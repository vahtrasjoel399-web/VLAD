import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || '',
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
  studioHost: 'smolin-fx',
  deployment: {
    appId: 'ctjp99r3962kzvir0ylzjzb6',
  },
});
