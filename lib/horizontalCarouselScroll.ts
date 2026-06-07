export type HorizontalCarouselScrollOptions = {
  itemSelector?: string;
  edgeThreshold?: number;
  fallbackStepRatio?: number;
};

function readGapPx(container: HTMLElement): number {
  const styles = getComputedStyle(container);
  const gap = Number.parseFloat(styles.columnGap || styles.gap || "0");
  return Number.isFinite(gap) ? gap : 0;
}

export function getHorizontalCarouselStep(
  container: HTMLElement,
  itemSelector: string,
  fallbackStepRatio = 0.8,
): number {
  const firstItem = container.querySelector<HTMLElement>(itemSelector);
  if (!firstItem) {
    return Math.max(1, container.clientWidth * fallbackStepRatio);
  }

  const gap = readGapPx(container);
  const itemWidth = firstItem.getBoundingClientRect().width;
  if (itemWidth <= 0) {
    return Math.max(1, container.clientWidth * fallbackStepRatio);
  }

  const stride = itemWidth + gap;
  const visibleItems = Math.max(1, Math.floor((container.clientWidth + gap) / stride));
  const scrollItems = Math.max(1, Math.min(visibleItems, visibleItems > 2 ? visibleItems - 1 : 1));
  return scrollItems * stride;
}

export function computeHorizontalCarouselScrollLeft(input: {
  currentLeft: number;
  maxLeft: number;
  step: number;
  direction: -1 | 1;
  edgeThreshold?: number;
}): number {
  const edgeThreshold = input.edgeThreshold ?? 4;
  if (input.maxLeft <= edgeThreshold) return input.currentLeft;

  const atEnd = input.currentLeft >= input.maxLeft - edgeThreshold;
  const atStart = input.currentLeft <= edgeThreshold;

  if (input.direction === 1) {
    if (atEnd) return 0;
    return Math.min(input.maxLeft, input.currentLeft + input.step);
  }

  if (atStart) return input.maxLeft;
  return Math.max(0, input.currentLeft - input.step);
}

export function scrollHorizontalCarousel(
  container: HTMLElement,
  direction: -1 | 1,
  options: HorizontalCarouselScrollOptions = {},
): void {
  const itemSelector = options.itemSelector ?? "[data-carousel-item]";
  const edgeThreshold = options.edgeThreshold ?? 4;
  const maxLeft = Math.max(0, container.scrollWidth - container.clientWidth);
  if (maxLeft <= edgeThreshold) return;

  const step = getHorizontalCarouselStep(container, itemSelector, options.fallbackStepRatio);
  const nextLeft = computeHorizontalCarouselScrollLeft({
    currentLeft: container.scrollLeft,
    maxLeft,
    step,
    direction,
    edgeThreshold,
  });

  container.scrollTo({ left: nextLeft, behavior: "smooth" });
}
