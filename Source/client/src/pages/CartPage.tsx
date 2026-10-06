import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Message } from '../components/Message';
import { ProductImage } from '../components/ProductImage';
import { formatMoney, plural } from '../utils/format';

/** Страница корзины. Содержимое корзины хранится в localStorage браузера */
export function CartPage() {
  const { lines, count, total, setQuantity, remove, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (lines.length === 0) {
    return (
      <section className="empty">
        <h1 className="section-title">Корзина пуста</h1>
        <Message kind="info">Добавьте инструмент из каталога, чтобы оформить заказ.</Message>
        <Link to="/" className="button button--primary">
          Перейти в каталог
        </Link>
      </section>
    );
  }

  return (
    <section>
      <h1 className="section-title">
        Корзина: {count} {plural(count, ['товар', 'товара', 'товаров'])}
      </h1>

      <div className="cart">
        <ul className="cart__list">
          {lines.map((line) => (
            <li key={line.productId} className="cart-line">
              <div className="cart-line__media">
                <ProductImage image={line.image} alt={line.name} size={60} />
              </div>

              <div className="cart-line__info">
                <Link to={`/product/${line.productId}`} className="cart-line__name">
                  {line.name}
                </Link>
                <p className="cart-line__price">{formatMoney(line.price)} за штуку</p>
              </div>

              <div className="quantity">
                <button
                  type="button"
                  className="quantity__button"
                  onClick={() => setQuantity(line.productId, line.quantity - 1)}
                  aria-label="Уменьшить количество"
                >
                  −
                </button>
                <input
                  type="number"
                  className="quantity__input"
                  value={line.quantity}
                  min={1}
                  max={line.stock}
                  onChange={(event) => setQuantity(line.productId, Number(event.target.value))}
                />
                <button
                  type="button"
                  className="quantity__button"
                  onClick={() => setQuantity(line.productId, line.quantity + 1)}
                  aria-label="Увеличить количество"
                >
                  +
                </button>
              </div>

              <p className="cart-line__sum">{formatMoney(line.price * line.quantity)}</p>

              <button
                type="button"
                className="button button--ghost"
                onClick={() => remove(line.productId)}
                aria-label={`Удалить «${line.name}» из корзины`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>

        <aside className="cart__summary">
          <h2 className="filters__title">Итого</h2>
          <p className="cart__total">{formatMoney(total)}</p>
          <p className="cart__note">Доставка по Москве — бесплатно при заказе от 5 000 ₽</p>

          {!user && (
            <Message kind="info">
              Для оформления заказа необходимо <Link to="/login">войти в систему</Link>.
            </Message>
          )}

          <button
            type="button"
            className="button button--primary button--block"
            onClick={() => navigate(user ? '/checkout' : '/login')}
          >
            Оформить заказ
          </button>
          <button type="button" className="button button--ghost button--block" onClick={clear}>
            Очистить корзину
          </button>
        </aside>
      </div>
    </section>
  );
}
