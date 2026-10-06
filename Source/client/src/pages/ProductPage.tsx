import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { productsApi, reviewsApi } from '../api/endpoints';
import { Loader, Message } from '../components/Message';
import { Rating } from '../components/Rating';
import { ProductImage } from '../components/ProductImage';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatDate, formatMoney } from '../utils/format';
import type { Product, Review } from '../types';

/** Страница карточки товара с отзывами покупателей */
export function ProductPage() {
  const { id = '' } = useParams();
  const { add } = useCart();
  const { user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSent, setReviewSent] = useState(false);

  const reload = () => {
    Promise.all([productsApi.byId(id), reviewsApi.byProduct(id)])
      .then(([loadedProduct, loadedReviews]) => {
        setProduct(loadedProduct);
        setReviews(loadedReviews);
        setError(null);
      })
      .catch((cause: ApiError) => setError(cause.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    setReviewError(null);

    try {
      await reviewsApi.create({ productId: id, rating, text });
      setText('');
      setReviewSent(true);
      reload();
    } catch (cause) {
      setReviewError((cause as ApiError).message);
    }
  };

  if (loading) {
    return <Loader text="Загрузка карточки товара…" />;
  }

  if (error || !product) {
    return (
      <>
        <Message kind="error">{error ?? 'Товар не найден'}</Message>
        <Link to="/" className="button button--ghost">
          Вернуться в каталог
        </Link>
      </>
    );
  }

  return (
    <article className="product">
      <nav className="breadcrumbs" aria-label="Навигационная цепочка">
        <Link to="/">Каталог</Link>
        <span aria-hidden="true"> / </span>
        <Link to={`/?categoryId=${product.categoryId}`}>{product.categoryName}</Link>
        <span aria-hidden="true"> / </span>
        <span>{product.name}</span>
      </nav>

      <div className="product__main">
        <div className="product__media">
          <ProductImage image={product.image} alt={product.name} size={240} />
        </div>

        <div className="product__info">
          <h1 className="product__title">{product.name}</h1>
          <Rating value={product.rating} count={product.reviewsCount} />

          <dl className="specs">
            <div className="specs__row">
              <dt>Производитель</dt>
              <dd>{product.brand}</dd>
            </div>
            <div className="specs__row">
              <dt>Артикул</dt>
              <dd>{product.sku}</dd>
            </div>
            <div className="specs__row">
              <dt>Категория</dt>
              <dd>{product.categoryName}</dd>
            </div>
            <div className="specs__row">
              <dt>Наличие</dt>
              <dd>{product.stock > 0 ? `${product.stock} шт. на складе` : 'Нет в наличии'}</dd>
            </div>
          </dl>

          <p className="product__description">{product.description}</p>

          <div className="product__buy">
            <p className="product__price">{formatMoney(product.price)}</p>
            <div className="quantity">
              <button
                type="button"
                className="quantity__button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                aria-label="Уменьшить количество"
              >
                −
              </button>
              <input
                type="number"
                className="quantity__input"
                value={quantity}
                min={1}
                max={Math.max(1, product.stock)}
                onChange={(event) =>
                  setQuantity(Math.min(Math.max(1, Number(event.target.value)), product.stock))
                }
              />
              <button
                type="button"
                className="quantity__button"
                onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))}
                aria-label="Увеличить количество"
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="button button--primary"
              disabled={product.stock <= 0}
              onClick={() => add(product, quantity)}
            >
              Добавить в корзину
            </button>
          </div>
        </div>
      </div>

      <section className="reviews">
        <h2 className="section-title">Отзывы покупателей</h2>

        {reviews.length === 0 && <Message kind="info">Отзывов пока нет — станьте первым.</Message>}

        <ul className="reviews__list">
          {reviews.map((review) => (
            <li key={review.id} className="review">
              <div className="review__head">
                <span className="review__author">{review.authorName}</span>
                <Rating value={review.rating} />
                <span className="review__date">{formatDate(review.createdAt)}</span>
              </div>
              <p className="review__text">{review.text}</p>
            </li>
          ))}
        </ul>

        {user ? (
          <form className="review-form" onSubmit={submitReview}>
            <h3 className="review-form__title">Оставить отзыв</h3>

            <label className="field">
              <span className="field__label">Оценка</span>
              <select
                className="field__input"
                value={rating}
                onChange={(event) => setRating(Number(event.target.value))}
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value} из 5
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field__label">Текст отзыва</span>
              <textarea
                className="field__input field__input--area"
                rows={4}
                minLength={10}
                maxLength={500}
                required
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Расскажите, как инструмент показал себя в работе"
              />
            </label>

            {reviewError && <Message kind="error">{reviewError}</Message>}
            {reviewSent && !reviewError && <Message kind="success">Отзыв опубликован</Message>}

            <button type="submit" className="button button--primary">
              Отправить отзыв
            </button>
          </form>
        ) : (
          <Message kind="info">
            <Link to="/login">Войдите</Link>, чтобы оставить отзыв о товаре.
          </Message>
        )}
      </section>
    </article>
  );
}
