import * as StoreReview from "expo-store-review";
import { Linking, Platform } from "react-native";
import { SecureStorage } from "@/app/(auth)/taauth";

const ANDROID_PACKAGE = "com.prmntr.teachassist";
const IOS_APP_STORE_ID = "6758636625";

const POSITIVE_EVENT_COUNT_KEY = "ta_review_positive_event_count";
const LAST_PROMPTED_AT_KEY = "ta_review_last_prompted_at";
// Cumulative positive-event counts that are allowed to trigger the native prompt.
// Spaced out so we spend the OS's limited yearly prompt budget on users who are
// clearly getting value out of the app, not on their very first success.
const REVIEW_MILESTONES = new Set([3, 10, 25, 50]);
const MIN_DAYS_BETWEEN_PROMPTS = 60;

export async function openWriteReview(): Promise<void> {
  if (Platform.OS === "ios") {
    if (IOS_APP_STORE_ID) {
      await Linking.openURL(
        `itms-apps://itunes.apple.com/app/viewContentsUserReviews/id${IOS_APP_STORE_ID}?action=write-review`,
      );
    } else {
      await requestStoreReview();
    }
  } else if (Platform.OS === "android") {
    try {
      await Linking.openURL(
        `market://details?id=${ANDROID_PACKAGE}&showAllReviews=true`,
      );
    } catch {
      await Linking.openURL(
        `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}&showAllReviews=true`,
      );
    }
  }
}

// Call this after a meaningful, non-time-sensitive user interaction — never from a button directly.
export async function requestStoreReview(): Promise<void> {
  const isAvailable = await StoreReview.isAvailableAsync();
  if (!isAvailable) return;

  const hasAction = await StoreReview.hasAction();
  if (!hasAction) return;

  await StoreReview.requestReview();
}

// Call this from meaningful "positive moment" spots throughout the app (a booking
// completed, a PDF exported, a volunteer-hours milestone hit, grades refreshed).
// It tracks a running count of these moments and only fires the native prompt on a
// handful of milestones, at most once every MIN_DAYS_BETWEEN_PROMPTS — the OS already
// caps how often the prompt can appear, but this keeps us from spending that budget
// on a user's very first interaction.
export async function notePositiveInteraction(): Promise<void> {
  try {
    const countRaw = await SecureStorage.load(POSITIVE_EVENT_COUNT_KEY);
    const count = (countRaw ? Number.parseInt(countRaw, 10) || 0 : 0) + 1;
    await SecureStorage.save(POSITIVE_EVENT_COUNT_KEY, String(count));

    if (!REVIEW_MILESTONES.has(count)) return;

    const lastPromptedRaw = await SecureStorage.load(LAST_PROMPTED_AT_KEY);
    const lastPromptedAt = lastPromptedRaw
      ? Number.parseInt(lastPromptedRaw, 10)
      : 0;
    const daysSincePrompt =
      (Date.now() - lastPromptedAt) / (1000 * 60 * 60 * 24);
    if (lastPromptedAt && daysSincePrompt < MIN_DAYS_BETWEEN_PROMPTS) return;

    await SecureStorage.save(LAST_PROMPTED_AT_KEY, String(Date.now()));
    await requestStoreReview();
  } catch {
    // Review prompting is best-effort; never let it break the calling flow.
  }
}
