// Copy into your Sanity Studio schemaTypes directory and include in schemaTypes.
// No credentials belong in this file. Use a PUBLIC dataset with published portfolio content only.
export default {
  name: 'portfolio',
  title: 'Портфолио',
  type: 'document',
  fields: [
    { name: 'name', title: 'Имя / логотип автора', type: 'string' },
    {
      name: 'demo',
      title: 'Демонстрационный режим',
      type: 'boolean',
      initialValue: true,
    },
    {
      name: 'description',
      title: 'Короткое описание (две строки)',
      type: 'text',
      rows: 2,
    },
    { name: 'roles', title: 'Направления работы', type: 'string' },
    { name: 'email', title: 'Email', type: 'string' },
    {
      name: 'socials',
      title: 'Соцсети и мессенджеры',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'name', title: 'Название', type: 'string' },
            { name: 'url', title: 'Ссылка HTTPS', type: 'url' },
          ],
        },
      ],
    },
    {
      name: 'works',
      title: 'Работы',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'work',
          fields: [
            { name: 'title', title: 'Название', type: 'string' },
            {
              name: 'client',
              title: 'Клиент / автор деморолика',
              type: 'string',
            },
            { name: 'kind', title: 'Тип работы', type: 'string' },
            {
              name: 'order',
              title: 'Порядок (меньше — раньше)',
              type: 'number',
            },
            {
              name: 'muxPlaybackId',
              title: 'Mux Public Playback ID',
              type: 'string',
              description:
                'Из Mux → Video → Asset → Playback IDs. Не Asset ID и не API token.',
            },
            {
              name: 'src',
              title: 'Прямая ссылка MP4 или HLS (если не Mux)',
              type: 'url',
            },
            {
              name: 'poster',
              title: 'Постер',
              type: 'image',
              options: { hotspot: true },
            },
            {
              name: 'previewStart',
              title: 'Начало превью / кадр постера, секунды',
              type: 'number',
              initialValue: 1,
            },
            {
              name: 'duration',
              title: 'Длительность, например 01:20',
              type: 'string',
            },
            {
              name: 'demo',
              title: 'Это демонстрационное видео',
              type: 'boolean',
              initialValue: false,
            },
            {
              name: 'captions',
              title: 'Субтитры WebVTT',
              type: 'file',
              options: { accept: '.vtt' },
            },
          ],
          preview: {
            select: { title: 'title', subtitle: 'kind', media: 'poster' },
          },
        },
      ],
    },
    {
      name: 'logos',
      title: 'Компании',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'name', title: 'Название', type: 'string' },
            { name: 'image', title: 'Логотип (PNG, WebP, SVG)', type: 'image' },
            { name: 'url', title: 'Необязательная ссылка HTTPS', type: 'url' },
            { name: 'order', title: 'Порядок', type: 'number' },
          ],
          preview: { select: { title: 'name', media: 'image' } },
        },
      ],
    },
  ],
};
