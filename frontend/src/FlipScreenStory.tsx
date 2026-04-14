export type StorySlide = {
  id: string;
  title: string;
  text: string;
  imageSrc: string;
  imageAlt: string;
  tag?: string;
};

export function FlipScreenStory({
  slides,
  className = "",
}: {
  slides: StorySlide[];
  className?: string;
}) {
  return (
    <section className={`flip-story ${className}`.trim()} aria-label="翻屏故事">
      {slides.map((s) => (
        <article key={s.id} className="flip-slide">
          <span className="flip-decor-stars" aria-hidden="true" />
          <span className="flip-decor-blossom" aria-hidden="true" />
          <div className="flip-slide-inner">
            <div className="flip-slide-copy">
              {s.tag && <span className="flip-slide-tag">{s.tag}</span>}
              <h2 className="flip-slide-title">{s.title}</h2>
              <p className="flip-slide-text">{s.text}</p>
            </div>
            <div className="flip-slide-media">
              <img src={s.imageSrc} alt={s.imageAlt} loading="lazy" decoding="async" />
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

