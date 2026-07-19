// Tasarımdaki icon sistemi: ham SVG path string'i currentColor ile boyanır.
export default function Icon({ path, size = 16, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flex: "none", ...style }}
      dangerouslySetInnerHTML={{ __html: path }} />
  );
}
