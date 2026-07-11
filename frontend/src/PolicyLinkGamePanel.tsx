type PolicyLinkGamePanelProps = {
  onBack: () => void;
};

const GAME_SRC = `${import.meta.env.BASE_URL}games/policy-link/index.html`;

export function PolicyLinkGamePanel({ onBack }: PolicyLinkGamePanelProps) {
  return (
    <section className="policy-link-game-panel" aria-label="资助政策连连看">
      <iframe
        className="policy-link-game-frame"
        title="砺志励行团 资助政策连连看"
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
