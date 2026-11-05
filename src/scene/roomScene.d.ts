export type SceneGuest = { id: string; name: string; sweater: number; hasPicked: boolean };

export type RoomScene = {
  /** Sync the seated guests. `meId` is seated front and center. */
  setGuests(list: SceneGuest[], meId: string | null): void;
  /** Float the star over one guest, or hide it with null. */
  setStar(id: string | null): void;
  setJarRaised(up: boolean): void;
  /** A paper flies from Santa's jar to this guest. */
  flyPaper(id: string): void;
  burst(id: string): void;
  say(text: string, seconds?: number): void;
  hush(): void;
  dispose(): void;
};

export function createRoomScene(els: { root: HTMLElement; canvas: HTMLCanvasElement; labels: HTMLElement; bubble: HTMLElement }): RoomScene | null;
