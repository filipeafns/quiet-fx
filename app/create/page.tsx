import { SoundKitStudio } from '@/components/sound-kit-studio';
import { pageMetadata } from '@/lib/site';

export const metadata = pageMetadata(
  'Create a sound kit · Quiet FX',
  'Choose a mood, make a coordinated set of UI sounds, and take the editable code with you.',
  '/create',
);

export default function CreatePage() {
  return <SoundKitStudio />;
}
