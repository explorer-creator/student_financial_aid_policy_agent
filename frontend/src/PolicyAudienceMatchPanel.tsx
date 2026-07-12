type PolicyAudienceMatchPanelProps = {
  onBack: () => void;
};

const GAME_SRC = `${import.meta.env.BASE_URL}games/policy-match/index.html`;

export function PolicyAudienceMatchPanel({ onBack }: PolicyAudienceMatchPanelProps) {
  return (
    <section className="policy-link-game-panel" aria-label="政策适合对象连连看">
      <iframe
        className="policy-link-game-frame"
        title="政策 · 适合对象连连看"
        src={GAME_SRC}
        loading="lazy"
      />
      <p className="tools-back-hint policy-link-game-back">
        <button type="button" className="text-link" onClick={onBack}>
          ← 返回政策问答
        </button>
      </p>
    </section>
  );
}
