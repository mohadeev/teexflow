import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createScriptFor } from '@/lib/data'
import { IMPORT_EXTENSIONS, IMPORT_MAX_BYTES, ImportError, fileToScript } from '@/lib/importText'

// Creates a script from an uploaded PDF or text file (form field "file").
export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ ok: false, error: 'Sign in to import files.' }, { status: 401 })

  const file = (await request.formData().catch(() => null))?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: 'No file was uploaded.' }, { status: 400 })
  if (!IMPORT_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))) {
    return NextResponse.json({ ok: false, error: 'Upload a PDF or a text file (.txt, .md).' }, { status: 400 })
  }
  if (file.size > IMPORT_MAX_BYTES) {
    return NextResponse.json({ ok: false, error: 'That file is too big — the limit is 15 MB.' }, { status: 413 })
  }

  let script
  try {
    script = await fileToScript(file.name, new Uint8Array(await file.arrayBuffer()))
  } catch (err) {
    const message = err instanceof ImportError ? err.message : 'This file couldn’t be read.'
    return NextResponse.json({ ok: false, error: message }, { status: 422 })
  }

  const res = await createScriptFor(userId, script.title, script.content)
  if (!res.ok) return NextResponse.json(res, { status: res.code === 'limit' ? 403 : 500 })
  revalidatePath('/dashboard')
  return NextResponse.json(res)
}
