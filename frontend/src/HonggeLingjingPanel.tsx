import { INSPIRING_STORIES } from "./honggeLingjingData";
import { FlipScreenStory, type StorySlide } from "./FlipScreenStory";

const AVATAR_SRC = `${import.meta.env.BASE_URL}gdut-avatar.png`;

function LogoSm() {
  return (
    <img className="logo logo-sm" src={AVATAR_SRC} alt="广东工业大学校徽" loading="eager" decoding="async" />
  );
}

type Props = {
  onBack: () => void;
};

export function HonggeLingjingPanel({ onBack }: Props) {
  const splashSrc = `${import.meta.env.BASE_URL}welcome-splash.png`;
  const inspireImages = [
    `${import.meta.env.BASE_URL}inspire-images/inspire-01.png`,
    `${import.meta.env.BASE_URL}inspire-images/inspire-02.png`,
    `${import.meta.env.BASE_URL}inspire-images/inspire-03.png`,
    `${import.meta.env.BASE_URL}inspire-images/inspire-04.png`,
    `${import.meta.env.BASE_URL}inspire-images/inspire-05.png`,
    `${import.meta.env.BASE_URL}inspire-images/inspire-06.png`,
    `${import.meta.env.BASE_URL}inspire-images/inspire-07.png`,
    `${import.meta.env.BASE_URL}inspire-images/inspire-08.png`,
    `${import.meta.env.BASE_URL}inspire-images/inspire-09.png`,
    `${import.meta.env.BASE_URL}inspire-images/inspire-10.png`,
  ];

  return (
    <>
      <div className="chat-slim-header">
        <div className="chat-slim-brand">
          <LogoSm />
          <h1 className="chat-slim-title">砺心立志</h1>
        </div>
      </div>

      <FlipScreenStory
        className="flip-story-compact"
        slides={[
          {
            id: "inspire-intro",
            tag: "模块开头",
            title: "同学，你来了。",
            text:
              "或许此刻的你，正在为生活费发愁，觉得脚下的路走得比别人沉。希望这些故事，能成为你口袋里的火柴——需要时，划亮一根，就能看见前行的路。",
            imageSrc: splashSrc,
            imageAlt: "砺心立志封面",
          },
          ...INSPIRING_STORIES.map<StorySlide>((story, idx) => ({
            id: story.id,
            tag: "人物故事",
            title: `${story.name} · ${story.tagline}`,
            text: story.summary,
            imageSrc: inspireImages[idx] ?? splashSrc,
            imageAlt: `${story.name} 故事配图`,
          })),
          {
            id: "inspire-outro",
            tag: "模块结尾",
            title: "你值得被看见",
            text:
              "他们并非天赋异禀，而是在最难时选择了再坚持一天。苦难不值得被歌颂，但那个在苦难中依然昂着头的你，值得。砺行小助手会一直在这里，陪你走过这段上坡路。",
            imageSrc: splashSrc,
            imageAlt: "砺心立志结尾页",
          },
        ]}
      />

      <p className="tools-back-hint">
        <button type="button" className="text-link" onClick={onBack}>
          ← 返回政策问答
        </button>
      </p>
    </>
  );
}
