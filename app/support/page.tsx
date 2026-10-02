/* oxlint-disable next/no-html-link-for-pages -- Static exports use document navigation. */
import { PolicyPage } from '@/components/policy-page';
import { pageMetadata } from '@/lib/site';

export const metadata = {
  ...pageMetadata(
    'Support | Quiet FX',
    'Get help with Quiet FX UI sound effects, browser audio, exports, the ChatGPT plugin, and privacy requests.',
    '/support',
  ),
  title: 'Support | Quiet FX',
};

export default function SupportPage() {
  return (
    <PolicyPage
      title="A little help."
      intro="Support for Quiet FX, the sound studio, and the ChatGPT plugin."
    >
      <h2>Contact Filipe</h2>
      <p>
        Quiet FX is an independent, open-source project maintained by Filipe
        Soares. For support, privacy questions, or a security report, email:
      </p>
      <a className="policy-contact" href="mailto:hey@filipe.work">
        <strong>hey@filipe.work</strong>
        <br />
        Private support and privacy requests
      </a>
      <p>
        Include the feature you used, your browser and device, what happened,
        and steps to reproduce the issue. For plugin questions, mention whether
        you used ChatGPT or Codex. Please omit passwords, API keys, private
        conversation transcripts, and confidential project files. Responses are
        handled by the maintainer; there is no guaranteed response time.
      </p>
      <h2>Report a bug or suggest an improvement</h2>
      <p>
        Use{' '}
        <a href="https://github.com/filipeafns/quiet-fx/issues">
          GitHub Issues
        </a>{' '}
        for public bug reports and feature requests. GitHub issues are public,
        so send personal information and security reports by email instead.
      </p>
      <h2>Using Quiet FX</h2>
      <p>
        Quiet FX is a developer tool for adding gentle sound effects to
        interfaces. Browse 72 procedural sounds, preview interactions, and
        export audio or use the{' '}
        <a href="https://github.com/filipeafns/quiet-fx#readme">
          JavaScript library and documentation
        </a>
        . The plugin lets you search by interaction or mood, combine sounds from
        collections, and prepare selected sounds for a coding project.
      </p>
      <ul>
        <li>
          <strong>No sound?</strong> Tap or click a preview first. Browsers
          require a user gesture before playback. Check device volume, browser
          sound permissions, and mute settings.
        </li>
        <li>
          <strong>Download unavailable in ChatGPT?</strong> File handling varies
          by host. Use the picker’s copyable integration instructions or open
          the <a href="/studio">website studio</a>. Copying text does not
          transfer audio files or edit a project.
        </li>
        <li>
          <strong>Private plugin access?</strong> A private sandbox connection
          is available only to its authorized users. A website visit or package
          upload does not install or publish the plugin.
        </li>
        <li>
          <strong>Commercial projects?</strong> Original Quiet FX code and sound
          recipes use the <a href="/licenses/QUIET-MIT.txt">MIT License</a>.
          Keep the included license notice with redistributed materials. The
          website’s MP3 encoder has{' '}
          <a href="/licenses/MP3-NOTICE.txt">separate notices</a>.
        </li>
      </ul>
      <h2>Privacy and terms</h2>
      <p>
        Read the <a href="/privacy">privacy policy</a> for data handling and
        your controls, and the <a href="/terms">terms of service</a> for use of
        the hosted service.
      </p>
    </PolicyPage>
  );
}
