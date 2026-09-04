import type { Rendered } from './engine';
export async function mp3Bytes(r: Rendered): Promise<Uint8Array> {
  const { Mp3Encoder } = await import('@breezystack/lamejs');
  const encoder = new Mp3Encoder(1, r.sampleRate, 128),
    pcm = new Int16Array(r.data.length),
    chunks: Uint8Array[] = [];
  for (let i = 0; i < pcm.length; i++) {
    const x = Math.max(-1, Math.min(1, r.data[i]));
    pcm[i] = Math.round(x * (x < 0 ? 32768 : 32767));
  }
  for (let i = 0; i < pcm.length; i += 1152) {
    const bytes = encoder.encodeBuffer(pcm.subarray(i, i + 1152));
    if (bytes.length) chunks.push(Uint8Array.from(bytes));
  }
  const tail = encoder.flush();
  if (tail.length) chunks.push(Uint8Array.from(tail));
  const result = new Uint8Array(chunks.reduce((sum, c) => sum + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
