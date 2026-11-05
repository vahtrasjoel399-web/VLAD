// A store item. Each product is its own document in the "Магазин" folder.
// The dataset is public: never upload the paid files themselves here.
export default {
  name: 'product',
  title: 'Товар',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title — English',
      type: 'string',
      validation: (Rule: any) => Rule.required(),
    },
    { name: 'titleRu', title: 'Название — русский', type: 'string' },
    {
      name: 'category',
      title: 'Категория, например Presets или LUTs',
      type: 'string',
    },
    {
      name: 'price',
      title: 'Цена, EUR',
      type: 'number',
      description: '0 — бесплатный товар.',
      validation: (Rule: any) => Rule.required().min(0),
    },
    {
      name: 'checkoutUrl',
      title: 'Ссылка на оплату Stripe',
      type: 'url',
      description:
        'Stripe → Payment Links → Create → скопировать ссылку (https://buy.stripe.com/...). Для бесплатного товара сюда можно вставить ссылку на скачивание. Пока поле пустое, на сайте вместо кнопки будет «Скоро».',
      validation: (Rule: any) => Rule.uri({ scheme: ['https'] }),
    },
    {
      name: 'image',
      title: 'Картинка PNG',
      type: 'image',
      description:
        'PNG с прозрачным фоном. На сайте показывается целиком, без рамки и обрезки.',
      options: { hotspot: false, accept: 'image/png,image/webp' },
    },
    {
      name: 'imageHover',
      title: 'Вторая картинка при наведении (PNG)',
      type: 'image',
      description:
        'Необязательно. Плавно сменяет основную картинку при наведении, например вид коробки сзади.',
      options: { hotspot: false, accept: 'image/png,image/webp' },
    },
    {
      name: 'description',
      title: 'Short description — English',
      type: 'text',
      rows: 2,
    },
    {
      name: 'descriptionRu',
      title: 'Короткое описание — русский',
      type: 'text',
      rows: 2,
    },
    {
      name: 'isNew',
      title: 'Новинка (бейдж NEW)',
      type: 'boolean',
      initialValue: false,
    },
    {
      name: 'order',
      title: 'Порядок (меньше — раньше)',
      type: 'number',
      description: 'Первый товар показывается крупно.',
    },
  ],
  orderings: [
    {
      title: 'Как на сайте',
      name: 'siteOrder',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'title',
      category: 'category',
      price: 'price',
      link: 'checkoutUrl',
      media: 'image',
    },
    prepare({ title, category, price, link, media }: any) {
      const cost =
        typeof price !== 'number' ? '' : price === 0 ? 'Free' : `€${price}`;
      return {
        title,
        subtitle: [category, cost, link ? '' : 'нет ссылки на оплату']
          .filter(Boolean)
          .join(' · '),
        media,
      };
    },
  },
};
