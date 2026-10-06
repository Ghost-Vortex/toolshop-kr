import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { Message } from '../components/Message';
import { useAuth } from '../context/AuthContext';

/** Демонстрационные учётные записи, подставляемые в форму одним щелчком */
const DEMO_ACCOUNTS = [
  { label: 'Администратор', email: 'admin@toolshop.ru', password: 'admin12345' },
  { label: 'Менеджер', email: 'manager@toolshop.ru', password: 'manager12345' },
  { label: 'Покупатель', email: 'kovalev@example.com', password: 'customer12345' },
];

/** Страница входа в систему */
export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (user) {
    return <Navigate to={from} replace />;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSending(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (cause) {
      setError((cause as ApiError).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="auth">
      <form className="auth__form" onSubmit={submit}>
        <h1 className="section-title">Вход в систему</h1>

        <label className="field">
          <span className="field__label">Адрес электронной почты</span>
          <input
            type="email"
            className="field__input"
            required
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">Пароль</span>
          <input
            type="password"
            className="field__input"
            required
            minLength={8}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error && <Message kind="error">{error}</Message>}

        <button type="submit" className="button button--primary button--block" disabled={sending}>
          {sending ? 'Проверка…' : 'Войти'}
        </button>

        <p className="auth__hint">
          Нет учётной записи? <Link to="/register">Зарегистрироваться</Link>
        </p>

        <div className="auth__demo">
          <p className="field__label">Демонстрационные учётные записи</p>
          <div className="auth__demo-buttons">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                className="chip"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                }}
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>
      </form>
    </section>
  );
}
