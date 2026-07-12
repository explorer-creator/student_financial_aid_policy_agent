type PolicyPostmanPanelProps = {
  onBack: () => void;
};

const GAME_SRC = `${import.meta.env.BASE_URL}games/policy-postman/index.html?v=2`;

export function PolicyPostmanPanel({ onBack }: PolicyPostmanPanelProps) {
  return (
    <section className="policy-link-game-panel" aria-label="资助小邮差">
      <iframe
        className="policy-link-game-frame"
        title="资助小邮差"
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
