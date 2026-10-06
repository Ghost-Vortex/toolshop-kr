import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

/** Страница регистрации покупателя */
export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors([]);
    setSending(true);

    try {
      await register({
        name,
        email,
        password,
        age: age ? Number(age) : undefined,
      });
      navigate('/', { replace: true });
    } catch (cause) {
      const apiError = cause as ApiError;
      setErrors(apiError.details.length ? apiError.details : [apiError.message]);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="auth">
      <form className="auth__form" onSubmit={submit}>
        <h1 className="section-title">Регистрация</h1>

        <label className="field">
          <span className="field__label">Имя</span>
          <input
            type="text"
            className="field__input"
            required
            minLength={2}
            maxLength={100}
            placeholder="Фамилия Имя Отчество"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">Адрес электронной почты</span>
          <input
            type="email"
            className="field__input"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">Возраст (необязательно)</span>
          <input
            type="number"
            className="field__input"
            min={14}
            max={120}
            value={age}
            onChange={(event) => setAge(event.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">Пароль</span>
          <input
            type="password"
            className="field__input"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <span className="field__hint">Не менее 8 символов</span>
        </label>

        {errors.length > 0 && (
          <div className="message message--error" role="alert">
            <ul className="message__list">
              {errors.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <button type="submit" className="button button--primary button--block" disabled={sending}>
          {sending ? 'Отправка…' : 'Зарегистрироваться'}
        </button>

        <p className="auth__hint">
          Уже есть учётная запись? <Link to="/login">Войти</Link>
        </p>
      </form>
    </section>
  );
}
