import { useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import { categoriesApi, productsApi } from '../../api/endpoints';
import { Loader, Message } from '../../components/Message';
import { formatMoney } from '../../utils/format';
import type { Category, Product } from '../../types';

/** Пустая форма добавления товара */
const EMPTY_FORM = {
  name: '',
  sku: '',
  description: '',
  price: '',
  stock: '',
  brand: '',
  categoryId: '',
  image: '',
};

/** Раздел панели управления: ведение каталога товаров */
export function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const load = () => {
    Promise.all([productsApi.management(), categoriesApi.list()])
      .then(([loadedProducts, loadedCategories]) => {
        setProducts(loadedProducts);
        setCategories(loadedCategories);
      })
      .catch((cause: ApiError) => setErrors([cause.message]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors([]);
    setNotice(null);

    try {
      const created = await productsApi.create({
        name: form.name,
        sku: form.sku.toUpperCase(),
        description: form.description,
        price: Number(form.price),
        stock: Number(form.stock),
        brand: form.brand,
        categoryId: form.categoryId,
        image: form.image,
      });

      setNotice(`Товар «${created.name}» добавлен в каталог`);
      setForm(EMPTY_FORM);
      load();
    } catch (cause) {
      const apiError = cause as ApiError;
      setErrors(apiError.details.length ? apiError.details : [apiError.message]);
    }
  };

  const changeStock = async (product: Product, delta: number) => {
    try {
      await productsApi.update(product.id, { stock: Math.max(0, product.stock + delta) });
      load();
    } catch (cause) {
      setErrors([(cause as ApiError).message]);
    }
  };

  const remove = async (product: Product) => {
    try {
      const result = await productsApi.remove(product.id);
      setNotice(
        result.archived
          ? `Товар «${product.name}» переведён в архив: он встречается в оформленных заказах`
          : `Товар «${product.name}» удалён`,
      );
      load();
    } catch (cause) {
      setErrors([(cause as ApiError).message]);
    }
  };

  if (loading) {
    return <Loader text="Загрузка каталога…" />;
  }

  return (
    <div className="admin-section">
      <form className="admin-form" onSubmit={submit}>
        <h3 className="admin-form__title">Добавить товар</h3>

        <div className="admin-form__grid">
          <label className="field">
            <span className="field__label">Наименование</span>
            <input
              type="text"
              className="field__input"
              required
              minLength={3}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </label>

          <label className="field">
            <span className="field__label">Артикул</span>
            <input
              type="text"
              className="field__input"
              required
              pattern="[A-Za-z]{3}-[0-9]{4}"
              title="Три латинские буквы, дефис и четыре цифры, например PWR-0851"
              placeholder="PWR-0851"
              value={form.sku}
              onChange={(event) => setForm({ ...form, sku: event.target.value })}
            />
          </label>

          <label className="field">
            <span className="field__label">Цена, ₽</span>
            <input
              type="number"
              className="field__input"
              required
              min={1}
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
            />
          </label>

          <label className="field">
            <span className="field__label">Остаток, шт.</span>
            <input
              type="number"
              className="field__input"
              required
              min={0}
              value={form.stock}
              onChange={(event) => setForm({ ...form, stock: event.target.value })}
            />
          </label>

          <label className="field">
            <span className="field__label">Производитель</span>
            <input
              type="text"
              className="field__input"
              required
              minLength={2}
              value={form.brand}
              onChange={(event) => setForm({ ...form, brand: event.target.value })}
            />
          </label>

          <label className="field">
            <span className="field__label">Категория</span>
            <select
              className="field__input"
              required
              value={form.categoryId}
              onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
            >
              <option value="">— выберите —</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span className="field__label">Описание</span>
          <textarea
            className="field__input field__input--area"
            rows={2}
            maxLength={1000}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
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
        {notice && <Message kind="success">{notice}</Message>}

        <button type="submit" className="button button--primary">
          Добавить товар
        </button>
      </form>

      <table className="table table--wide">
        <caption className="table__caption">Товары в каталоге: {products.length}</caption>
        <thead>
          <tr>
            <th scope="col">Наименование</th>
            <th scope="col">Артикул</th>
            <th scope="col">Категория</th>
            <th scope="col">Цена</th>
            <th scope="col">Остаток</th>
            <th scope="col">Действия</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className={product.isArchived ? 'row--muted' : undefined}>
              <td>
                {product.name}
                {product.isArchived && <span className="tag">архив</span>}
              </td>
              <td>{product.sku}</td>
              <td>{product.categoryName}</td>
              <td>{formatMoney(product.price)}</td>
              <td>
                <div className="quantity quantity--compact">
                  <button
                    type="button"
                    className="quantity__button"
                    onClick={() => changeStock(product, -1)}
                    aria-label="Уменьшить остаток"
                  >
                    −
                  </button>
                  <span className="quantity__value">{product.stock}</span>
                  <button
                    type="button"
                    className="quantity__button"
                    onClick={() => changeStock(product, 1)}
                    aria-label="Увеличить остаток"
                  >
                    +
                  </button>
                </div>
              </td>
              <td>
                <button type="button" className="button button--ghost" onClick={() => remove(product)}>
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
