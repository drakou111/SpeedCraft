type TooltipProps = {
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export function Tooltip({ children, style }: TooltipProps) {
  return (
    <div className="tooltip" style={style}>
      <div className="tooltip-content">
        {children}
      </div>
    </div>
  );
}
