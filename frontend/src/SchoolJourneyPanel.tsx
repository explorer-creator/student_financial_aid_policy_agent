type SchoolJourneyPanelProps = {
  onBack: () => void;
};

const GAME_SRC = `${import.meta.env.BASE_URL}games/school-journey/index.html`;

export function SchoolJourneyPanel({ onBack }: SchoolJourneyPanelProps) {
  return (
    <section className="policy-link-game-panel" aria-label="上学路上的补给站">
      <iframe
        className="policy-link-game-frame"
        title="上学路上的补给站"
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
