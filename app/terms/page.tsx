/* oxlint-disable next/no-html-link-for-pages -- Static exports use document navigation. */
import { PolicyPage } from '@/components/policy-page';
import { pageMetadata } from '@/lib/site';

export const metadata = {
  ...pageMetadata(
    'Terms of service | Quiet FX',
    'Terms for using the Quiet FX website and plugin, including MIT-licensed sounds, exports, acceptable use, service availability, and support.',
    '/terms',
  ),
  title: 'Terms of service | Quiet FX',
};

export default function TermsPage() {
  return (
    <PolicyPage
      title="Terms of service."
      intro="Simple terms for using the Quiet FX website and plugin."
    >
      <h2>The service</h2>
      <p>
        Quiet FX is maintained by Filipe Soares. It offers procedural UI sound
        effects, a browser studio, an open-source JavaScript library, and a
        plugin for searching, previewing, selecting, and preparing sounds for
        projects. By using the hosted service, you agree to these terms. If you
        do not agree, stop using the hosted service. Open-source license rights
        remain separate.
      </p>
      <p>
        The current offering is free. There are no plugin purchases,
        subscriptions, or premium checkout tools. Access to a private preview is
        limited to authorized users. A package upload does not mean the plugin
        has been approved or published in a directory.
      </p>
      <h2>Sounds, code, and licenses</h2>
      <p>
        Original Quiet FX code and procedural sound recipes are available under
        the <a href="/licenses/QUIET-MIT.txt">MIT License</a>, which allows
        personal and commercial use subject to its terms. Keep the copyright and
        permission notice with copies or substantial portions of the licensed
        materials, including redistributed sound packs. Selected-sound exports
        include the applicable notice.
      </p>
      <p>
        Third-party components keep their own licenses. In particular, the
        website’s optional MP3 encoder has{' '}
        <a href="/licenses/MP3-NOTICE.txt">
          separate license and source notices
        </a>
        . These service terms do not restrict rights already granted under an
        open-source license or replace third-party license obligations. Quiet FX
        does not claim rights in your independent project merely because you use
        its sounds.
      </p>
      <h2>Use responsibly</h2>
      <p>
        Use the service lawfully. Do not disrupt it, send abusive automated
        traffic, attempt unauthorized access, bypass private-preview access
        checks, or submit content you do not have permission to share. Do not
        include credentials or sensitive personal data in tool arguments or
        public bug reports. Use a comfortable listening volume and respect the
        sound preferences of people using your project.
      </p>
      <h2>Exports and project integration</h2>
      <p>
        Browser, device, and host capabilities affect sound playback, clipboard
        access, and file downloads. Playback may require a click or tap.
        Copyable integration instructions transfer text; they do not copy audio
        files into a project or authorize file changes. The Quiet FX catalog
        tools do not write to or delete files in your project. Review generated
        instructions and any changes proposed by a separate coding assistant
        before using them.
      </p>
      <h2>Availability and responsibility</h2>
      <p>
        The service is provided as available, without a promise of uninterrupted
        access, compatibility with every device, or a particular result.
        Features may change, and maintenance or abuse prevention may temporarily
        limit access. Download and keep copies of materials you rely on.
      </p>
      <p>
        To the extent permitted by applicable law, the service and licensed
        materials are provided without warranties, and the maintainer is not
        liable for losses arising from their use. Nothing in these terms
        excludes liability or consumer rights that applicable law does not allow
        to be excluded. The MIT License states the warranty and liability terms
        for the open-source materials.
      </p>
      <h2>Privacy and other services</h2>
      <p>
        The <a href="/privacy">privacy policy</a> explains website analytics,
        local storage, plugin processing, providers, and your controls. ChatGPT,
        Codex, GitHub, hosting services, and other tools you choose to use have
        their own terms and policies. Quiet FX is an independent project and
        does not imply endorsement by those providers.
      </p>
      <h2>Updates and contact</h2>
      <p>
        Updates to these terms will appear here with a revised date and apply
        prospectively. They do not revoke rights already granted under the MIT
        License. For questions or concerns, use the{' '}
        <a href="/support">support page</a> or email{' '}
        <a href="mailto:hey@filipe.work">hey@filipe.work</a>.
      </p>
    </PolicyPage>
  );
}
