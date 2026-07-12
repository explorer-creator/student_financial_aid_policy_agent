type PolicyAudienceMatchPanelProps = {
  onBack: () => void;
};

const GAME_SRC = `${import.meta.env.BASE_URL}games/policy-match/index.html?v=2`;

export function PolicyAudienceMatchPanel({ onBack }: PolicyAudienceMatchPanelProps) {
  return (
    <section className="policy-link-game-panel" aria-label="政策连桥">
      <iframe
        className="policy-link-game-frame"
        title="政策连桥"
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
