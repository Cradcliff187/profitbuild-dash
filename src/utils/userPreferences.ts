import localforage from 'localforage';

const prefsStore = localforage.createInstance({
  name: 'UserPreferences',
  storeName: 'settings'
});

export interface CaptionPreferences {
  showCaptionPrompts: boolean;
  dismissedAt: number | null;
}

export const getCaptionPreferences = async (): Promise<CaptionPreferences> => {
  const prefs = await prefsStore.getItem<CaptionPreferences>('caption-prefs');
  return prefs || {
    showCaptionPrompts: true,
    dismissedAt: null
  };
};

export const setCaptionPreferences = async (prefs: CaptionPreferences): Promise<void> => {
  await prefsStore.setItem('caption-prefs', prefs);
};

export const dismissCaptionPrompts = async (): Promise<void> => {
  await setCaptionPreferences({
    showCaptionPrompts: false,
    dismissedAt: Date.now()
  });
};
