import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ApiError } from '../api/client';
import { ordersApi } from '../api/endpoints';
import { Loader, Message } from '../components/Message';
import { useAuth } from '../context/AuthContext';
import { ORDER_STATUS_LABELS, formatDate, formatMoney } from '../utils/format';
import type { Order } from '../types';

/** Страница «Мои заказы»: история заказов текущего покупателя */
export function OrdersPage() {
  const { user } = useAuth();
  const location = useLocation();
  const createdNumber = (location.state as { created?: string } | null)?.created;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    ordersApi
      .list()
      .then(setOrders)
      .catch((cause: ApiError) => setError(cause.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const cancel = async (id: string) => {
    try {
      await ordersApi.cancel(id);
      load();
    } catch (cause) {
      setError((cause as ApiError).message);
    }
  };

  if (loading) {
    return <Loader text="Загрузка заказов…" />;
  }

  return (
    <section>
      <h1 className="section-title">
        {user?.role === 'customer' ? 'Мои заказы' : 'Заказы магазина'}
      </h1>

      {createdNumber && <Message kind="success">Заказ {createdNumber} принят в обработку</Message>}
      {error && <Message kind="error">{error}</Message>}

      {orders.length === 0 ? (
        <Message kind="info">Заказов пока нет.</Message>
      ) : (
        <ul className="orders">
          {orders.map((order) => (
            <li key={order.id} className="order">
              <header className="order__head">
                <div>
                  <h2 className="order__number">Заказ {order.number}</h2>
                  <p className="order__date">от {formatDate(order.createdAt)}</p>
                </div>
                <span className={`status status--${order.status}`}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </header>

              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Товар</th>
                    <th scope="col">Цена</th>
                    <th scope="col">Кол-во</th>
                    <th scope="col">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.productId}>
                      <td>{item.productName}</td>
                      <td>{formatMoney(item.price)}</td>
                      <td>{item.quantity}</td>
                      <td>{formatMoney(item.sum)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <footer className="order__foot">
                <p className="order__address">
                  {order.address} · {order.phone}
                </p>
                <p className="order__total">Итого: {formatMoney(order.total)}</p>
                {order.status === 'new' && (
                  <button type="button" className="button button--ghost" onClick={() => cancel(order.id)}>
                    Отменить заказ
                  </button>
                )}
              </footer>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
