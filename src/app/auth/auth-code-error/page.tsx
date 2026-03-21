export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const resolvedParams = await searchParams;
  const errorMessage = resolvedParams.message || "Unknown error occurred";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">🚨</span>
        </div>
        <h1 className="text-2xl font-bold mb-4">Authentication Failed</h1>
        <p className="text-red-400 font-mono text-sm break-words bg-black p-4 rounded-lg border border-red-500/20">
          {errorMessage}
        </p>
        <p className="mt-8 text-zinc-400 text-sm">
          Please capture this screen and show it to the AI agent.
        </p>
        <a 
          href="/" 
          className="mt-6 inline-block w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
}
