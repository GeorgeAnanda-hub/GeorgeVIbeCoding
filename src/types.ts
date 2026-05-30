export type PlayRole = "user_attack" | "user_defend";
export type Direction = "Left" | "Right" | "Up";
export type RoundWinner = "user" | "ai" | "none";
export type OpponentId = "minjun" | "jihee" | "master_kim";
export type OpponentExpression = "neutral" | "smiling" | "shouting" | "shocked" | "smug" | "crying";

export interface Opponent {
  id: OpponentId;
  name: string;
  title: string;
  bio: string;
  personalities: string[];
}

export interface PlayHistoryItem {
  round: number;
  role: PlayRole;
  userAction: Direction;
  aiAction: Direction;
  winner: RoundWinner;
  commentary: string;
  refereeMessage: string;
}

export interface GameEngineState {
  currentRole: PlayRole;
  userScore: number;
  aiScore: number;
  maxScore: number;
  roundCount: number;
}
