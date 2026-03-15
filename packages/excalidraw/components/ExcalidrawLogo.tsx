import "./ExcalidrawLogo.scss";

// OneShot logo: thick ring with two diagonal notches
const LogoIcon = () => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="ExcalidrawLogo-icon"
  >
    <defs>
      <mask id="oneshot-notch-mask">
        <rect width="100" height="100" fill="white" />
        {/* Upper-left notch at ~10 o'clock */}
        <rect
          x="3"
          y="25"
          width="30"
          height="14"
          fill="black"
          transform="rotate(30, 18, 32)"
        />
        {/* Lower-right notch at ~4 o'clock */}
        <rect
          x="67"
          y="61"
          width="30"
          height="14"
          fill="black"
          transform="rotate(30, 82, 68)"
        />
      </mask>
    </defs>
    <path
      fillRule="evenodd"
      d="M50,3 A47,47,0,1,1,50,97 A47,47,0,1,1,50,3 Z M50,23 A27,27,0,1,0,50,77 A27,27,0,1,0,50,23 Z"
      fill="currentColor"
      mask="url(#oneshot-notch-mask)"
    />
  </svg>
);

type LogoSize = "xs" | "small" | "normal" | "large" | "custom" | "mobile";

interface LogoProps {
  size?: LogoSize;
  withText?: boolean;
  style?: React.CSSProperties;
  isNotLink?: boolean;
}

export const ExcalidrawLogo = ({
  style,
  size = "small",
}: LogoProps) => {
  return (
    <div className={`ExcalidrawLogo is-${size}`} style={style}>
      <LogoIcon />
    </div>
  );
};
