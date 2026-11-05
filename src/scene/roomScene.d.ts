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
  /** Re-frame the camera, e.g. after the UI covering the room changed size. */
  refit(): void;
  dispose(): void;
};

export function createRoomScene(els: {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  labels: HTMLElement;
  bubble: HTMLElement;
  /** Pixels of the root covered by UI at the top and bottom. Used on narrow screens to frame the room in what is left. */
  insets?: () => { top: number; bottom: number };
}): RoomScene | null;
