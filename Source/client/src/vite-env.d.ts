/// <reference types="vite/client" />

/** Переменные окружения, доступные клиентскому приложению */
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
