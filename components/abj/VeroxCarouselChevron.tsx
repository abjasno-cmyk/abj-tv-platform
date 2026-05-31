import { VeroxIcon } from "@/components/abj/VeroxIcon";

type VeroxCarouselChevronProps = {
  direction: "left" | "right";
  className?: string;
};

export function VeroxCarouselChevron({ direction, className = "" }: VeroxCarouselChevronProps) {
  return (
    <VeroxIcon
      name="sipka"
      mirror={direction === "left"}
      className={`h-[clamp(14px,3vw,20px)] w-auto shrink-0 ${className}`.trim()}
    />
  );
}
