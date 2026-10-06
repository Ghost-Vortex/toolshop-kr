import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { ordersApi } from '../api/endpoints';
import { useCart } from '../context/CartContext';
import { formatMoney } from '../utils/format';

/** Маска телефона, совпадающая с проверкой на сервере */
const PHONE_PATTERN = '\\+7 \\(\\d{3}\\) \\d{3}-\\d{2}-\\d{2}';

/** Страница оформления заказа */
export function CheckoutPage() {
  const { lines, total, clear } = useCart();
  const navigate = useNavigate();

  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  if (lines.length === 0) {
    return (
      <section className="empty">
        <h1 className="section-title">Корзина пуста</h1>
        <Link to="/" className="button button--primary">
          Перейти в каталог
        </Link>
      </section>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors([]);
    setSending(true);

    try {
      const order = await ordersApi.create({
        items: lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
        address,
        phone,
        comment: comment.trim() || undefined,
      });

      clear();
      navigate('/orders', { state: { created: order.number } });
    } catch (cause) {
      const apiError = cause as ApiError;
      setErrors(apiError.details.length ? apiError.details : [apiError.message]);
    } finally {
      setSending(false);
    }
  };

  return (
    <section>
      <h1 className="section-title">Оформление заказа</h1>

      <div className="checkout">
        <form className="checkout__form" onSubmit={submit} noValidate={false}>
          <label className="field">
            <span className="field__label">Адрес доставки</span>
            <input
              type="text"
              className="field__input"
              required
              minLength={10}
              maxLength={200}
              placeholder="г. Москва, ул. Воронцовская, д. 6а, стр. 1"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </label>

          <label className="field">
            <span className="field__label">Контактный телефон</span>
            <input
              type="tel"
              className="field__input"
              required
              pattern={PHONE_PATTERN}
              placeholder="+7 (916) 100-20-30"
              title="Формат: +7 (XXX) XXX-XX-XX"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <span className="field__hint">Формат: +7 (XXX) XXX-XX-XX</span>
          </label>

          <label className="field">
            <span className="field__label">Комментарий к заказу</span>
            <textarea
              className="field__input field__input--area"
              rows={3}
              maxLength={300}
              placeholder="Пожелания по времени доставки"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </label>

          {errors.length > 0 && (
            <div className="message message--error" role="alert">
              <p>Не удалось оформить заказ:</p>
              <ul className="message__list">
                {errors.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <button type="submit" className="button button--primary" disabled={sending}>
            {sending ? 'Отправка…' : 'Подтвердить заказ'}
          </button>
        </form>

        <aside className="checkout__summary">
          <h2 className="filters__title">Состав заказа</h2>
          <ul className="checkout__list">
            {lines.map((line) => (
              <li key={line.productId}>
                <span>
                  {line.name} × {line.quantity}
                </span>
                <b>{formatMoney(line.price * line.quantity)}</b>
              </li>
            ))}
          </ul>
          <p className="cart__total">{formatMoney(total)}</p>
        </aside>
      </div>
    </section>
  );
}
