import { supabase } from "./supabase";

declare global {
  interface Window {
    OneSignal: any;
  }
}

let oneSignalInitialized = false;

export async function initOneSignal(): Promise<void> {
  if (oneSignalInitialized) {
    return;
  }

  const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;

  if (!ONESIGNAL_APP_ID) {
    console.warn("OneSignal not configured: VITE_ONESIGNAL_APP_ID missing");
    return;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.async = true;
    script.defer = true;

    script.onload = async () => {
      try {
        window.OneSignal = window.OneSignal || [];
        const OneSignal = window.OneSignal;

        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          notifyButton: {
            enable: false,
          },
          allowLocalhostAsSecureOrigin: true,
        });

        OneSignal.Notifications.addEventListener("permissionChange", async (permission: boolean) => {
          if (permission) {
            await registerDevice();
          }
        });

        const isPushSupported = await OneSignal.Notifications.isPushSupported();
        if (!isPushSupported) {
          console.warn("Push notifications not supported on this device/browser");
          oneSignalInitialized = true;
          resolve();
          return;
        }

        const permission = await OneSignal.Notifications.permission;
        if (permission) {
          await registerDevice();
        }

        oneSignalInitialized = true;
        resolve();
      } catch (error) {
        console.error("OneSignal initialization error:", error);
        reject(error);
      }
    };

    script.onerror = (error) => {
      console.error("Failed to load OneSignal SDK:", error);
      reject(error);
    };

    document.head.appendChild(script);
  });
}

async function registerDevice(): Promise<void> {
  try {
    const OneSignal = window.OneSignal;
    if (!OneSignal) {
      return;
    }

    const subscription = await OneSignal.User.PushSubscription.id;
    if (!subscription) {
      console.warn("No OneSignal subscription ID available");
      return;
    }

    const platform = detectPlatform();
    const userAgent = navigator.userAgent;

    const { error } = await supabase.rpc("upsert_user_device", {
      p_provider: "onesignal",
      p_token: subscription,
      p_platform: platform,
      p_user_agent: userAgent.slice(0, 512),
    });

    if (error) {
      console.error("Failed to register OneSignal device:", error);
    } else {
      console.log("OneSignal device registered successfully:", subscription);
    }
  } catch (error) {
    console.error("Error registering OneSignal device:", error);
  }
}

function detectPlatform(): string {
  const ua = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(ua)) {
    return "ios";
  }

  if (/android/.test(ua)) {
    return "android";
  }

  if (/electron/.test(ua)) {
    return "desktop";
  }

  return "web";
}

export async function requestPushPermission(): Promise<boolean> {
  try {
    const OneSignal = window.OneSignal;
    if (!OneSignal) {
      console.warn("OneSignal not initialized");
      return false;
    }

    const isPushSupported = await OneSignal.Notifications.isPushSupported();
    if (!isPushSupported) {
      console.warn("Push notifications not supported");
      return false;
    }

    const permission = await OneSignal.Notifications.permission;
    if (permission) {
      return true;
    }

    const result = await OneSignal.Notifications.requestPermission();
    return result;
  } catch (error) {
    console.error("Error requesting push permission:", error);
    return false;
  }
}

export async function unsubscribePush(): Promise<void> {
  try {
    const OneSignal = window.OneSignal;
    if (!OneSignal) {
      return;
    }

    const subscription = await OneSignal.User.PushSubscription.id;
    if (subscription) {
      await supabase.rpc("remove_user_device", {
        p_token: subscription,
      });
    }

    await OneSignal.User.PushSubscription.optOut();
    console.log("Push notifications unsubscribed");
  } catch (error) {
    console.error("Error unsubscribing from push:", error);
  }
}
