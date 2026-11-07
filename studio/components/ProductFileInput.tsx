import { Button, Card, Stack, Text } from '@sanity/ui';
import { useFormValue } from 'sanity';

// Paid files never go into Sanity (the dataset is public). This field only
// links to the site's private store admin, where the file is uploaded into
// closed storage for this exact product.
const site = (process.env.SANITY_STUDIO_SITE_URL || '').replace(/\/$/, '');

export function ProductFileInput() {
  const id = String(useFormValue(['_id']) || '').replace(/^drafts\./, '');
  const href = site
    ? `${site}/admin/orders?product=${encodeURIComponent(id)}#files`
    : '';
  return (
    <Card padding={3} radius={2} tone="primary" border>
      <Stack space={3}>
        <Text size={1}>
          Файл товара хранится в закрытом хранилище, не в Sanity. Сначала
          нажмите Publish, потом загрузите файл в админке магазина.
        </Text>
        {href ? (
          <Button
            as="a"
            href={href}
            target="_blank"
            rel="noopener"
            text="Загрузить или заменить файл"
            tone="primary"
            mode="ghost"
          />
        ) : (
          <Text size={1} muted>
            Добавьте SANITY_STUDIO_SITE_URL в studio/.env, чтобы здесь появилась
            кнопка.
          </Text>
        )}
      </Stack>
    </Card>
  );
}
