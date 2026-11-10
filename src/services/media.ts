import { File } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';
import { fetchApi } from './api';
import type { CustomerMedia } from '../types';

const typeByExtension: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  heic: 'image/heic', heif: 'image/heif', gif: 'image/gif', mp4: 'video/mp4',
  mov: 'video/quicktime', webm: 'video/webm',
};

export async function uploadMedia(leadId: string, asset: ImagePickerAsset, purpose?: 'inspection' | 'licence', recorded = false) {
  const file = new File(asset.uri);
  const name = asset.fileName || file.name;
  const contentType = asset.mimeType || typeByExtension[name.split('.').at(-1)?.toLowerCase() || ''];
  if (!contentType) throw new Error('Choose a supported photo or video.');
  if (contentType.startsWith('video/') && (asset.duration ? asset.duration > 180000 : !recorded)) {
    throw new Error('Choose a video of three minutes or less.');
  }
  const path = `/leads/${encodeURIComponent(leadId)}/media`;
  const prepared = await fetchApi<{ id: string; upload: { chunk_size: number } }>(path, {
    method: 'POST',
    body: JSON.stringify({
      name, content_type: contentType, size: file.size,
      duration_ms: asset.duration || undefined, visibility: purpose ? 'private' : undefined, purpose, recorded,
    }),
  });
  if (!prepared.data) throw new Error('Unable to start the upload.');
  const mediaPath = `${path}/${prepared.data.id}`;
  const size = file.size;
  const handle = file.open();
  try {
    for (let offset = 0; offset < size;) {
      const bytes = await handle.readBytes(Math.min(size - offset, prepared.data.upload.chunk_size));
      if (!bytes.length) throw new Error('The file became unavailable during upload.');
      const chunk = await fetchApi<{ next_offset: number }>(`${mediaPath}/content?offset=${offset}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: bytes,
      });
      if (chunk.data?.next_offset !== offset + bytes.length) throw new Error('The upload could not be confirmed.');
      offset = chunk.data.next_offset;
    }
  } finally {
    handle.close();
  }
  const result = await fetchApi<CustomerMedia>(`${mediaPath}/complete`, { method: 'POST' });
  if (!result.data) throw new Error('The upload could not be confirmed.');
  return result.data;
}
