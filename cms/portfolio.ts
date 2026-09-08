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
      title: 'Short description — English (two lines)',
      type: 'text',
      rows: 2,
    },
    {
      name: 'descriptionRu',
      title: 'Короткое описание — русский (две строки)',
      type: 'text',
      rows: 2,
    },
    { name: 'roles', title: 'Services — English', type: 'string' },
    { name: 'rolesRu', title: 'Направления — русский', type: 'string' },
    { name: 'email', title: 'Email', type: 'string' },
    { name: 'phone', title: 'Телефон', type: 'string' },
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
            { name: 'title', title: 'Title — English', type: 'string' },
            { name: 'titleRu', title: 'Название — русский', type: 'string' },
            {
              name: 'client',
              title: 'Клиент / автор деморолика',
              type: 'string',
            },
            { name: 'kind', title: 'Work type — English', type: 'string' },
            { name: 'kindRu', title: 'Тип работы — русский', type: 'string' },
            {
              name: 'order',
              title: 'Порядок (меньше — раньше)',
              type: 'number',
            },
            {
              name: 'video',
              title: 'Видео — загрузить файл',
              type: 'mux.video',
              description:
                'Загрузите MP4, MOV или другой видеофайл. Mux сам подготовит качество и звук для браузеров.',
              options: {
                acceptedMimeTypes: ['video/*'],
                max_resolution_tier: '2160p',
              },
            },
            {
              name: 'muxPlaybackId',
              title: 'Mux Playback ID — только для старых записей',
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
              name: 'url',
              title: 'Внешняя ссылка на работу (например, Instagram Reel)',
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
      title: 'Спонсоры',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'name',
              title: 'Название спонсора',
              type: 'string',
              validation: (Rule: any) => Rule.required(),
            },
            {
              name: 'image',
              title: 'Логотип PNG',
              type: 'image',
              description:
                'Лучше PNG с прозрачным фоном. Цвет на сайте станет единым автоматически.',
              options: { hotspot: false },
              validation: (Rule: any) => Rule.required(),
            },
            {
              name: 'url',
              title: 'Сайт спонсора (HTTPS)',
              type: 'url',
              validation: (Rule: any) => Rule.required().uri({ scheme: ['https'] }),
            },
            { name: 'order', title: 'Порядок', type: 'number' },
          ],
          preview: { select: { title: 'name', media: 'image' } },
        },
      ],
    },
  ],
};
