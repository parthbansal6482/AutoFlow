export function TopHeader() {
  return (
    <header className="bg-surface border-b border-surface-container-highest flex justify-between items-center w-full px-8 h-16 fixed top-0 z-50">
      <div className="flex items-center gap-8">
        <span className="text-xl font-black text-white tracking-tighter font-headline">KINETIC</span>
        <nav className="hidden md:flex items-center gap-6">
          <a className="text-zinc-500 hover:text-zinc-300 transition-colors font-headline tracking-tight font-bold" href="#">Workflows</a>
          <a className="text-zinc-500 hover:text-zinc-300 transition-colors font-headline tracking-tight font-bold" href="#">Assets</a>
          <a className="text-zinc-500 hover:text-zinc-300 transition-colors font-headline tracking-tight font-bold" href="#">Logs</a>
          <a className="text-zinc-500 hover:text-zinc-300 transition-colors font-headline tracking-tight font-bold" href="#">Team</a>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button className="p-2 text-zinc-500 hover:bg-surface-container-highest flex items-center justify-center rounded-full transition-all duration-200">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="p-2 text-zinc-500 hover:bg-surface-container-highest flex items-center justify-center rounded-full transition-all duration-200">
            <span className="material-symbols-outlined">help_outline</span>
          </button>
        </div>
        <button className="bg-primary text-on-primary px-6 py-2 rounded-full font-bold text-sm scale-95 active:scale-90 transition-transform">
          Deploy
        </button>
        <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container-highest">
          <img 
            alt="User Profile" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA2glwyNCpEDJhXC5ZVunatKW9kwoEd386gW1S9_AsZHL3xfnT-_B4YBcOfRO6CD3bESF7oomM2hORhoSuLW73aHfP6tYOmRbda6fXcLSVZKwdbtO8G5bgYotw2kpVLcyoa-aarGRGISzMOgn3NyI4zgBnC28OrbmWCZpXxy_UNrrVAC3N5Rma4H0tjvSjOB-a_nbjBxFLcpViaO0BbNRw-XbeuztpfKQ8k2C9BlmxNnEZ2OQR1oNbkBMG_6gXg4GcCvDdC6-FOh4Ay" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </header>
  );
}
