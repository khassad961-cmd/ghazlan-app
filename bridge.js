// Ghazlan Phase 8 — Native Capacitor Bridge (Optional Chat Head + FCM Push Notifications)
(() => {
  const Cap = window.Capacitor;
  if (!Cap?.isNativePlatform?.()) return;

  // 1. Optional Chat Head Bubble Bridge (STRICTLY opt-in, OFF by default)
  const Bubble = Cap.Plugins?.Bubble;
  const App = Cap.Plugins?.App;
  const getOn = () => localStorage.getItem('rp_native_bubble') === '1';

  window.toggleNativeBubble = async (on) => {
    if (!Bubble) return;
    if (on) {
      const { granted } = await Bubble.hasPermission();
      if (!granted) {
        await Bubble.requestPermission();
        if (window.showToast) showToast('فعّل "الظهور فوق التطبيقات" لـ غزلان ثم أعد التفعيل');
        return;
      }
    } else {
      try { await Bubble.hide(); } catch {}
    }
    localStorage.setItem('rp_native_bubble', on ? '1' : '0');
    if (window.showToast) showToast(on ? 'تم تفعيل الفقاعة الاختيارية ✨' : 'تم إيقاف الفقاعة الاختيارية');
  };

  if (App && Bubble) {
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) Bubble.hide().catch(() => {});
      else if (getOn()) Bubble.show({ count: 0, text: '' }).catch(() => {});
    });
  }

  // 2. FCM Push Notifications Registration (saves token to Supabase users.fcm_token)
  const Push = Cap.Plugins?.PushNotifications;
  async function saveFcmTokenToSupabase(token) {
    localStorage.setItem('rp_fcm_token', token);
    const cfg = window.GhazlanAPI?.getConfig();
    const sess = window.GhazlanAPI?.getSession();
    if (!cfg?.url || !cfg?.anonKey || !sess?.access_token || !sess?.user?.id) return;
    try {
      await fetch(`${cfg.url}/rest/v1/users?id=eq.${encodeURIComponent(sess.user.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: cfg.anonKey,
          Authorization: `Bearer ${sess.access_token}`,
        },
        body: JSON.stringify({ fcm_token: token }),
      });
    } catch {}
  }

  window.registerGhazlanPush = async () => {
    if (!Push) return;
    try {
      let perm = await Push.checkPermissions();
      if (perm.receive === 'prompt') perm = await Push.requestPermissions();
      if (perm.receive !== 'granted') return;
      await Push.register();
      Push.addListener('registration', ({ value }) => { if (value) saveFcmTokenToSupabase(value); });
      Push.addListener('pushNotificationReceived', (n) => {
        if (window.showToast && n?.body) showToast(`🌙 ${n.title || 'غزلان'}: ${n.body}`);
        window.GhazlanTasks?.syncScheduledMessages?.();
      });
    } catch {}
  };

  // Auto-sync push token once user signs in (without forcing overlay permissions)
  setTimeout(() => {
    if (window.GhazlanAPI?.isSignedIn()) window.registerGhazlanPush();
  }, 3000);
})();
