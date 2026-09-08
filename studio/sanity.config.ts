import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { muxInput } from 'sanity-plugin-mux-input';
import { schemaTypes } from './schemaTypes';

const projectId = process.env.SANITY_STUDIO_PROJECT_ID;

if (!projectId) {
  throw new Error('Добавьте SANITY_STUDIO_PROJECT_ID в studio/.env');
}

export default defineConfig({
  name: 'smolinFx',
  title: 'SMOLIN.FX — Админка',
  projectId,
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Админка')
          .items([
            S.listItem()
              .title('Портфолио')
              .id('portfolio')
              .child(
                S.document().schemaType('portfolio').documentId('portfolio'),
              ),
          ]),
    }),
    visionTool(),
    muxInput({
      video_quality: 'basic',
      max_resolution_tier: '2160p',
      acceptedMimeTypes: ['video/*'],
      maxAssetFileSize: 30 * 1024 * 1024 * 1024,
    }),
  ],
  schema: { types: schemaTypes },
  document: {
    newDocumentOptions: (templates) =>
      templates.filter((template) => template.templateId !== 'portfolio'),
  },
});
