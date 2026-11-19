import './Konnektik.css';
// Коннектик — маскот Connected. Векторный рисунок перенесён из видео-проекта бренда (robot.py), пять эмоций.
// Анимация постоянная, у каждой эмоции свой цикл (styles.css), в том числе при системной настройке «уменьшить движение».
// Картинка декоративная: смысл экрана несёт текст.

export type Mood = 'hello' | 'explain' | 'wow' | 'think' | 'happy';

const G = '#50C878';
const W = '#FFFFFF';
const D = '#2B2A29';
const LOGO_C = 'M1068.5 277.225C1078.8 287.534 1087.32 298.957 1094.04 311.105C1068.87 304.615 1041.01 311.222 1021.3 330.937C1020.17 332.068 1019.09 333.229 1018.04 334.411C1017 333.229 1015.91 332.068 1014.78 330.937C985.119 301.273 937.024 301.274 907.361 330.937C877.697 360.602 877.698 408.697 907.361 438.36C937.025 468.024 985.12 468.023 1014.78 438.36C1015.91 437.229 1017 436.068 1018.04 434.886C1019.09 436.068 1020.17 437.229 1021.3 438.36C1041.01 458.074 1068.87 464.682 1094.04 458.193C1087.32 470.34 1078.8 481.764 1068.5 492.072C1009.17 551.401 912.977 551.401 853.649 492.072C794.32 432.744 794.32 336.554 853.649 277.225C912.977 217.897 1009.17 217.897 1068.5 277.225Z';
const LOGO_DOT = 'M1101.87 357.793C1116.7 372.625 1116.7 396.673 1101.87 411.504C1087.04 426.336 1062.99 426.336 1048.16 411.504C1033.33 396.673 1033.33 372.625 1048.16 357.793C1062.99 342.961 1087.04 342.961 1101.87 357.793Z';

type Pose = { eyes: 'open' | 'happy' | 'wow'; mouth: 'smile' | 'talk' | 'o' | 'grin'; la: number; ra: number; tilt: number };

const POSES: Record<Mood, Pose> = {
  hello: { eyes: 'happy', mouth: 'grin', la: 12, ra: -150, tilt: 0 },
  explain: { eyes: 'open', mouth: 'talk', la: 12, ra: -95, tilt: -4 },
  wow: { eyes: 'wow', mouth: 'o', la: 40, ra: -40, tilt: 0 },
  think: { eyes: 'open', mouth: 'smile', la: 12, ra: -162, tilt: 7 },
  happy: { eyes: 'happy', mouth: 'smile', la: 150, ra: -150, tilt: 0 },
};

function Eye({ x, kind }: { x: number; kind: Pose['eyes'] }) {
  if (kind === 'happy') return <path d={`M${x - 22} -380Q${x} -414 ${x + 22} -380`} fill="none" stroke={G} strokeWidth={12} strokeLinecap="round" />;
  if (kind === 'wow')
    return (
      <>
        <circle cx={x} cy={-389} r={27} fill="none" stroke={G} strokeWidth={10} />
        <circle cx={x} cy={-389} r={9} fill={G} />
      </>
    );
  return <rect x={x - 19} y={-418} width={38} height={58} rx={19} fill={G} />;
}

function Mouth({ kind }: { kind: Pose['mouth'] }) {
  if (kind === 'talk') return <ellipse className="kn-talk" cx={0} cy={-322} rx={22} ry={15} fill={G} />;
  if (kind === 'o') return <ellipse cx={0} cy={-320} rx={16} ry={20} fill={G} />;
  if (kind === 'grin') return <path d="M-40 -334Q0 -290 40 -334Z" fill={G} />;
  return <path d="M-30 -330Q0 -306 30 -330" fill="none" stroke={G} strokeWidth={9} strokeLinecap="round" />;
}

export function Konnektik({ mood, size = 120, className = '' }: { mood: Mood; size?: number; className?: string }) {
  const p = POSES[mood];
  return (
    <svg
      className={`konnektik konnektik-${mood} ${className}`.trim()}
      viewBox="-210 -590 420 690"
      width={(size * 420) / 690}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <ellipse className="kn-shadow" cx={0} cy={70} rx={120} ry={18} fill="#000" fillOpacity={0.12} />
      <g className="kn-body">
        <g transform={`rotate(${p.la} -122 -170)`}>
          <g className="kn-arm-left">
            <rect x={-146} y={-180} width={48} height={150} rx={24} fill={W} stroke={D} strokeWidth={6} />
            <circle cx={-122} cy={-24} r={28} fill={W} stroke={D} strokeWidth={6} />
          </g>
        </g>
        <g transform={`rotate(${p.ra} 122 -170)`}>
          <g className="kn-arm-right">
            <rect x={98} y={-180} width={48} height={150} rx={24} fill={W} stroke={D} strokeWidth={6} />
            <circle cx={122} cy={-24} r={28} fill={W} stroke={D} strokeWidth={6} />
          </g>
        </g>
        <rect x={-110} y={-200} width={220} height={200} rx={64} fill={W} stroke={D} strokeWidth={6} />
        <g transform="translate(0 -102) scale(.36) translate(-955 -385)">
          <path fill={D} fillRule="evenodd" clipRule="evenodd" d={LOGO_C} />
          <path fill={G} fillRule="evenodd" clipRule="evenodd" d={LOGO_DOT} />
        </g>
        <rect x={-30} y={-226} width={60} height={34} rx={10} fill={D} />
        <g transform={`rotate(${p.tilt} 0 -230)`}>
          <g className="kn-head">
            <path d="M0 -480V-528" stroke={D} strokeWidth={12} strokeLinecap="round" />
            <circle className="kn-ring" cx={0} cy={-542} r={34} fill="none" stroke={G} strokeWidth={5} opacity={0.6} />
            <circle cx={0} cy={-542} r={21} fill={G} />
            <rect x={-170} y={-484} width={340} height={260} rx={96} fill={W} stroke={D} strokeWidth={6} />
            <rect x={-136} y={-450} width={272} height={190} rx={70} fill={D} />
            <g className="kn-eyes">
              <Eye x={-58} kind={p.eyes} />
              <Eye x={58} kind={p.eyes} />
            </g>
            <Mouth kind={p.mouth} />
            <circle cx={-150} cy={-354} r={16} fill={D} />
            <circle cx={150} cy={-354} r={16} fill={D} />
          </g>
        </g>
      </g>
    </svg>
  );
}

// Какую эмоцию показывать вместо прежних Lottie-стикеров (утки и т. п.).
const STICKER_MOOD: Record<string, Mood> = {
  'duck_out': 'think',          // пустые списки: «пока ничего нет»
  'skeleton': 'think',
  'duck_SECURITY': 'explain',   // вход
  'duck_analitic': 'explain',   // аналитика
  'duck_small': 'happy',        // успешная запись
  'duck_money': 'happy',
  'duck_wallet': 'happy',
  'duck_social_out': 'hello',
  'duck_meteor_out': 'wow',
  'booking': 'hello',
  'notifications': 'explain',
  'favorites': 'happy',
};

export function moodForSticker(src: string): Mood {
  const name = src.split('/').pop()?.replace(/\.json$/, '') ?? '';
  return STICKER_MOOD[name] ?? 'think';
}

/** Прямая замена прежнего LottieIcon: тот же интерфейс, вместо утки — Коннектик. */
export function KonnektikSticker({ src, size = 120 }: { src: string; size?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', height: size }}>
      <Konnektik mood={moodForSticker(src)} size={size} />
    </div>
  );
}
