export type ChatReactionView = {
  emoji: string;
  count: number;
  mine: boolean;
  users?: string[]; // később hover-only lesz
};