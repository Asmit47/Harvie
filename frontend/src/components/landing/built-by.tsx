const GITHUB = 'https://github.com/Asmit47/Harvie';

export function BuiltBy() {
  return (
    <section className="px-6 py-8 text-center" aria-label="Builder">
      <p className="text-sm text-[#A1A4AB]">
        Built by <span className="text-[#EDEDEF]">Asmit Kaushal</span>, an AI builder in India.
      </p>
      <p className="mt-2 font-mono text-[12.5px] text-[#6C7079]">
        <a className="transition-colors hover:text-[#EDEDEF]" href="https://harvie.me">
          harvie.me
        </a>
        <span aria-hidden="true"> · </span>
        <a className="transition-colors hover:text-[#EDEDEF]" href={GITHUB} rel="noreferrer" target="_blank">
          GitHub
        </a>
      </p>
    </section>
  );
}
