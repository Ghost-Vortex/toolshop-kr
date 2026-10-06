import { useEffect, useState } from 'react';

/**
 * Хранит значение в localStorage и держит его в состоянии React.
 * Значение не пропадает при перезагрузке страницы, а событие storage
 * позволяет обновить его, если пользователь работает в нескольких вкладках.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  function read(): T {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? initialValue : (JSON.parse(raw) as T);
    } catch {
      // приватный просмотр или запрет на хранение данных сайта
      return initialValue;
    }
  }

  const [value, setValue] = useState<T>(read);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // хранилище недоступно — работаем без сохранения
    }
  }, [key, value]);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === key) {
        setValue(read());
      }
    }

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  });

  return [value, setValue] as const;
}
