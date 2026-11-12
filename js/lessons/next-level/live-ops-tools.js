/* Lesson: Analytics, Ads & Push — event stream → funnel, rewarded ad state flow, push scheduling → retention. */
U101.defineLesson('live-ops-tools', {
  lead: 'Sau khi phát hành, game sống nhờ dữ liệu: Analytics cho biết người chơi bỏ đi ở đâu, quảng cáo thưởng tạo doanh thu, push notification kéo người chơi quay lại. Bộ công cụ này gọi chung là live-ops.',
  hint: 'Kéo độ khó tutorial để xem funnel rơi ở đâu · bấm "Xem quảng cáo thưởng" · bật push và đổi giờ gửi để xem retention D1/D7',
  overview: `
    <p>Mỗi hành động của người chơi được gửi lên server thành một <b>event</b> (tên + tham số). Từ hàng triệu event, dashboard dựng ra funnel, retention, doanh thu.</p>
    <ul>
      <li><b>Analytics</b> (Firebase Analytics, Unity Analytics, GameAnalytics): log event như <code>tutorial_complete</code>, <code>level_start</code>. <b>Funnel</b> cho thấy tỉ lệ rơi giữa các bước: rơi mạnh ở bước nào thì sửa bước đó trước.</li>
      <li><b>Ads</b> (Unity Ads/LevelPlay, AdMob, AppLovin MAX): rewarded ad đi qua các trạng thái <b>Load → Ready → Show → Reward</b>. <b>Fill rate</b> là tỉ lệ yêu cầu có quảng cáo trả về; không fill thì nút "xem quảng cáo" phải ẩn đi. Mediation gom nhiều mạng để tăng fill.</li>
      <li><b>Push notification</b> (Firebase Cloud Messaging, OneSignal): nhắc người chơi quay lại ("năng lượng đã đầy"). Gửi đúng giờ tăng <b>retention</b>; gửi lúc 3 giờ sáng chỉ làm người chơi tắt thông báo hoặc gỡ game.</li>
      <li><b>Retention D1/D7/D30</b>: phần trăm người chơi còn mở game sau 1, 7, 30 ngày. Đây là chỉ số sống còn của game mobile.</li>
      <li><b>Support tools</b> (Zendesk, Helpshift): người chơi gửi ticket ngay trong game, kèm user id, phiên bản, thiết bị, giúp đội CS xử lý nhanh và đúng.</li>
    </ul>
    <p class="callout">Chỉ cho người chơi nhận thưởng trong callback <b>reward</b> của SDK, không phải lúc bấm nút. Người chơi đóng quảng cáo giữa chừng thì không được thưởng.</p>`,
  keyPoints: [
    'Log event có tên rõ ràng; funnel chỉ ra bước làm rơi nhiều người chơi nhất.',
    'Rewarded ad: Load trước, chỉ hiện nút khi Ready, chỉ thưởng trong callback reward.',
    'Fill rate < 100%: luôn xử lý trường hợp không có quảng cáo.',
    'Push đúng giờ, đúng nội dung tăng retention; spam push làm giảm retention.',
  ],
  code: {
    title: 'RewardedAdButton.cs',
    source: `
using Firebase.Analytics;
using UnityEngine;
using UnityEngine.Advertisements; // Unity Ads SDK

public class RewardedAdButton : MonoBehaviour, IUnityAdsLoadListener, IUnityAdsShowListener
{
    [SerializeField] private string adUnitId = "Rewarded_Android";
    [SerializeField] private GameObject button;

    void Start() { button.SetActive(false); Advertisement.Load(adUnitId, this); }

    public void OnUnityAdsAdLoaded(string id) => button.SetActive(true);       // Ready
    public void OnUnityAdsFailedToLoad(string id, UnityAdsLoadError e, string msg)
    {
        button.SetActive(false);                                               // No fill: ẩn nút
        Invoke(nameof(Reload), 30f);                                           // thử lại sau
    }

    public void OnClick() { button.SetActive(false); Advertisement.Show(adUnitId, this); }

    public void OnUnityAdsShowComplete(string id, UnityAdsShowCompletionState state)
    {
        if (state == UnityAdsShowCompletionState.COMPLETED)                    // xem hết mới thưởng
        {
            Wallet.AddGems(10);
            FirebaseAnalytics.LogEvent("ad_reward", "placement", "double_gems");
        }
        Reload();
    }

    void Reload() => Advertisement.Load(adUnitId, this);
    public void OnUnityAdsShowFailure(string id, UnityAdsShowError e, string msg) => Reload();
    public void OnUnityAdsShowStart(string id) { }
    public void OnUnityAdsShowClick(string id) { }
}`,
    note: 'Event funnel: FirebaseAnalytics.LogEvent("tutorial_complete") ở đúng chỗ code. Thưởng chỉ nằm trong OnUnityAdsShowComplete với trạng thái COMPLETED.',
  },
  tryIt: [
    'Kéo "Độ khó tutorial" lên 5: bước nào trên funnel chuyển đỏ (rơi nhiều nhất)?',
    'Hạ Fill rate xuống 50% rồi bấm quảng cáo nhiều lần: bao nhiêu lần rơi vào No fill?',
    'Bật Push với giờ 19:00 và so cột D1/D7 với vạch nét đứt (không push).',
    'Đổi giờ gửi sang 03:00: retention thay đổi thế nào? Vì sao?',
    'Bấm "Gửi push ngay" và xem event session_start chạy vào Analytics.',
  ],
  links: [
    { label: 'Firebase Analytics for Unity', url: 'https://firebase.google.com/docs/analytics/unity/start' },
    { label: 'Unity Ads: rewarded ads', url: 'https://docs.unity.com/ads/en-us/manual/ImplementingRewardedAdsUnity' },
    { label: 'Firebase Cloud Messaging (Unity)', url: 'https://firebase.google.com/docs/cloud-messaging/unity/client' },
    { label: 'OneSignal Unity SDK', url: 'https://documentation.onesignal.com/docs/unity-sdk-setup' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const STEPS = [['install', C.navy2], ['tutorial_begin', C.blue], ['tutorial_complete', C.purple], ['level_5', C.teal], ['iap_purchase', C.green]];
    const counts = [0, 0, 0, 0, 0];
    let diff = 3, fill = 85, push = false, hour = '19';
    const ad = { state: 'ready', t: 0, req: 1, filled: 1, rewards: 0 };
    let chips = [], spawnT = 0, pushT = -1, retShown = [0, 0, 0], logT = 0;
    const AD_DESC = { load: 'Đang tải quảng cáo, nút đang ẩn…', ready: 'Ready: hiện nút "x2 gem" cho người chơi', show: 'Đang chiếu quảng cáo toàn màn hình', reward: 'COMPLETED: cộng thưởng + log ad_reward', nofill: 'No fill: không có quảng cáo, ẩn nút, thử lại sau', closed: 'SKIPPED: đóng giữa chừng, không thưởng' };
    const EVT = [...STEPS, ['ad_reward', C.orange], ['session_start', C.pink]];
    const BASE = [32, 11, 4], UPLIFT = { '19': [6, 5, 2], '09': [3, 2, 1], '03': [-2, -3, -1] };

    const stepsReached = () => {
      const p = [1, 0.92, 0.97 - diff * 0.09, 0.55, 0.12];
      let n = 1; while (n < 5 && Math.random() < p[n]) n++;
      return n;
    };
    for (let i = 0; i < 400; i++) { const n = stepsReached(); for (let k = 0; k < n; k++) counts[k]++; }
    const addChip = (name, color, delay, step) => { chips.push({ name, color, p: -delay * 0.5, step }); if (chips.length > 18) chips.shift(); };
    const retention = () => BASE.map((b, i) => b + (push ? UPLIFT[hour][i] : 0));

    for (let i = 0; i < 8; i++) addChip(STEPS[i % 4][0], STEPS[i % 4][1], 0, -1), (chips[chips.length - 1].p = i / 8);
    retShown = retention();
    stage.ui.group('Analytics');
    stage.ui.slider('Độ khó tutorial', { min: 1, max: 5, value: diff }, (v) => { diff = v; counts.fill(0); for (let i = 0; i < 400; i++) { const n = stepsReached(); for (let k = 0; k < n; k++) counts[k]++; } stage.log(`Tutorial độ khó ${v}: funnel tính lại trên 400 người chơi mẫu`); });
    stage.ui.group('Rewarded Ad');
    stage.ui.slider('Fill rate', { min: 30, max: 100, value: fill, unit: '%' }, (v) => (fill = v));
    stage.ui.button('Xem quảng cáo thưởng', () => {
      if (ad.state !== 'ready') return stage.log(`Nút đang ẩn: quảng cáo ở trạng thái ${ad.state}, chưa Ready`, 'warn');
      ad.state = 'show'; ad.t = 0; stage.log('Advertisement.Show() → quảng cáo toàn màn hình');
    }, { variant: 'primary' });
    stage.ui.group('Push notification');
    stage.ui.toggle('Bật push (FCM/OneSignal)', push, (v) => { push = v; stage.log(v ? `Lên lịch push "Năng lượng đã đầy!" lúc ${hour}:00 giờ địa phương` : 'Tắt push: retention quay về mức gốc'); });
    stage.ui.select('Giờ gửi', [{ value: '19', label: '19:00 (giờ rảnh)' }, { value: '09', label: '09:00 (đi làm)' }, { value: '03', label: '03:00 (nửa đêm)' }], hour, (v) => { hour = v; if (push && v === '03') stage.log('Push lúc 3h sáng: người chơi tắt thông báo hoặc gỡ game → retention giảm', 'warn'); });
    stage.ui.button('Gửi push ngay', () => { pushT = 0; stage.log('FCM gửi push → điện thoại người chơi'); });
    const fillOut = stage.ui.readout('Fill thực tế', '1/1');

    stage.onFrame((dt) => {
      spawnT += dt; logT += dt;
      if (spawnT > 0.9) {
        spawnT = 0; const n = stepsReached();
        for (let k = 0; k < n; k++) addChip(STEPS[k][0], STEPS[k][1], k, k);
        if (logT > 4) { logT = 0; stage.log(`Người chơi mới dừng ở "${STEPS[n - 1][0]}" (${n}/5 bước)`); }
      }
      chips.forEach((c) => { c.p += dt * 0.32; if (c.p >= 1 && !c.done) { c.done = true; if (c.step >= 0) counts[c.step]++; } });
      chips = chips.filter((c) => c.p < 1.05);
      // Ad state machine
      ad.t += dt;
      if (ad.state === 'show' && ad.t > 1.6) {
        const done = Math.random() < 0.85; ad.state = done ? 'reward' : 'closed'; ad.t = 0;
        if (done) { ad.rewards++; addChip('ad_reward', C.orange, 0, -1); stage.log('OnUnityAdsShowComplete(COMPLETED) → +10 gem, log ad_reward'); }
        else stage.log('Người chơi đóng quảng cáo giữa chừng → SKIPPED, không thưởng', 'warn');
      } else if ((ad.state === 'reward' || ad.state === 'closed' || ad.state === 'nofill') && ad.t > (ad.state === 'nofill' ? 2.5 : 1.2)) {
        ad.state = 'load'; ad.t = 0; ad.req++; stage.log('Advertisement.Load() → hỏi mạng quảng cáo…');
      } else if (ad.state === 'load' && ad.t > 1) {
        const ok = Math.random() * 100 < fill; ad.state = ok ? 'ready' : 'nofill'; ad.t = 0;
        if (ok) ad.filled++; else stage.log('OnUnityAdsFailedToLoad: No fill → ẩn nút, thử lại sau', 'warn');
        fillOut.set(`${ad.filled}/${ad.req} (${Math.round((ad.filled / ad.req) * 100)}%)`);
      }
      if (pushT >= 0) { pushT += dt * 0.7; if (pushT >= 1) { pushT = -1; for (let k = 0; k < 3; k++) addChip('session_start', C.pink, k, -1); stage.log('Người chơi mở game từ push → session_start'); } }
      const r = retention(); retShown = retShown.map((v, i) => U.lerp(v, r[i], Math.min(1, dt * 4)));
      render();
    });

    function panel(x, y, w, h, title, sub) {
      d.node(x, y, w, h, null, { accent: C.lineSoft, shadow: 4 });
      d.text(title, x + 12, y + 16, { font: 'cond', weight: 700, size: 14, color: C.navy });
      if (sub && w > 260) d.text(sub, x + w - 12, y + 16, { align: 'right', font: 'mono', size: 11, color: C.muted });
    }
    function render() {
      const { w, h } = stage, g = w < 500 ? 8 : 12;
      d.clear(w, h); d.grid(w, h);
      const pw = (w - g * 3) / 2, ph = (h - g * 3) / 2;
      const P = [0, 1, 2, 3].map((i) => ({ x: g + (i % 2) * (pw + g), y: g + Math.floor(i / 2) * (ph + g) }));
      drawStream(P[0].x, P[0].y, pw, ph); drawFunnel(P[1].x, P[1].y, pw, ph);
      drawAds(P[2].x, P[2].y, pw, ph); drawRetention(P[3].x, P[3].y, pw, ph);
    }
    function drawStream(x, y, w, h) {
      panel(x, y, w, h, 'Phiên chơi → Analytics', 'LogEvent(...)');
      const fw = Math.min(110, w * 0.28), fx = x + w - fw - 12, fh = Math.min(76, h - 44), fy = y + 22 + (h - 22 - fh) / 2, fcy = fy + fh / 2;
      const top = y + 32, lh = (h - 40) / EVT.length, showLbl = lh >= 13 && w > 300, lx = x + 14 + (showLbl ? 118 : 0);
      EVT.forEach(([name, col], i) => {
        const ly = top + (i + 0.5) * lh;
        if (showLbl) d.text(name, lx - 8, ly, { align: 'right', font: 'mono', size: 11, color: col });
        d.line(lx, ly, fx - 30, ly, { stroke: C.lineSoft, lw: 1.5, dash: [4, 5] });
      });
      chips.forEach((c) => {
        if (c.p < 0) return;
        const t = U.clamp(c.p, 0, 1), i = Math.max(0, EVT.findIndex((e) => e[0] === c.name)), ly = top + (i + 0.5) * lh;
        const cy = t < 0.8 ? ly : U.lerp(ly, fcy, U.ease.inOutQuad((t - 0.8) / 0.2));
        d.circle(U.lerp(lx, fx, t), cy, 5, { fill: c.color, stroke: '#fff', lw: 1.5 });
      });
      d.node(fx, fy, fw, fh, 'Firebase', { accent: C.yellow, sub: 'Analytics', shadow: 4 });
    }
    function drawFunnel(x, y, w, h) {
      panel(x, y, w, h, 'Funnel', `tutorial độ khó ${diff}`);
      const sm = w < 300, lw = sm ? 0 : Math.min(130, w * 0.36), bx = x + 12 + lw, bw = w - lw - (sm ? 64 : 70), top = y + 34, rh = (h - 44) / 5;
      let worst = 1, worstRate = 1;
      for (let i = 1; i < 5; i++) { const r = counts[i] / Math.max(1, counts[i - 1]); if (i < 4 && r < worstRate) { worstRate = r; worst = i; } }
      STEPS.forEach(([name, col], i) => {
        const ry = top + i * rh + (sm ? 12 : 0), bh = sm ? Math.max(5, rh - 16) : Math.min(22, rh - 6), frac = counts[i] / Math.max(1, counts[0]);
        const isWorst = i === worst;
        d.text(name, sm ? bx : bx - 8, sm ? ry - 6 : ry + bh / 2, { align: sm ? 'left' : 'right', font: 'mono', size: 11, color: isWorst ? C.red : C.ink, weight: isWorst ? 700 : 500 });
        d.rect(bx, ry, bw, bh, { fill: C.bgDeep, r: 4 });
        d.rect(bx, ry, Math.max(2, bw * frac), bh, { fill: isWorst ? C.red : col, r: 4 });
        const pct = i ? `-${Math.round((1 - counts[i] / Math.max(1, counts[i - 1])) * 100)}%` : `${counts[0]}`;
        d.text(pct, bx + bw + 8, ry + bh / 2, { font: 'mono', size: 11, weight: 600, color: isWorst ? C.red : C.muted });
      });
    }
    function drawAds(x, y, w, h) {
      panel(x, y, w, h, 'Rewarded Ad', 'Unity Ads / AdMob');
      const sm = w < 330, nc = sm ? 3 : 4, gx = sm ? 10 : 14;
      const nodes = { load: ['Load', 0, 0, C.blue], ready: ['Ready', 1, 0, C.teal], show: ['Show', 2, 0, C.purple], reward: ['Reward', sm ? 2 : 3, sm ? 1 : 0, C.green], nofill: ['No fill', sm ? 0 : 1, 1, C.red], closed: ['Skipped', sm ? 1 : 3, 1, C.orange] };
      const cw = (w - 24 - (nc - 1) * gx) / nc, nh = U.clamp((h - 90) / 2 - 8, 26, 48), top = y + 34;
      const pos = (k) => ({ x: x + 12 + nodes[k][1] * (cw + gx), y: top + nodes[k][2] * (nh + 16) });
      [['load', 'ready'], ['ready', 'show'], ['show', 'reward'], ['load', 'nofill'], ['show', 'closed']].forEach(([a, b]) => {
        const A = pos(a), B = pos(b);
        if (A.y === B.y) d.arrow(A.x + cw + 1, A.y + nh / 2, B.x - 1, B.y + nh / 2, { stroke: C.line, head: 6, lw: 1.5 });
        else d.arrow(A.x + cw / 2, A.y + nh + 1, B.x + cw / 2, B.y - 1, { stroke: C.line, head: 6, lw: 1.5 });
      });
      Object.entries(nodes).forEach(([k, [label, , , col]]) => {
        const p = pos(k), on = ad.state === k;
        d.node(p.x, p.y, cw, nh, label, { accent: on ? col : C.lineSoft, lw: on ? 3 : 1.5, size: 13, color: on ? C.navy : C.faint, shadow: on ? 8 : 0, fill: on ? C.paper : C.card });
        if (on && (k === 'load' || k === 'show')) d.rect(p.x + 5, p.y + nh - 6, (cw - 10) * U.clamp(ad.t / (k === 'load' ? 1 : 1.6), 0, 1), 3, { fill: col, r: 2 });
      });
      d.text(AD_DESC[ad.state], x + 12, y + h - 30, { font: 'sans', size: 12, color: C.ink });
      d.text(`request ${ad.req} · fill ${Math.round((ad.filled / ad.req) * 100)}% · reward ${ad.rewards}`, x + 12, y + h - 12, { font: 'mono', size: 11, color: C.muted });
    }
    function drawRetention(x, y, w, h) {
      panel(x, y, w, h, 'Push → Retention', push ? `push ${hour}:00` : 'push tắt');
      const labels = ['D1', 'D7', 'D30'], top = y + 34, bottom = y + h - 22, maxV = 45, cols = 3;
      const area = w - 24 - (w > 300 ? 90 : 0), bw = Math.min(46, area / cols - 18);
      labels.forEach((lab, i) => {
        const cx = x + 12 + (i + 0.5) * (area / cols), v = retShown[i], bh = ((bottom - top - 14) * v) / maxV;
        const baseH = ((bottom - top - 14) * BASE[i]) / maxV;
        const col = push && UPLIFT[hour][i] < 0 ? C.red : C.teal;
        d.rect(cx - bw / 2, bottom - bh, bw, bh, { fill: col, r: 4 });
        d.line(cx - bw / 2 - 5, bottom - baseH, cx + bw / 2 + 5, bottom - baseH, { stroke: C.navy, lw: 1.5, dash: [4, 3] });
        d.text(`${v.toFixed(0)}%`, cx, bottom - Math.max(bh, baseH) - 10, { align: 'center', font: 'mono', size: 11, weight: 600, color: C.navy });
        d.text(lab, cx, bottom + 11, { align: 'center', font: 'mono', size: 11, color: C.muted });
      });
      if (w > 300) { // phone receiving a push
        const px = x + w - 70, py = top + 2, phH = Math.min(bottom - top, 90);
        d.rect(px, py, 50, phH, { fill: C.navy2, r: 8 }); d.rect(px + 4, py + 8, 42, phH - 16, { fill: C.paper, r: 4 });
        if (pushT >= 0) {
          const t = U.ease.outCubic(Math.min(1, pushT * 1.6)), bx = U.lerp(x + 12, px + 25, t);
          d.pill('push!', bx, U.lerp(top + 10, py + 22, t), { align: 'center', size: 11, fill: C.pink });
        }
        d.text(push ? 'FCM' : 'off', px + 25, py + phH / 2 + 8, { align: 'center', font: 'mono', size: 11, color: push ? C.pink : C.faint });
      }
    }
  },
});
