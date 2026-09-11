import { PageDoodles } from "@/components/site/page-doodles";

export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-paper" />
      <div
        className="absolute inset-0 opacity-45"
        style={{
          background:
            "radial-gradient(1200px 700px at 12% -10%, rgba(0,98,65,0.2), transparent 58%), radial-gradient(900px 600px at 110% 20%, rgba(0,76,50,0.16), transparent 52%), radial-gradient(800px 500px at 50% 110%, rgba(26,143,92,0.12), transparent 55%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.16] mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.05 0 0 0 0 0.22 0 0 0 0 0.14 0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
          )}")`,
        }}
      />
      <PageDoodles />
    </div>
  );
}
