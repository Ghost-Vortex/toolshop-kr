import { useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import { usersApi } from '../../api/endpoints';
import { Loader, Message } from '../../components/Message';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/format';
import type { Role, User } from '../../types';

/** Подписи ролей для выпадающего списка */
const ROLE_LABELS: Record<Role, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  customer: 'Покупатель',
};

/** Раздел панели управления: учётные записи пользователей */
export function AdminUsers() {
  const { user: current } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = () => {
    usersApi
      .list()
      .then(setUsers)
      .catch((cause: ApiError) => setError(cause.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const changeRole = async (target: User, role: Role) => {
    setError(null);
    setNotice(null);

    try {
      await usersApi.changeRole(target.id, role);
      setNotice(`Пользователю «${target.name}» назначена роль «${ROLE_LABELS[role]}»`);
      load();
    } catch (cause) {
      setError((cause as ApiError).message);
    }
  };

  const remove = async (target: User) => {
    setError(null);
    setNotice(null);

    try {
      await usersApi.remove(target.id);
      setNotice(`Учётная запись «${target.name}» удалена`);
      load();
    } catch (cause) {
      setError((cause as ApiError).message);
    }
  };

  if (loading) {
    return <Loader text="Загрузка пользователей…" />;
  }

  return (
    <div className="admin-section">
      {error && <Message kind="error">{error}</Message>}
      {notice && <Message kind="success">{notice}</Message>}

      <table className="table table--wide">
        <caption className="table__caption">Учётных записей: {users.length}</caption>
        <thead>
          <tr>
            <th scope="col">Имя</th>
            <th scope="col">Электронная почта</th>
            <th scope="col">Возраст</th>
            <th scope="col">Зарегистрирован</th>
            <th scope="col">Роль</th>
            <th scope="col">Действия</th>
          </tr>
        </thead>
        <tbody>
          {users.map((item) => (
            <tr key={item.id}>
              <td>
                {item.name}
                {item.id === current?.id && <span className="tag">это вы</span>}
              </td>
              <td>{item.email}</td>
              <td>{item.age ?? '—'}</td>
              <td>{formatDate(item.createdAt)}</td>
              <td>
                <select
                  className="field__input field__input--compact"
                  value={item.role}
                  onChange={(event) => changeRole(item, event.target.value as Role)}
                >
                  {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <button
                  type="button"
                  className="button button--ghost"
                  disabled={item.id === current?.id}
                  onClick={() => remove(item)}
                >
                  Удалить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
