'use client'

import { Script } from '@/lib/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
export default function ScriptList({ scripts }: { scripts: Script[] }) {
  const router = useRouter()

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this script?')) return
    const { error } = await supabase.from('scripts').delete().eq('id', id)
    if (error) alert('Error deleting')
    else router.refresh()
  }

  const handleStartSession = async (scriptId: string) => {
  try {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    console.log('Creating session with:', { scriptId, roomCode });

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        script_id: scriptId,
        room_code: roomCode,
        status: 'idle',
        current_section_index: 0,
        scroll_speed: 30,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      alert(`Error: ${error.message} (code: ${error.code})`);
      return;
    }

    console.log('Session created:', data);
    router.push(`/session/${roomCode}/controller`);
  } catch (err) {
    console.error('Unexpected error:', err);
    alert('An unexpected error occurred. Check the console for details.');
  }
};

  if (scripts.length === 0) {
    return (
      <div className="text-center py-20 text-white/40">
        <p className="text-lg">No scripts yet.</p>
        <p className="text-sm">Create your first script to get started.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {scripts.map((script) => (
        <div
          key={script.id}
          className="bg-[#121316] border border-white/5 rounded-2xl p-6 flex items-center justify-between hover:border-white/10 transition"
        >
          <div>
            <h3 className="text-xl font-semibold">{script.title}</h3>
            <p className="text-sm text-white/40">
              {script.sections?.length || 0} sections · {new Date(script.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleStartSession(script.id)}
              className="text-sm bg-[#0A84FF] text-white px-4 py-2 rounded-xl hover:bg-[#0A84FF]/90 transition"
            >
              Start Session
            </button>
            <Link
              href={`/dashboard/scripts/${script.id}/edit`}
              className="text-sm text-white/60 hover:text-white px-3 py-2 rounded-xl border border-white/5 hover:border-white/20 transition"
            >
              Edit
            </Link>
            <button
              onClick={() => handleDelete(script.id)}
              className="text-sm text-red-400 hover:text-red-300 px-3 py-2 rounded-xl border border-white/5 hover:border-red-500/20 transition"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}