import { Link } from 'react-router-dom';

/** Страница, отображаемая при обращении по несуществующему адресу */
export function NotFoundPage() {
  return (
    <section className="empty">
      <h1 className="section-title">Страница не найдена</h1>
      <p>Проверьте адрес или вернитесь в каталог инструментов.</p>
      <Link to="/" className="button button--primary">
        В каталог
      </Link>
    </section>
  );
}
