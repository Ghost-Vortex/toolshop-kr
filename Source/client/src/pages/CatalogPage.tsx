import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { categoriesApi, productsApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import { ProductCard } from '../components/ProductCard';
import { Loader, Message } from '../components/Message';
import { plural } from '../utils/format';
import type { Category, Paginated, Product } from '../types';
import type { CatalogParams } from '../api/endpoints';

/** Доступные способы сортировки каталога */
const SORT_OPTIONS = [
  { value: 'name_asc', label: 'По наименованию' },
  { value: 'price_asc', label: 'Сначала дешевле' },
  { value: 'price_desc', label: 'Сначала дороже' },
  { value: 'rating_desc', label: 'По оценке покупателей' },
];

const PAGE_SIZE = 6;

/**
 * Страница каталога товаров.
 * Параметры фильтрации хранятся в строке запроса адреса страницы,
 * поэтому результат подбора можно сохранить в закладках или передать ссылкой.
 */
export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState<Paginated<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState(searchParams.get('search') ?? '');

  /** Собирает параметры отбора из строки запроса адреса страницы */
  function readParams(source: URLSearchParams): CatalogParams {
    return {
      page: Number(source.get('page') ?? 1),
      limit: PAGE_SIZE,
      search: source.get('search') ?? undefined,
      categoryId: source.get('categoryId') ?? undefined,
      minPrice: source.get('minPrice') ? Number(source.get('minPrice')) : undefined,
      maxPrice: source.get('maxPrice') ? Number(source.get('maxPrice')) : undefined,
      inStock: source.get('inStock') === 'true' ? true : undefined,
      sort: source.get('sort') ?? 'name_asc',
    };
  }

  const params = readParams(searchParams);

  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    productsApi
      .list(readParams(searchParams))
      .then((result) => {
        if (!cancelled) {
          setPage(result);
          setError(null);
        }
      })
      .catch((cause: ApiError) => {
        if (!cancelled) {
          setError(cause.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  /** Меняет один параметр отбора и возвращает пользователя на первую страницу */
  function updateParam(key: string, value: string | undefined) {
    const next = new URLSearchParams(searchParams);

    if (value === undefined || value === '') {
      next.delete(key);
    } else {
      next.set(key, value);
    }

    if (key !== 'page') {
      next.delete('page');
    }

    setSearchParams(next);
  }

  const resetFilters = () => {
    setSearchDraft('');
    setSearchParams(new URLSearchParams());
  };

  return (
    <>
      <section className="hero">
        <div>
          <h1 className="hero__title">Профессиональный инструмент с доставкой</h1>
          <p className="hero__subtitle">
            {categories.length > 0
              ? `${categories.length} ${plural(categories.length, ['категория', 'категории', 'категорий'])} товаров, гарантия производителя и самовывоз в день заказа`
              : 'Каталог электроинструмента, ручного и измерительного инструмента'}
          </p>
        </div>
      </section>

      <div className="catalog">
        <aside className="filters" aria-label="Фильтры каталога">
          <form
            className="filters__group"
            onSubmit={(event) => {
              event.preventDefault();
              updateParam('search', searchDraft.trim() || undefined);
            }}
          >
            <label className="field">
              <span className="field__label">Поиск</span>
              <input
                type="search"
                className="field__input"
                placeholder="Наименование, артикул, бренд"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
              />
            </label>
            <button type="submit" className="button button--primary button--block">
              Найти
            </button>
          </form>

          <div className="filters__group">
            <h2 className="filters__title">Категория</h2>
            <ul className="filters__list">
              <li>
                <button
                  type="button"
                  className={!params.categoryId ? 'chip chip--active' : 'chip'}
                  onClick={() => updateParam('categoryId', undefined)}
                >
                  Все категории
                </button>
              </li>
              {categories.map((category) => (
                <li key={category.id}>
                  <button
                    type="button"
                    className={params.categoryId === category.id ? 'chip chip--active' : 'chip'}
                    onClick={() => updateParam('categoryId', category.id)}
                  >
                    {category.name}
                    <span className="chip__count">{category.productsCount ?? 0}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="filters__group">
            <h2 className="filters__title">Цена, ₽</h2>
            <div className="filters__row">
              <input
                type="number"
                className="field__input"
                placeholder="от"
                min={0}
                defaultValue={params.minPrice ?? ''}
                onBlur={(event) => updateParam('minPrice', event.target.value)}
              />
              <input
                type="number"
                className="field__input"
                placeholder="до"
                min={0}
                defaultValue={params.maxPrice ?? ''}
                onBlur={(event) => updateParam('maxPrice', event.target.value)}
              />
            </div>
          </div>

          <div className="filters__group">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={Boolean(params.inStock)}
                onChange={(event) => updateParam('inStock', event.target.checked ? 'true' : undefined)}
              />
              <span>Только в наличии</span>
            </label>
          </div>

          <button type="button" className="button button--ghost button--block" onClick={resetFilters}>
            Сбросить фильтры
          </button>
        </aside>

        <section className="results">
          <div className="results__head">
            <p className="results__count">
              {page ? `Найдено ${page.total} ${plural(page.total, ['товар', 'товара', 'товаров'])}` : ' '}
            </p>
            <label className="field field--inline">
              <span className="field__label">Сортировка</span>
              <select
                className="field__input"
                value={params.sort}
                onChange={(event) => updateParam('sort', event.target.value)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && <Message kind="error">{error}</Message>}
          {loading && <Loader text="Загрузка каталога…" />}

          {!loading && page && page.items.length === 0 && (
            <Message kind="info">По заданным условиям товары не найдены. Измените параметры отбора.</Message>
          )}

          {!loading && page && page.items.length > 0 && (
            <div className="grid">
              {page.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {page && page.pages > 1 && (
            <nav className="pagination" aria-label="Постраничная навигация">
              <button
                type="button"
                className="button button--ghost"
                disabled={page.page <= 1}
                onClick={() => updateParam('page', String(page.page - 1))}
              >
                Назад
              </button>
              <span className="pagination__status">
                Страница {page.page} из {page.pages}
              </span>
              <button
                type="button"
                className="button button--ghost"
                disabled={page.page >= page.pages}
                onClick={() => updateParam('page', String(page.page + 1))}
              >
                Вперёд
              </button>
            </nav>
          )}
        </section>
      </div>
    </>
  );
}
