export function getNodeFocusViewport(position, size, currentZoom, area) {
  const zoom = Math.max(0.1, Math.min(currentZoom, Math.max(1, area.width - 48) / size.width));
  const availableHeight = Math.max(1, area.bottom - area.top);
  return {
    x: area.width / 2 - (position.x + size.width / 2) * zoom,
    y: area.top + Math.max(0, (availableHeight - size.height * zoom) / 2) - position.y * zoom,
    zoom,
  };
}
