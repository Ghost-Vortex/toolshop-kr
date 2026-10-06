import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatMoney } from '../utils/format';
import type { Product } from '../types';
import { Rating } from './Rating';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: Product;
}

/** Карточка товара в списке каталога */
export function ProductCard({ product }: ProductCardProps) {
  const { add } = useCart();
  const outOfStock = product.stock <= 0;

  return (
    <article className="card">
      <Link to={`/product/${product.id}`} className="card__media" aria-label={product.name}>
        <ProductImage image={product.image} alt={product.name} />
      </Link>

      <div className="card__body">
        <span className="card__category">{product.categoryName}</span>
        <h3 className="card__title">
          <Link to={`/product/${product.id}`}>{product.name}</Link>
        </h3>
        <Rating value={product.rating} count={product.reviewsCount} />
        <p className="card__brand">
          {product.brand} · арт. {product.sku}
        </p>
      </div>

      <div className="card__footer">
        <div>
          <p className="card__price">{formatMoney(product.price)}</p>
          <p className={outOfStock ? 'card__stock card__stock--empty' : 'card__stock'}>
            {outOfStock ? 'Нет в наличии' : `В наличии: ${product.stock} шт.`}
          </p>
        </div>
        <button
          type="button"
          className="button button--primary"
          disabled={outOfStock}
          onClick={() => add(product)}
        >
          В корзину
        </button>
      </div>
    </article>
  );
}
