import { LICENSE_EN, LICENSE_RU, LICENSE_VERSION } from './license-default';

// The license page (/license). One document. Raise the version whenever the
// meaning of the terms changes: every order stores the version the buyer agreed to.
export default {
  name: 'license',
  title: 'Лицензия',
  type: 'document',
  fields: [
    {
      name: 'version',
      title: 'Версия условий',
      type: 'string',
      description:
        'Например 1.0, 1.1. Меняйте, когда меняется смысл условий: в каждом заказе сохраняется версия, с которой согласился покупатель.',
      initialValue: LICENSE_VERSION,
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'updatedAt',
      title: 'Дата редакции',
      type: 'date',
    },
    {
      name: 'textEn',
      title: 'License text — English',
      type: 'text',
      rows: 30,
      description:
        'Пустая строка — новый абзац. Строка с «## » — заголовок, с «- » — пункт списка.',
      initialValue: LICENSE_EN,
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'textRu',
      title: 'Текст лицензии — русский',
      type: 'text',
      rows: 30,
      initialValue: LICENSE_RU,
      validation: (Rule: any) => Rule.required(),
    },
  ],
  preview: {
    select: { version: 'version' },
    prepare: ({ version }: any) => ({ title: `Лицензия, версия ${version}` }),
  },
};
