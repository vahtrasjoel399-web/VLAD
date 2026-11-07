'use client';
import { useState } from 'react';

// Upload in three steps: ask the site for a one-time upload address, send the
// file straight to private storage, then attach it to the product.
export default function FileUpload({ productId }: { productId: string }) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    setStatus('Загрузка…');
    try {
      const start = await fetch('/api/admin/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, fileName: file.name }),
      });
      const target = await start.json();
      if (!start.ok) throw new Error(target.error || 'Ошибка');
      const put = await fetch(target.signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'x-upsert': 'false',
        },
        body: file,
      });
      if (!put.ok)
        throw new Error(
          put.status === 413
            ? 'Файл слишком большой для тарифа хранилища'
            : `Хранилище ответило ${put.status}`,
        );
      const done = await fetch('/api/admin/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          path: target.path,
          fileName: file.name,
        }),
      });
      const result = await done.json();
      if (!done.ok) throw new Error(result.error || 'Ошибка');
      setStatus('Готово');
      location.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="admin-upload">
      <label className="plain-button is-small">
        {busy ? 'Загрузка…' : 'Выбрать файл'}
        <input
          type="file"
          hidden
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </label>
      <output>{status}</output>
    </span>
  );
}
