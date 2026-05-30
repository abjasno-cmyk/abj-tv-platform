type VeroxCarouselChevronProps = {
  direction: "left" | "right";
  className?: string;
};

export function VeroxCarouselChevron({ direction, className = "" }: VeroxCarouselChevronProps) {
  return (
    <svg
      viewBox="0 0 24 40"
      aria-hidden="true"
      className={`h-10 w-6 shrink-0 ${className}`.trim()}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {direction === "left" ? (
        <path d="M20 4 L6 20 L20 36" stroke="#F37021" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M4 4 L18 20 L4 36" stroke="#F37021" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}
