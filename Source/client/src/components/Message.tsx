interface MessageProps {
  kind: 'error' | 'success' | 'info';
  children: React.ReactNode;
}

/** Информационное сообщение: ошибка, успешное действие или подсказка */
export function Message({ kind, children }: MessageProps) {
  return (
    <p className={`message message--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}

/** Индикатор загрузки данных */
export function Loader({ text = 'Загрузка…' }: { text?: string }) {
  return (
    <p className="loader" role="status">
      <span className="loader__dot" />
      {text}
    </p>
  );
}
