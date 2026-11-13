export const SWEATERS = [0xc2283a, 0x2f7d57, 0xf2c14e, 0x4f86c6, 0x7b3f8c, 0xf3e2bd] as const;
export const MAX_GUESTS = 30;
export const MIN_GUESTS = 3;
export const MAX_NAME = 20;
export const MAX_WISH = 80;

/** Stored guest. Never sent to a browser as is. */
export type Guest = {
  id: string;
  name: string;
  nameKey: string;
  sweater: number;
  pinSalt: string;
  pinHash: string;
  pinReset: boolean;
  tokenHashes: string[];
  fails: number;
  lockedUntil: number;
  /** id of the guest this guest drew, or null */
  pick: string | null;
  joinedAt: number;
  /** A short gift hint. Only the guest who drew this guest sees it. Missing on rooms saved before wishes existed. */
  wish?: string;
};

export type Room = {
  code: string;
  name: string;
  exchangeDate: string;
  budget: string;
  hostId: string;
  locked: boolean;
  createdAt: number;
  guests: Guest[];
};

export type PublicGuest = { id: string; name: string; sweater: number; hasPicked: boolean; isHost: boolean; pinReset: boolean };

export type RoomView = {
  code: string;
  name: string;
  exchangeDate: string;
  budget: string;
  locked: boolean;
  started: boolean;
  papersLeft: number;
  guests: PublicGuest[];
  me: null | {
    id: string; name: string; isHost: boolean;
    /** My own gift hint. */
    wish: string;
    pickId: string | null; pickName: string | null;
    /** The gift hint of the guest I drew. Empty until I have picked. */
    pickWish: string;
  };
};
