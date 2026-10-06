import { useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import { ordersApi } from '../../api/endpoints';
import { Loader, Message } from '../../components/Message';
import { ORDER_STATUS_LABELS, formatDate, formatMoney } from '../../utils/format';
import type { Order, OrderStatus, OrdersSummary } from '../../types';

/** Статусы, доступные для выбора сотрудником магазина */
const STATUSES: OrderStatus[] = ['new', 'processing', 'shipped', 'completed', 'cancelled'];

/** Раздел панели управления: обработка заказов */
export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<OrdersSummary | null>(null);
  const [filter, setFilter] = useState<OrderStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = (status: OrderStatus | '') => {
    setLoading(true);
    Promise.all([ordersApi.list(status || undefined), ordersApi.summary()])
      .then(([loadedOrders, loadedSummary]) => {
        setOrders(loadedOrders);
        setSummary(loadedSummary);
        setError(null);
      })
      .catch((cause: ApiError) => setError(cause.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(filter), [filter]);

  const changeStatus = async (order: Order, status: OrderStatus) => {
    try {
      await ordersApi.changeStatus(order.id, status);
      load(filter);
    } catch (cause) {
      setError((cause as ApiError).message);
    }
  };

  return (
    <div className="admin-section">
      {summary && (
        <div className="stats">
          <div className="stat">
            <span className="stat__label">Всего заказов</span>
            <b className="stat__value">{summary.total}</b>
          </div>
          <div className="stat">
            <span className="stat__label">Выручка</span>
            <b className="stat__value">{formatMoney(summary.revenue)}</b>
          </div>
          <div className="stat">
            <span className="stat__label">Средний чек</span>
            <b className="stat__value">{formatMoney(summary.averageCheck)}</b>
          </div>
          <div className="stat">
            <span className="stat__label">Новых</span>
            <b className="stat__value">{summary.byStatus.new}</b>
          </div>
        </div>
      )}

      <label className="field field--inline">
        <span className="field__label">Статус</span>
        <select
          className="field__input"
          value={filter}
          onChange={(event) => setFilter(event.target.value as OrderStatus | '')}
        >
          <option value="">Все заказы</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {ORDER_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>

      {error && <Message kind="error">{error}</Message>}
      {loading && <Loader text="Загрузка заказов…" />}

      {!loading && orders.length === 0 && <Message kind="info">Заказы не найдены.</Message>}

      {!loading && orders.length > 0 && (
        <table className="table table--wide">
          <caption className="table__caption">Заказов в выборке: {orders.length}</caption>
          <thead>
            <tr>
              <th scope="col">Номер</th>
              <th scope="col">Покупатель</th>
              <th scope="col">Дата</th>
              <th scope="col">Позиций</th>
              <th scope="col">Сумма</th>
              <th scope="col">Статус</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.number}</td>
                <td>{order.customerName}</td>
                <td>{formatDate(order.createdAt)}</td>
                <td>{order.items.length}</td>
                <td>{formatMoney(order.total)}</td>
                <td>
                  <select
                    className="field__input field__input--compact"
                    value={order.status}
                    onChange={(event) => changeStatus(order, event.target.value as OrderStatus)}
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {ORDER_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
