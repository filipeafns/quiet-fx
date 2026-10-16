'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type SubmitEvent,
  type PointerEvent,
  type KeyboardEvent,
} from 'react';
import {
  ArrowUp,
  Check,
  CheckCheck,
  ChevronRight,
  CircleCheck,
  LayoutGrid,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KitSegments } from '@/components/ui/kit-controls';
import type { KitRole } from '@/lib/audio/kits';
import './kit-examples.css';

export interface KitExamplesProps {
  onSound: (role: KitRole) => void;
  mood: string;
  activeRole?: string;
}

type DemoProps = Pick<KitExamplesProps, 'onSound'>;
type Example = 'workspace' | 'messages' | 'checkout';

const EXAMPLES = [
  { value: 'workspace', label: 'Workspace' },
  { value: 'messages', label: 'Messages' },
  { value: 'checkout', label: 'Checkout' },
];

function WorkspaceDemo({ onSound }: DemoProps) {
  const inputId = useId();
  const nextId = useRef(4);
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Find the right direction', done: true },
    { id: 2, title: 'Make the small details feel good', done: false },
    { id: 3, title: 'Share a first version', done: false },
  ]);
  const [draft, setDraft] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const completed = tasks.filter((task) => task.done).length;

  function toggleTask(id: number) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    const next = tasks.map((item) =>
      item.id === id ? { ...item, done: !item.done } : item,
    );
    setTasks(next);
    setAnnouncement(`${task.title} ${task.done ? 'reopened' : 'completed'}.`);
    onSound(next.every((item) => item.done) ? 'complete' : 'toggle');
  }

  function addTask(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draft.trim();
    if (!title) return;
    const id = nextId.current++;
    setTasks((current) => [...current, { id, title, done: false }]);
    setDraft('');
    setAnnouncement(`Added ${title}.`);
    onSound('confirm');
  }

  return (
    <div className="kit-demo-workspace">
      <div className="kit-demo-appbar">
        <span className="kit-demo-app-name">
          <LayoutGrid size={16} /> Form
        </span>
        <span className="kit-demo-app-location">
          Your workspace <ChevronRight size={12} /> Today
        </span>
      </div>
      <div className="kit-demo-workspace-body">
        <div className="kit-demo-section-heading">
          <div>
            <p className="kit-demo-eyebrow">A little room to focus</p>
            <h3>Make something good.</h3>
          </div>
          <span
            className="kit-demo-progress"
            aria-label={`${completed} of ${tasks.length} tasks completed`}
          >
            <CircleCheck size={15} />
            <span>
              {completed}/{tasks.length}
            </span>
          </span>
        </div>
        <ul className="kit-demo-tasks" aria-label="Demo tasks">
          {tasks.map((task) => (
            <li key={task.id} className={task.done ? 'is-done' : ''}>
              <label className="kit-demo-task">
                <input
                  type="checkbox"
                  className="kit-demo-task-input"
                  checked={task.done}
                  onChange={() => toggleTask(task.id)}
                />
                <span className="kit-demo-task-check" aria-hidden="true">
                  {task.done && <Check size={12} strokeWidth={2.5} />}
                </span>
                <span className="kit-demo-task-title">{task.title}</span>
              </label>
            </li>
          ))}
        </ul>
        <form className="kit-demo-add-task" onSubmit={addTask}>
          <Plus size={16} aria-hidden="true" />
          <label className="kit-demo-sr-only" htmlFor={inputId}>
            New task
          </label>
          <input
            id={inputId}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add a small next step…"
            maxLength={100}
            autoComplete="off"
          />
          <Button
            type="submit"
            variant="ghost"
            className="kit-demo-add-button"
            disabled={!draft.trim()}
          >
            Add
          </Button>
        </form>
        <output className="kit-demo-sr-only">{announcement}</output>
      </div>
    </div>
  );
}

interface Message {
  id: number;
  from: 'you' | 'mia';
  text: string;
}

function MessagesDemo({ onSound }: DemoProps) {
  const inputId = useId();
  const nextId = useRef(3);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sound = useRef(onSound);
  const conversation = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, from: 'mia', text: 'The first prototype is ready.' },
    { id: 2, from: 'you', text: 'Nice. Let’s try it out.' },
  ]);
  const [draft, setDraft] = useState('');
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    const cancel = () => {
      if (timer.current === null) return;
      clearTimeout(timer.current);
      timer.current = null;
      setReplying(false);
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') cancel();
    };
    const hide = () => {
      if (document.hidden) cancel();
    };
    document.addEventListener('keydown', escape);
    document.addEventListener('visibilitychange', hide);
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
      document.removeEventListener('keydown', escape);
      document.removeEventListener('visibilitychange', hide);
    };
  }, []);
  useEffect(() => {
    sound.current = onSound;
  }, [onSound]);
  useEffect(() => {
    if (conversation.current)
      conversation.current.scrollTop = conversation.current.scrollHeight;
  }, [messages, replying]);

  function sendMessage(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || replying) return;
    const id = nextId.current++;
    setMessages((current) => [...current, { id, from: 'you', text }]);
    setDraft('');
    setReplying(true);
    onSound('confirm');
    timer.current = setTimeout(() => {
      const replyId = nextId.current++;
      setMessages((current) => [
        ...current,
        {
          id: replyId,
          from: 'mia',
          text: 'Got it. The small details make a difference.',
        },
      ]);
      setReplying(false);
      timer.current = null;
      if (!document.hidden) sound.current('notify');
    }, 1000);
  }

  return (
    <div className="kit-demo-messages">
      <div className="kit-demo-chat-heading">
        <span className="kit-demo-avatar" aria-hidden="true">
          M
        </span>
        <div>
          <h3>Mia</h3>
          <p>A simulated conversation</p>
        </div>
        <MessageCircle
          size={18}
          className="kit-demo-heading-icon"
          aria-hidden="true"
        />
      </div>
      <div
        className="kit-demo-conversation"
        ref={conversation}
        role="log"
        aria-label="Demo conversation"
        aria-live="polite"
        aria-relevant="additions"
      >
        <p className="kit-demo-conversation-start">Design catch-up</p>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`kit-demo-message is-${message.from}`}
          >
            <span className="kit-demo-sr-only">
              {message.from === 'you' ? 'You' : 'Mia'}:{' '}
            </span>
            <p>{message.text}</p>
            {message.from === 'you' && (
              <CheckCheck size={13} aria-label="Added to demo conversation" />
            )}
          </div>
        ))}
        {replying && (
          <output className="kit-demo-typing">
            <span aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>Mia is replying…</span>
          </output>
        )}
      </div>
      <form className="kit-demo-compose" onSubmit={sendMessage}>
        <label className="kit-demo-sr-only" htmlFor={inputId}>
          Message
        </label>
        <input
          id={inputId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a message…"
          maxLength={240}
          autoComplete="off"
        />
        <Button
          type="submit"
          size="icon"
          className="kit-demo-send"
          aria-label="Send demo message"
          disabled={!draft.trim() || replying}
        >
          <ArrowUp size={17} />
        </Button>
      </form>
    </div>
  );
}

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function CheckoutDemo({ onSound }: DemoProps) {
  const promoId = useId();
  const promoStatusId = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sound = useRef(onSound);
  const [quantity, setQuantity] = useState(1);
  const [promo, setPromo] = useState('');
  const [discount, setDiscount] = useState(false);
  const [promoStatus, setPromoStatus] = useState<'none' | 'error' | 'success'>(
    'none',
  );
  const [order, setOrder] = useState<'editing' | 'pending' | 'placed'>(
    'editing',
  );
  const subtotal = quantity * 18;
  const total = discount ? subtotal * 0.9 : subtotal;
  const pending = order === 'pending';

  useEffect(() => {
    const cancel = () => {
      if (timer.current === null) return;
      clearTimeout(timer.current);
      timer.current = null;
      setOrder('editing');
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') cancel();
    };
    const hide = () => {
      if (document.hidden) cancel();
    };
    document.addEventListener('keydown', escape);
    document.addEventListener('visibilitychange', hide);
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
      document.removeEventListener('keydown', escape);
      document.removeEventListener('visibilitychange', hide);
    };
  }, []);
  useEffect(() => {
    sound.current = onSound;
  }, [onSound]);

  function applyPromo(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const valid = promo.trim().toUpperCase() === 'QUIET';
    setDiscount(valid);
    setPromoStatus(valid ? 'success' : 'error');
    onSound(valid ? 'confirm' : 'error');
  }

  function placeOrder() {
    if (order !== 'editing') return;
    setOrder('pending');
    onSound('confirm');
    timer.current = setTimeout(() => {
      setOrder('placed');
      timer.current = null;
      if (!document.hidden) sound.current('complete');
    }, 700);
  }

  const quantitySound = {
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button === 0) onSound('press');
    },
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button === 0) onSound('release');
    },
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      if (!event.repeat && (event.key === 'Enter' || event.key === ' '))
        onSound('press');
    },
    onKeyUp: (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') onSound('release');
    },
  };

  return (
    <div className="kit-demo-checkout">
      <div className="kit-demo-appbar">
        <span className="kit-demo-app-name">
          <ShoppingBag size={16} /> Everyday
        </span>
        <span className="kit-demo-app-location">Demo checkout</span>
      </div>
      {order === 'placed' ? (
        <div className="kit-demo-order-success" aria-live="polite">
          <span className="kit-demo-success-mark">
            <Check size={27} strokeWidth={1.8} />
          </span>
          <h3>A small thing, well chosen.</h3>
          <p>Demo order placed. Nothing was charged.</p>
          <span className="kit-demo-success-detail">
            {quantity} {quantity === 1 ? 'notebook' : 'notebooks'} ·{' '}
            {money(total)}
          </span>
          <Button
            type="button"
            variant="outline"
            className="kit-demo-secondary-button"
            onClick={() => {
              setOrder('editing');
              onSound('transition');
            }}
          >
            Try again
          </Button>
        </div>
      ) : (
        <div className="kit-demo-checkout-body">
          <div className="kit-demo-product">
            <div className="kit-demo-product-image" aria-hidden="true">
              <div className="kit-demo-notebook">
                <span />
                <i />
              </div>
            </div>
            <div className="kit-demo-product-details">
              <h3>Everyday notebook</h3>
              <p>Soft cover · Stone</p>
              <strong>{money(18)}</strong>
            </div>
            <div className="kit-demo-quantity" aria-label="Notebook quantity">
              <button
                type="button"
                aria-label="Decrease quantity"
                disabled={quantity <= 1 || pending}
                onClick={() => setQuantity((current) => current - 1)}
                {...quantitySound}
              >
                <Minus size={13} />
              </button>
              <output aria-live="polite" aria-label="Quantity">
                {quantity}
              </output>
              <button
                type="button"
                aria-label="Increase quantity"
                disabled={quantity >= 5 || pending}
                onClick={() => setQuantity((current) => current + 1)}
                {...quantitySound}
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
          <form className="kit-demo-promo" onSubmit={applyPromo}>
            <div className="kit-demo-promo-input">
              <label className="kit-demo-sr-only" htmlFor={promoId}>
                Promo code
              </label>
              <input
                id={promoId}
                value={promo}
                disabled={pending}
                onChange={(event) => {
                  setPromo(event.target.value);
                  setPromoStatus('none');
                }}
                placeholder="Promo code"
                maxLength={30}
                autoComplete="off"
                aria-invalid={promoStatus === 'error'}
                aria-describedby={promoStatusId}
              />
              <Button
                type="submit"
                variant="ghost"
                className="kit-demo-add-button"
                disabled={!promo.trim() || pending}
              >
                Apply
              </Button>
            </div>
            <p
              id={promoStatusId}
              className={`kit-demo-promo-status is-${promoStatus}`}
              role={promoStatus === 'error' ? 'alert' : 'status'}
            >
              {promoStatus === 'error'
                ? 'That code did not work. Try QUIET.'
                : promoStatus === 'success'
                  ? 'QUIET applied. A little less, just for the demo.'
                  : 'Try QUIET for 10% off.'}
            </p>
          </form>
          <dl className="kit-demo-order-totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{money(subtotal)}</dd>
            </div>
            {discount && (
              <div className="kit-demo-discount">
                <dt>QUIET · 10% off</dt>
                <dd>−{money(subtotal * 0.1)}</dd>
              </div>
            )}
            <div>
              <dt>Delivery</dt>
              <dd>Included</dd>
            </div>
            <div className="kit-demo-total">
              <dt>Total</dt>
              <dd>{money(total)}</dd>
            </div>
          </dl>
          <Button
            type="button"
            className="kit-demo-order-button"
            disabled={pending}
            aria-busy={pending}
            onClick={placeOrder}
          >
            {pending ? 'Placing demo order…' : 'Place demo order'}
            {!pending && <ChevronRight size={16} />}
          </Button>
          <p className="kit-demo-checkout-note">
            A local preview. No payment or personal details.
          </p>
        </div>
      )}
    </div>
  );
}

export function KitExamples({ onSound, mood, activeRole }: KitExamplesProps) {
  const [example, setExample] = useState<Example>('workspace');

  function selectExample(value: string) {
    if (value !== 'workspace' && value !== 'messages' && value !== 'checkout')
      return;
    if (value === example) return;
    setExample(value);
    onSound('transition');
  }

  return (
    <section
      className="kit-examples"
      aria-label="Interactive sound examples"
      data-mood={mood}
      data-active-role={activeRole}
    >
      <div className="kit-demo-toolbar">
        <KitSegments
          label="Choose an interactive demo"
          options={EXAMPLES}
          value={example}
          onValueChange={selectExample}
        />
        <span className="kit-demo-caption">Interactive demo</span>
      </div>
      <div className="kit-demo-frame">
        {example === 'workspace' && <WorkspaceDemo onSound={onSound} />}
        {example === 'messages' && <MessagesDemo onSound={onSound} />}
        {example === 'checkout' && <CheckoutDemo onSound={onSound} />}
      </div>
      <div className="kit-demo-footer">
        <span>
          <Volume2 size={13} aria-hidden="true" /> {mood} set
        </span>
        <span>
          {activeRole
            ? `${activeRole.charAt(0).toUpperCase()}${activeRole.slice(1)}`
            : 'Try the controls'}
        </span>
      </div>
    </section>
  );
}
