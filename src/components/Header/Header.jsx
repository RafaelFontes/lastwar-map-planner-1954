import { useAuth } from '../../contexts/AuthContext';

export function Header({ scale, onZoom }) {
  const { user, loading, signInWithDiscord, signOut, isSupabaseConfigured } = useAuth();
  const zoomLevel = Math.round(scale * 100);

  return (
    <header className="bg-discord-not-quite-black text-white px-8 py-4 flex justify-between items-center shrink-0 border-b border-discord-lighter-gray max-md:flex-col max-md:gap-3 max-md:px-4 max-md:py-3">
      <h1 className="text-2xl font-semibold m-0 max-md:text-xl">Last War Project Explorer</h1>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <button
            className="bg-discord-lighter-gray text-discord-text border-none w-9 h-9 rounded font-bold cursor-pointer transition-all duration-200 flex items-center justify-center hover:bg-discord-lightest-gray hover:scale-105 text-xl"
            onClick={() => onZoom('out')}
            title="Zoom Out"
          >
            −
          </button>
          <span className="text-discord-text-secondary text-sm min-w-[50px] text-center font-medium">{zoomLevel}%</span>
          <button
            className="bg-discord-lighter-gray text-discord-text border-none w-9 h-9 rounded font-bold cursor-pointer transition-all duration-200 flex items-center justify-center hover:bg-discord-lightest-gray hover:scale-105 text-xl"
            onClick={() => onZoom('in')}
            title="Zoom In"
          >
            +
          </button>
          <button
            className="bg-discord-lighter-gray text-discord-text border-none h-9 px-3 rounded text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-discord-lightest-gray hover:scale-105"
            onClick={() => onZoom('reset')}
            title="Reset Zoom"
          >
            Reset
          </button>
        </div>
        {isSupabaseConfigured && (
          <div className="flex items-center gap-3">
            {loading ? (
              <span className="text-discord-text-muted text-sm">...</span>
            ) : user ? (
              <>
                <span className="text-discord-text text-sm font-medium">
                  {user.user_metadata?.full_name || user.email}
                </span>
                <button
                  className="bg-discord-lighter-gray text-discord-text border border-discord-lightest-gray px-4 py-2 rounded text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-discord-lightest-gray"
                  onClick={signOut}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                className="bg-discord-blurple text-white border-none px-4 py-2 rounded text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-discord-blurple-hover"
                onClick={signInWithDiscord}
              >
                Sign in with Discord
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
