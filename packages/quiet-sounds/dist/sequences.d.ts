import { type Settings } from './catalog.js';
import { type Rendered } from './engine.js';
export declare const CHAT_ACTIONS: readonly [{
    readonly id: "new";
    readonly name: "New conversation";
    readonly cue: "chat-new-conversation";
    readonly start: 0;
    readonly end: 0.8;
    readonly sound: 0.05;
}, {
    readonly id: "receive";
    readonly name: "Receive a message";
    readonly cue: "chat-receive-message";
    readonly start: 3.58;
    readonly end: 4.98;
    readonly sound: 4.48;
}, {
    readonly id: "send";
    readonly name: "Send a message";
    readonly cue: "chat-send-message";
    readonly start: 1.68;
    readonly end: 2.94;
    readonly sound: 2.39;
}, {
    readonly id: "cards";
    readonly name: "Insert cards";
    readonly cue: "chat-insert-cards";
    readonly start: 8.32;
    readonly end: 9.18;
    readonly sound: 8.32;
}, {
    readonly id: "voice";
    readonly name: "Insert voice note";
    readonly cue: "chat-insert-voice-note";
    readonly start: 10.18;
    readonly end: 10.85;
    readonly sound: 10.18;
}, {
    readonly id: "upload";
    readonly name: "Upload attachment";
    readonly cue: "chat-upload-attachment";
    readonly start: 11.22;
    readonly end: 12.62;
    readonly sound: 11.22;
}, {
    readonly id: "failure";
    readonly name: "Delivery failure";
    readonly cue: "chat-delivery-failure";
    readonly start: 13.33;
    readonly end: 14.8;
    readonly sound: 14.17;
}, {
    readonly id: "retry";
    readonly name: "Retry delivery";
    readonly cue: "chat-retry-delivery";
    readonly start: 15.33;
    readonly end: 16.7;
    readonly sound: 15.33;
}];
export type ChatActionId = (typeof CHAT_ACTIONS)[number]['id'];
export declare const FLOW_DURATION = 17.6;
export declare const progress: (time: number, start: number, duration: number) => number;
export declare const smooth: (time: number, start: number, duration: number) => number;
export declare function buildConversation(actionId: ChatActionId | 'flow', settings: Settings, speed?: number, offset?: number, replaceCue?: string): {
    rendered: Rendered;
    start: number;
    end: number;
    scale: number;
    lead: number;
    motionDuration: number;
    events: {
        at: number;
        cue: "chat-new-conversation" | "chat-receive-message" | "chat-send-message" | "chat-insert-cards" | "chat-insert-voice-note" | "chat-upload-attachment" | "chat-delivery-failure" | "chat-retry-delivery";
        duration: number;
        toneShare: number;
        energy: number;
    }[];
};
export declare function conversationStage(time: number): ChatActionId;
export declare function conversationPose(t: number, reduced?: boolean): {
    welcome: number;
    chips: number;
    send1: number;
    send2: number;
    send3: number;
    incoming: number;
    message: number;
    cards: number;
    card2: number;
    card3: number;
    voice: number;
    upload: number;
    uploadProgress: number;
    uploaded: number;
    failure: number;
    retry: number;
    deliveryControl: number;
    retrying: number;
    retryTurn: number;
    idle: number;
    scroll: number;
    draft: number;
    typing: number;
};
