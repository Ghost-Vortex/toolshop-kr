interface ProductImageProps {
  image: string;
  alt: string;
  size?: number;
}

/**
 * Фотография товара.
 * Файлы лежат в папке public/products; если у товара фотографии нет,
 * выводится пустая белая заглушка того же размера.
 */
export function ProductImage({ image, alt, size = 160 }: ProductImageProps) {
  if (!image) {
    return (
      <div
        className="product-image product-image--empty"
        style={{ width: size, height: size }}
        aria-label="Фотография отсутствует"
      />
    );
  }

  return (
    <img
      className="product-image"
      src={`/products/${image}`}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
    />
  );
}
