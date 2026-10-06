import { useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import { categoriesApi } from '../../api/endpoints';
import { Loader, Message } from '../../components/Message';
import type { Category } from '../../types';

/** Раздел панели управления: справочник категорий */
export function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = () => {
    categoriesApi
      .list()
      .then(setCategories)
      .catch((cause: ApiError) => setError(cause.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    try {
      const created = await categoriesApi.create({ name, slug, description });
      setNotice(`Категория «${created.name}» создана`);
      setName('');
      setSlug('');
      setDescription('');
      load();
    } catch (cause) {
      setError((cause as ApiError).message);
    }
  };

  const remove = async (category: Category) => {
    setError(null);
    setNotice(null);

    try {
      await categoriesApi.remove(category.id);
      setNotice(`Категория «${category.name}» удалена`);
      load();
    } catch (cause) {
      setError((cause as ApiError).message);
    }
  };

  if (loading) {
    return <Loader text="Загрузка категорий…" />;
  }

  return (
    <div className="admin-section">
      <form className="admin-form" onSubmit={submit}>
        <h3 className="admin-form__title">Добавить категорию</h3>

        <div className="admin-form__grid">
          <label className="field">
            <span className="field__label">Название</span>
            <input
              type="text"
              className="field__input"
              required
              minLength={2}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <label className="field">
            <span className="field__label">Символьный код</span>
            <input
              type="text"
              className="field__input"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              title="Строчные латинские буквы, цифры и дефис"
              placeholder="welding-tools"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
            />
          </label>
        </div>

        <label className="field">
          <span className="field__label">Описание</span>
          <input
            type="text"
            className="field__input"
            maxLength={300}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        {error && <Message kind="error">{error}</Message>}
        {notice && <Message kind="success">{notice}</Message>}

        <button type="submit" className="button button--primary">
          Добавить категорию
        </button>
      </form>

      <table className="table table--wide">
        <caption className="table__caption">Категорий в справочнике: {categories.length}</caption>
        <thead>
          <tr>
            <th scope="col">Название</th>
            <th scope="col">Символьный код</th>
            <th scope="col">Описание</th>
            <th scope="col">Товаров</th>
            <th scope="col">Действия</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.id}>
              <td>{category.name}</td>
              <td>
                <code>{category.slug}</code>
              </td>
              <td>{category.description}</td>
              <td>{category.productsCount ?? 0}</td>
              <td>
                <button type="button" className="button button--ghost" onClick={() => remove(category)}>
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
