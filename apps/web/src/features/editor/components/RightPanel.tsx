export function RightPanel() {
  return (
    <aside className="w-96 bg-surface-container border-l border-surface-container-highest flex flex-col z-30">
      <div className="p-8 border-b border-surface-container-highest">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-headline font-bold text-xl tracking-tight">Node Settings</h2>
          <button className="p-2 hover:bg-surface-container-highest rounded-full text-zinc-500 flex items-center justify-center">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
        <p className="text-sm text-zinc-400 font-body">Configure the logic for Fetch Inventory node.</p>
      </div>
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2 block">Connection</span>
            <div className="relative">
              <select className="w-full bg-surface-container-lowest border-none rounded-xl py-3 px-4 text-on-surface focus:ring-1 focus:ring-primary appearance-none outline-none">
                <option>Production Postgres</option>
                <option>Staging Redshift</option>
                <option>Development Local</option>
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">expand_more</span>
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2 block">SQL Query</span>
            <textarea className="w-full bg-surface-container-lowest border-none rounded-xl py-3 px-4 text-on-surface focus:ring-1 focus:ring-primary font-mono text-sm resize-none outline-none" placeholder="SELECT * FROM inventory WHERE status = 'low'" rows={6}></textarea>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-container-low p-4 rounded-xl">
            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Execution Time</p>
            <p className="text-lg font-headline font-bold">1.2s</p>
          </div>
          <div className="bg-surface-container-low p-4 rounded-xl">
            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Row Count</p>
            <p className="text-lg font-headline font-bold">4.2k</p>
          </div>
        </div>
        <div className="space-y-4 pt-4 border-t border-surface-container-highest">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-on-surface">Enable Caching</p>
              <p className="text-xs text-zinc-500">Persist results for 60m</p>
            </div>
            <button className="w-12 h-6 bg-primary rounded-full relative">
              <span className="absolute right-1 top-1 w-4 h-4 bg-on-primary rounded-full"></span>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-on-surface">Retry on Failure</p>
              <p className="text-xs text-zinc-500">3 attempts max</p>
            </div>
            <button className="w-12 h-6 bg-surface-container-highest rounded-full relative">
              <span className="absolute left-1 top-1 w-4 h-4 bg-zinc-500 rounded-full"></span>
            </button>
          </div>
        </div>
      </div>
      <div className="p-8 bg-surface-container-low">
        <button className="w-full bg-surface-container-highest hover:bg-zinc-700 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-sm">play_arrow</span>
          Test Node
        </button>
      </div>
    </aside>
  );
}
