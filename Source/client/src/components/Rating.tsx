interface RatingProps {
  value: number;
  count?: number;
}

/** Оценка товара в виде пяти звёзд */
export function Rating({ value, count }: RatingProps) {
  const rounded = Math.round(value);

  return (
    <span className="rating" title={`Оценка ${value} из 5`}>
      <span className="rating__stars" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= rounded ? 'rating__star rating__star--on' : 'rating__star'}>
            ★
          </span>
        ))}
      </span>
      {count !== undefined && <span className="rating__count">{count > 0 ? `${value} (${count})` : 'нет отзывов'}</span>}
    </span>
  );
}
