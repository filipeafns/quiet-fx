/* oxlint-disable next/no-html-link-for-pages -- Static exports use document navigation. */
import { PolicyPage } from '@/components/policy-page';
import { pageMetadata } from '@/lib/site';

export const metadata = {
  ...pageMetadata(
    'Privacy policy | Quiet FX',
    'How Quiet FX handles website analytics, locally saved sound settings, ChatGPT plugin requests, support correspondence, and privacy choices.',
    '/privacy',
  ),
  title: 'Privacy policy | Quiet FX',
};

export default function PrivacyPage() {
  return (
    <PolicyPage
      title="Privacy policy."
      intro="What Quiet FX processes, why it is needed, and the choices you have."
    >
      <h2>Who is responsible</h2>
      <p>
        Filipe Soares maintains Quiet FX and is responsible for the data
        practices described here. This policy covers quietfx.dev and the Quiet
        FX plugin, including its private preview. Contact{' '}
        <a href="mailto:hey@filipe.work">hey@filipe.work</a> with privacy
        questions or requests.
      </p>
      <h2>The website and sound studio</h2>
      <p>
        Sound previews and audio exports are generated on your device. The
        studio stores sound settings in browser local storage so they can be
        restored. Quiet FX does not request microphone access, upload your
        audio, or inspect your project files.
      </p>
      <p>
        The production website uses PostHog for product analytics when analytics
        is enabled. Events include page visits and exits, referral origins,
        browser/device and session information, a pseudonymous identifier, and
        actions such as opening setup, copying setup instructions, changing
        studio views, and starting a sound download. Download events can include
        sound IDs, counts, formats, and sound settings. The network provider
        also receives the IP address needed to handle a request.
      </p>
      <p>
        These events help understand which features work and where the website
        can improve. Analytics events do not include copied code, integration
        prompts, search input, file contents, or hover playback. Query strings
        and fragments are removed from outgoing analytics URL fields. Person
        profiles, session recording, automatic interaction capture, surveys,
        heatmaps, performance capture, and exception capture are disabled. A
        pseudonymous identifier is stored in local storage; it is not a
        name-based account.
      </p>
      <h2>The ChatGPT plugin</h2>
      <p>
        ChatGPT sends the tool arguments needed for a request, such as a search
        phrase, interaction or mood filters, a collection ID, selected sound
        IDs, and sound settings. The server uses them to search the catalog and
        return results or an export manifest. It does not require your full
        conversation, contacts, payment details, or project files. Do not put
        sensitive personal information in sound searches.
      </p>
      <p>
        The picker can store your selected sounds and settings in browser
        storage or the host’s widget state. It sends selection context back to
        ChatGPT when you use the picker so the conversation can work with your
        choices. Audio and ZIP files are generated in the browser; when the host
        handles a download, the file is passed to that host.
      </p>
      <p>
        The current private preview uses OpenAI Sites authentication. The
        hosting platform checks access, and the server receives an authenticated
        user identifier to enforce that access. The application does not create
        a separate user database or store tool request histories. The plugin
        does not include PostHog or a separate usage-tracking SDK.
      </p>
      <h2>Support messages</h2>
      <p>
        If you email us, we receive your email address, message, and any
        attachments you choose to send. We use these to respond, diagnose
        problems, and handle privacy or security requests. GitHub Issues are
        public and are governed by GitHub’s own policies.
      </p>
      <h2>Service providers and sharing</h2>
      <p>
        Vercel hosts quietfx.dev; PostHog processes the website analytics
        through its US service; OpenAI provides ChatGPT and the Sites-hosted
        plugin preview; GitHub hosts the source repository and public issues;
        and email providers deliver support correspondence. These services may
        process technical information such as IP addresses, request times,
        authentication data, and operational logs for delivery, security, and
        reliability.
      </p>
      <p>
        Quiet FX does not sell personal data or use it for targeted advertising.
        Information may be disclosed when legally required or when necessary to
        investigate abuse and protect the service. Service providers may process
        data outside your country, including in the United States. Their
        independent practices are described in the{' '}
        <a href="https://vercel.com/legal/privacy-notice">
          Vercel privacy notice
        </a>
        , <a href="https://posthog.com/privacy">PostHog privacy policy</a>,{' '}
        <a href="https://openai.com/policies/privacy-policy/">
          OpenAI privacy policy
        </a>
        , and{' '}
        <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">
          GitHub privacy statement
        </a>
        .
      </p>
      <h2>Retention</h2>
      <ul>
        <li>
          <strong>Sound settings and selections:</strong> browser storage
          remains until you clear the relevant site data, the browser removes
          it, or you reset or replace it. Host widget state follows the host’s
          conversation retention.
        </li>
        <li>
          <strong>Plugin tool inputs:</strong> the application processes them
          for the request and does not save a request-history database. This
          does not delete the conversation or operational records held by OpenAI
          or the hosting provider.
        </li>
        <li>
          <strong>Website analytics:</strong> events remain under the PostHog
          project’s retention and deletion settings. Quiet FX does not currently
          impose a separate automatic expiry in its application. Clearing
          browser storage does not delete events already received by PostHog.
        </li>
        <li>
          <strong>Support and provider logs:</strong> correspondence may remain
          in the support mailbox until deleted; hosting, email, security logs
          and backups follow the relevant provider’s retention. Quiet FX does
          not promise a fixed deletion date for records it cannot control.
          Contact us for the applicable current period or to request deletion of
          data within our control.
        </li>
      </ul>
      <h2>Your controls and requests</h2>
      <ul>
        <li>
          Enable your browser’s Do Not Track setting to opt out of the website’s
          PostHog analytics. You can also block requests to{' '}
          <code>us.i.posthog.com</code>. Sound playback and exports do not
          depend on analytics.
        </li>
        <li>
          Clear quietfx.dev site data to remove stored studio settings and
          analytics identifiers. For plugin selection state, also clear the
          plugin origin’s data or use the host’s controls. A new analytics
          identifier may be created on a later visit unless analytics is
          blocked.
        </li>
        <li>
          Use ChatGPT’s controls to disconnect the plugin and manage
          conversations. Disconnecting prevents future connected use; it does
          not automatically erase past conversation data.
        </li>
        <li>
          Email <a href="mailto:hey@filipe.work">hey@filipe.work</a> to request
          access, correction, deletion, or to object to processing where
          applicable law provides those rights. We may ask for proportionate
          information to verify a request, but never your password or API key.
          You may also contact your local privacy regulator.
        </li>
      </ul>
      <p>
        Where privacy law requires a legal basis, necessary request processing
        and support are used to provide the service you request; proportionate
        service improvement and security rely on legitimate interests where
        permitted; and consent is used where required. This policy does not
        replace any consent required by law.
      </p>
      <h2>Children and changes</h2>
      <p>
        Quiet FX is not directed to children under 13 and does not knowingly
        seek their personal information. Contact us if you believe a child has
        provided personal information. We will update this page when these
        practices change and show the effective date above.
      </p>
    </PolicyPage>
  );
}
