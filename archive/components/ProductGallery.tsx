import { PRODUCT } from "@/lib/product";

export function ProductGallery() {
  const [main, ...rest] = PRODUCT.images;

  return (
    <div className="gallery" id="gallery">
      <div className="gallery-main">
        <img src={main.src} alt={main.alt} />
      </div>
      <div className="gallery-stack">
        {rest.map((image) => (
          <div className="gallery-tile" key={image.src}>
            <img src={image.src} alt={image.alt} />
          </div>
        ))}
      </div>
    </div>
  );
}
