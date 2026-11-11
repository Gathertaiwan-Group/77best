# 77best（walk with …）行動版規劃

> 撰寫日期：2026-11-11 ｜ 對象：要動工的工程師、業主
> 範圍：只做規劃，本文件撰寫過程**沒有修改 `public/` 任何檔案、沒有 commit**。
> 證據位置格式：`檔名 @字元位移 / grep 關鍵字`。`main-Cfy0tOib.js` 同時有另一個 agent 在改首頁名字，位移可能會差幾百字元，**以 grep 關鍵字為準**。
> 實測截圖（已縮到 ≤1024px）：`/private/tmp/claude-501/-Users-aimand--claude-spares-spare-aXUI3F/b9b884bb-7d4c-47f7-943a-dd2f97186bec/scratchpad/mobile/preview/`，原圖在上一層 `mobile/`。實測腳本：同目錄上一層的 `run.js`、`perf.js`。

---

## 0. 一句話結論

直式手機的問題**不是「主程式在手機上跑不動」**。強制讓它跑的時候，觸控翻頁、點擊、影片都能正常運作。真正的問題是畫布用 **cover 縮放**，直式手機只看得到畫布寬度的 26%，字被切掉、可以點的物件落在畫面外。另外首屏要 3.3MB，iOS 上的音量控制也會失效。
**推薦：方案 C（另做一個直式行動版模組，共用現有素材），加上 Phase 0（橫式手機直接跑原本的主程式）。** 拿得到原始碼的話，再把成果併回原始碼（方案 A）。

---

## 1. 現況與限制

### 1.1 架構重點（行動版相關），附證據

| # | 項目 | 結論 | 證據 |
|---|---|---|---|
| 1 | 分流 | 入口在 `matchMedia('(max-width: 1023.98px)')` 成立時，**完全不載入主程式**，只把 `#narrow` 的 `narrow.webp`（1600×900、344KB）顯示出來，再加一行「best viewed on desktop」。跨過斷點時會 `location.reload()`。 | `index-B5WdSjKm.js @2200` grep `max-width: 1023.98px`；`index.html` 的 `#narrow` |
| 2 | 設計畫布 | 單頁設計尺寸是 2912×1632（`design_width` / `page_height`）。`page_tops` = main 0 / about 1452 / work 2904，`canvas_height` 4536，contact 的 snap 位置在 `contact_snap_canvas_y` 4966。 | `main @77933` grep `design_width:2912` |
| 3 | 縮放 | `Vi()`：`s = Math.max(vw/2912, vh/1632)`，也就是 **cover**，水平置中、垂直裁 `c`。`.frame`、`.contact__frame`、`.sub__frame` 全部套用 `translate(-50%) scale(s)`。 | `main @80474` grep `function Vi`、`Math.max(e/Ti,t/Ei)`；CSS `.frame{transform-origin:top;width:2912px;left:50%}` |
| 4 | 直式後果 | 390×844 的畫面 s=0.517，可見寬度 = 390/0.517 ≈ **754 設計 px，只有 2912 的 26%**。820×1180 平板直式約 39%，iPad Pro 1024×1366 直式約 42%（**這台現在就會載入主程式，而且已經被切**）。 | 實測 `mobile-forced-*`、`tablet-forced-01-home.png`；量到 `frameT … scale(0.517157)` |
| 5 | 翻頁 | 自製 pager，用 GSAP Observer 監聽 `wheel,touch`，`preventDefault`。觸控有阻尼追手（`damping .5`、`commitPx 110`、`touchFlickVelocity 600`），也有鍵盤。**觸控翻頁本身是好的**：實測往上滑三次，index 依序到 1、2、3。 | `main` grep `touchFlickVelocity:600`（config @1428）、`function Oo`（@~93300）、`__pager` |
| 6 | 捲動容器 | `#scroller` 是 `position:fixed; overflow:hidden; touch-action:none`，`html,body{overflow:hidden; overscroll-behavior:none}`。沒有原生捲動，**也不能雙指縮放**。 | `index-BA3eJcEA.css` grep `touch-action:none`、`overscroll-behavior:none` |
| 7 | 路由 | hash 路由：`#/`、`#/about`、`#/about/chongqing`、`#/about/new-york`、`#/work`、`#/work/{hackathon,huhuu,bedazzling,mist-story,dream-gallery}`。子頁座標同樣是 2912×1632。返回方式有箭頭、橫向滑動（觸控已實作）、瀏覽器上一頁。實測橫滑能回到 `#/work`。 | `main @~163800` grep `route:\`#/work`；觸控返回 grep `` window.addEventListener(`touchstart` ``（@305898） |
| 8 | 手寫字 | **不是字型**，每個字母是一張透明 PNG（`assets/` 底下 509 個 png，合計 2.37MB），每個字母自己帶 `{page,word,text,char,x,y,w,h,keyword,link}` 絕對座標。打字動畫用 GSAP timeline 逐字切換 `visibility`（config `text.typing`），離開時有 `scatter`。首頁字母資料 105 筆，涵蓋 main/about/work/contact 四頁。 | grep `` {page:`main`,word: ``（@~145000）；`function Hl`（@185156）；config grep `typing:{jitter` |
| 9 | 可點文字 | keyword（about/work）做成 `<button>`，link（linkedin/x/instagram）做成 `<a target=_blank>`。`pointerenter` 時會預載。**觸控點擊可以用**。 | grep `` className=`hotword` ``（`function Dl` @~177600） |
| 10 | 自訂游標 | 只有 `(hover: hover) and (pointer: fine)` 時才啟用，觸控裝置自動停用（實測 `has-cursor=false`）。 | `main @190902` |
| 11 | hover 系統 | 熱點放大 1.09 加 glow。另有 **idle 呼吸光**（`hover.idle`，delay .4s、period 3.6s），觸控上可以直接當成「可點」的提示。花朵推擠和視差靠 `pointermove`，而且**會濾掉 touch**，所以手機上只剩風吹和點擊漣漪。 | config grep `idle:{delay:.4`；grep `` e.pointerType!==`touch` ``（`function Fo`） |
| 12 | WebGL | 兩張背景切片（`bg_s1` 飛燕草、`bg_s2` 溪流）各有一個 WebGL canvas，**解析度等於原圖 2912×1452 / 2912×1812**，在視窗內就每幀重畫。`?webgl=off` 或 `prefers-reduced-motion` 時關閉。 | `main @198578` grep `` canvas`);o.width=e.naturalWidth ``；@199608 grep `` `webgl`)===`off` `` |
| 13 | 減少動態 | `Lo = matchMedia('(prefers-reduced-motion: reduce)')`：停 WebGL、雲停止飄、子頁改淡出。 | `main @95601` |
| 14 | 影片 | 6 支：直式 9:16 有 hackathon、huhuu、bedazzling、mistStory，橫式 16:9 有 chongqing、newYork。`preload=none`、`playsinline`，有 poster webp，點畫框播放／暫停。全部 faststart（moov 在前）。大小：hackathon 22MB/141 秒、huhuu 29MB/133 秒、newYork 8.8MB，其餘 1.7–5.9MB。橫式手機實測點擊後可以 inline 播放。 | config `videos:{hackathon:{aspect:.5625…`（@~600）；`main @268242` grep `d.volume=0`、`` sub__video-frame `` |
| 15 | 背景音樂 | bgm.m4a 2.8MB／174 秒／130kbps，兩個 `Audio` 交叉淡入做無縫循環，音量 0.3。第一個手勢（含 `touchend`）才開始播。**loader 一結束就 `preload=auto` 把 2.8MB 抓下來**，就算使用者從頭到尾沒聽也一樣（實測 m4a 2.82MB 在首 5 秒內下載完）。 | `main @266416` grep `` preload=`auto` ``；@266064 grep `` `touchend`,`wheel`] `` |
| 16 | **iOS 音量問題** | 音樂的淡入、交叉淡入、0.3 音量，以及影片的淡入和音樂閃避（duck），全部靠 `HTMLMediaElement.volume`。**iOS Safari 的 volume 是唯讀的**（永遠是 1），所以 iPhone 上：音樂會以 100% 音量直接切入，沒有淡入；影片播放時音樂不會閃避，兩條音軌全音量重疊。 | `main @263492` grep `e.volume=U.utils.clamp`；@268959 grep `this.video.volume` |
| 17 | 載入策略 | 圖片依頁面 index 分批：先載當前頁和 ±1 頁，loader 結束後 `Ja([1,2,3])` 把其餘頁全部載入。loader 等的是「第 0 頁 + main 字母 + 花」。 | `main @311803` grep `Ja([1,2,3])`；`function Ya` |
| 18 | 素材總量 | `public/` 共 84MB，其中影片 70MB、音樂 5.6MB（m4a+mp3 各一份）、`assets/` 11MB。背景全部是 2912 寬：bg_s1 1.17MB、bg_s2 1.10MB、meadow 1.57MB、contact_base 614KB、easel 兩張各約 600KB。 | `sips` 量測；`ls -l public/videos` |
| 19 | 解碼記憶體 | 2912 寬的背景解碼後每張 15–21MB（例如 2912×1812×4 = 21MB）。7 張背景、2 張 mask、2 個同尺寸 WebGL canvas，加上 260–340 個 `<img>`，粗估 **>150MB**，已經碰到 iOS Safari 分頁被殺的風險區。 | 由尺寸推算；DOM 實測 imgs 262（桌面）、339（強制手機） |
| 20 | viewport | `<meta viewport>` 沒有 `viewport-fit=cover`。高度用 `window.innerHeight`，resize 時重新排版（`stage:relayout`）。iOS 網址列收合也會觸發 resize，畫面會跳。 | `index.html`；`main` 結尾 grep `addEventListener(\`resize\`` |
| 21 | 原始碼 | 這個 repo 只有 Vite 打包後的成品。程式碼註解引用了 `SPEC §0/§9/§11` 和 `scripts/build-videos.mjs`，所以原 repo 確實存在。查 `gh repo list zilin-liu`，公開的只有 bedazzling、mist-glass-intro，**網站本體不是公開 repo**。 | config 裡 `note:` 字串；`index.html` 註解 |

### 1.2 「沒有原始碼、只能改壓縮碼」對可行性的影響

- `main-Cfy0tOib.js` 是 312KB 單行壓縮碼，**變數名每次重新打包都會換**。想在上面 patch 版面邏輯，只能靠字串取代，沒有測試、沒有型別，回歸風險高。原作者一旦重新部署新版，patch 就全部作廢。
- 反過來說，**資料是字面常數**：字母座標、子頁物件座標、影片 aspect、設定值，都以物件常數形式寫在 JS 裡，可以用腳本解析抽成 JSON。素材檔名也都是固定 hash 路徑。所以「**另寫一個讀同一批素材的行動版**」技術上可行，而且不用動主程式。
- 入口 `index-B5WdSjKm.js` 只有 2.5KB，邏輯可讀。分流條件改在這裡（或在 `index.html` 加一段 inline script）是**低風險**的。
- 要讓 iOS 音量正常，就得 patch 主程式裡兩處 `volume`，屬於小範圍字串 patch，風險可控（見 Phase 0／3）。

### 1.3 三條路的取捨（細節見 §4）

| | A 取回原始碼改 | B 在壓縮碼上 patch 直式模式 | C 另做行動版模組 |
|---|---|---|---|
| 依賴 | 原作者願意給 repo | 無 | 無 |
| 保真度 | 最高 | 美術最高，但閱讀性差 | 中高（同一批素材，動效精簡重做） |
| 維護 | 一份碼 | 每次原站更新就要重 patch | 兩份版面；資料由腳本從主程式抽，改名字之類會自動同步 |

---

## 2. 實測結果

環境：本機系統 Chrome（headless）透過 Playwright 打 https://77best.vercel.app 。iPhone 模擬用 390×844、DPR 3、`isMobile`、`hasTouch`、iOS UA。強制模式是 `addInitScript` 把 `max-width: 1023.98px` 的 matchMedia 改成回傳 `matches:false`。
> 注意：headless Chrome 跑在 Mac GPU 上，**FPS 數字不代表真機**（全部約 60fps）。效能結論以傳輸量、long task 為主，真機數據留給 Phase 4 驗收。

| 情境 | loader 消失 | loader 消失前傳輸 | 總傳輸（約 10 秒） | 其他 |
|---|---|---|---|---|
| 桌面 1440×900 | 1.18s | 3.3–6.4MB（批次載入中） | **11.1MB / 260 req**（webp 7.2MB、m4a 2.8MB、png 0.95MB、js 118KB） | 0 錯誤 |
| 手機直式・現況 | 0.23s | 5KB | **359KB / 5 req**（narrow.webp） | 只看得到一張縮小的橫圖 |
| 手機直式・強制主程式 | 1.18s | 3.26MB | **11.6MB / 332 req** | 滑動翻頁 1→2→3 正常；畫面只剩 26% 寬 |
| 同上，Fast 4G（9Mbps/60ms）＋CPU 4x | **4.0s** | 3.26MB | — | long task 2 個，合計 404ms，最長 331ms |
| 手機橫式 844×390・強制 | 1.16s | — | 7.7MB | s=0.29，**整張畫布看得到，體驗接近桌面** |
| 橫式子頁 hackathon，點畫框 | — | — | — | 影片 `paused:false, readyState 4` inline 播放；右滑回 `#/work` |
| 平板直式 820×1180・強制 | 1.23s | — | 7.7MB | s=0.723，只看得到 39% 寬 |

截圖（preview，≤1024px）：
- 現況手機：`…/mobile/preview/mobile-current-01-home.png`（深綠底，中間一張小橫圖）
- 強制直式首頁：`…/mobile/preview/mobile-forced-01-home.png`（標題被左右切掉，只剩「lk / ith Zi」）
- 強制直式 about：`…/mobile/preview/mobile-forced-02-about.png`（「about」整個字在畫面外，看不到入口）
- 強制直式 work：`…/mobile/preview/mobile-forced-03-work.png`（只看到布簾，「work」不在畫面上）
- 強制直式 contact：`…/mobile/preview/mobile-forced-04-contact.png`（「Say」「real.」被切，社群連結看不到）
- 強制直式 work 總覽：`…/mobile/preview/mobile-forced-05-work-overview.png`（5 件作品只看得到 HuHuu）
- 強制直式 hackathon：`…/mobile/preview/mobile-forced-06-hackathon.png`（畫架和影片幾乎全在畫面外）
- 強制橫式首頁：`…/mobile/preview/mobile-forced-landscape-01-home.png`（完整）
- 強制橫式 hackathon 播放中：`…/mobile/preview/mobile-forced-landscape-03-hackathon-playing.png`（完整）
- 平板直式：`…/mobile/preview/tablet-forced-01-home.png`
- 桌面對照：`…/mobile/preview/desktop-0{1,2,3,4,6,7}-*.png`

（`…` = `/private/tmp/claude-501/-Users-aimand--claude-spares-spare-aXUI3F/b9b884bb-7d4c-47f7-943a-dd2f97186bec/scratchpad`）

**從實測得到的判斷：**
1. 橫式手機已經可以用 → 擋掉它是損失。Phase 0 就該放行。
2. 直式的根本問題是畫布 1.78:1，螢幕 0.46:1。只調縮放救不回來：改成 contain 的話，s=0.134，字母只剩 10px 高。
3. 觸控翻頁、點擊、影片、返回手勢這些互動邏輯都是現成的，可以當行動版的行為參考。

---

## 3. 手機版體驗設計

### 3.1 裝置分流規則（取代現在的 `max-width:1023.98px`）

```
aspect = innerWidth / innerHeight
- aspect ≥ 1.3                    → 主程式（桌面、橫式手機、橫式平板）
- aspect < 1.3（直式手機、直式平板、窄桌面視窗）→ 行動版模組 /m
```
- 1.3 的依據：cover 裁切後可見寬 = aspect/1.784。aspect 1.3 時約保留 73%，再低主要字句就開始被切（例：iPad 4:3 橫式 1.33 → 75%，還可以接受）。
- 旋轉跨越門檻時：沿用現在 `change → location.reload()` 的做法（hash 會保留），但要先蓋一層主題色的轉場，不要讓畫面閃白。
- `?desktop=1` 和 `?mobile=1` 強制切換，方便 QA 和業主比對。

### 3.2 共同原則（直式行動版）

- **用版面重排，不用畫布縮放平移**。每一「頁」變成一個 100svh 高的直式場景（scene）。背景用從 2912 寬原圖**事先裁好的直式構圖**（新產 webp，見 §5），字母重新排成 2–4 行。
- **捲動**：保留「一頁一頁翻」的儀式感，但改用原生捲動 + CSS `scroll-snap-type: y mandatory`，不再用 `touch-action:none` 自己算手勢。iOS 慣性、可及性、雙指縮放都免費取得。翻頁動畫（打字、scatter）改由 `IntersectionObserver` 觸發。
- **字母重排**：抽出來的字母資料保留「字內相對座標」（同一個 word 裡各字母的 x/y 差），行動版只定義 **word 層級**的版面表 `{word, x, y, scale, rotate}`，單位是場景寬的 %。所以名字從 Zilin 改成 Kiara 這種改動，字母數變了也會自動排好。
- **手寫字尺寸**：標題字母高度 ≈ 9–11vw（390 寬約 35–43px），小字 ≈ 5–6vw，對應桌面版 `title/small` 兩級。
- **可點元素**：觸控熱區至少 44×44pt（hotword 外圍補 padding，沿用 `--hit-pad` 概念）。hover glow 改成兩層：①沿用 idle 呼吸光，作為常駐的「可點」提示；②`:active` / `pointerdown` 時直接觸發原本的 hover glow（scale 1.09 + glow）120ms 後導頁，讓手指有回饋。
- **游標效果的替代**：沒有游標光暈。改成**觸點光斑**：pointerdown 位置出現一次 radial glow（沿用 `cursor.blob.gradient`），淡出 0.4s。點到空白處觸發原本的花朵 click 漣漪和 pollen（`flowers.click.ripple`、`pollen`）。
- **長按**：不設計隱藏功能，長按等同點擊，同時用 `-webkit-touch-callout:none` 把系統圖片選單關掉。
- **Safe area**：viewport 加 `viewport-fit=cover`。返回箭頭和音樂開關用 `env(safe-area-inset-top/left/right)` 定位，底部的 hint 留 `env(safe-area-inset-bottom)`。高度一律用 `svh/dvh`，不用 `innerHeight`。
- **返回**：左上箭頭 44pt。iOS Safari 的左緣滑動本來就是瀏覽器上一頁，hash 路由天然支援，**不要再自己攔橫滑**，避免和系統手勢衝突（Android Chrome 同理）。

### 3.3 逐頁設計（以 390×844 為基準）

| 頁 | 背景（直式裁切，設計座標） | 內容與版面 | 互動 |
|---|---|---|---|
| **首頁 `#/`** | bg_s1 取 x≈1100–2150、整高 1452 → 約 0.72:1，上下延伸用主題色 #1f3a1c 漸層補，或請畫家補繪。主體是粉紅門、小徑、黃衣女孩。 | 標題分三行：`walk` / `with` / `{name}`，置中偏上，跟著原圖斜向排列（每行 rotate -4~4°）。左右下角放 daisy/rose/peony 縮小版（寬 28–35vw）貼邊。白花（`whiteFlower`）放右上。最下方放一個小小的 `↓` 手寫箭頭和 safe-area 間距。 | 打字動畫沿用 `text.typing` 的時間參數（第一次進來才播）。花朵擺動用 CSS/GSAP（只留 `amp_deg` 擺動，不做滑鼠視差）。點空白處：漣漪 + pollen。 |
| **about 段落** | bg_s2 取溪流＋瀑布 x≈900–1900 | `about ☺`（keyword，可點）在上；`a girl who / wants to see / a bigger world ✱` 三行。 | `about` 點了 → `#/about`。 |
| **work 段落** | bg_s3 + curtain_tail 取布簾右側到草地 x≈1500–2500 | `☀ work`（keyword）＋ `and some fun / she creates` | `work` 點了 → `#/work`。 |
| **contact 段落** | contact_base 取門＋雲 x≈1100–1800 | `Say hi` 這組手寫字重排；LinkedIn / X / Instagram 三個 hotword **改成直排，每個佔一行，熱區 ≥ 48pt**。門和雲的漂浮沿用 `contact.float`。 | 外連 `target=_blank`。 |
| **about 總覽 `#/about`** | meadow 直式裁切 | lantern（Chongqing）和 gramophone（New York）上下排列，各自配手寫標籤。 | 點物件 → 子頁。 |
| **work 總覽 `#/work`** | curtain 直式裁切（可以 `background-repeat:repeat-y` 延長，或用 `object-fit:cover`） | 5 組「物件＋手寫標籤」**單欄左右交錯**：teapot/Hackathon winner、mailbox/App: HuHuu、candle/Bedazzling、balloon/Mist-story、music-box/Dream gallery。每組約 60–70svh，**這頁允許自由捲動（不 snap）**。依序浮出用 `sub.overview`（groupGap .4、rise .55）參數，改成進入視窗時觸發。 | 點物件或標籤 → 子頁。 |
| **直式影片子頁**（hackathon、huhuu、bedazzling、mist-story） | curtain | 由上到下：返回箭頭 → **畫架＋影片**（easel-portrait 寬 92vw，9:16 影片剛好放進直式螢幕，是手機上的最佳展示）→ 手寫標題 `text.png` 寬 90vw → credits / try-it 按鈕（手寫圖 + 44pt 熱區）。 | 點畫框播放／暫停，`playsinline`，poster 用 `/videos/*.webp`。播放時音樂閃避（用 Web Audio gain，見 3.4）。離開頁面自動暫停。 |
| **dream-gallery** | curtain | 同樣有 easel-portrait 畫架（canvas 區，但**沒有影片**，資料裡沒有 `video:`），加上文字和 `join-event` 按鈕 | 外連。 |
| **橫式影片子頁**（chongqing、new-york） | meadow | easel-landscape 寬 100vw（16:9 影片在直式只有約 220px 高）。**另外提供「⤢ 全螢幕」按鈕**，呼叫 `video.webkitEnterFullscreen()`（iOS）/ `requestFullscreen()`，讓使用者轉成橫向觀看。下方放 gramophone/lantern 和文字。 | 同上。 |

### 3.4 媒體、音樂與系統行為

- **影片**：`playsinline muted=false preload="none"`，poster 一律指定。用 `IntersectionObserver` 離開視窗就 `pause()`。長片（hackathon 141 秒、huhuu 133 秒）建議另出手機版本（540×960、約 0.8Mbps，H.264 High、faststart），用 `<source media>` 或 JS 依 `navigator.connection.saveData` / 螢幕寬選檔。
- **音樂**：
  - **改用 Web Audio**：`AudioContext` → `MediaElementSource` → `GainNode`。淡入、交叉淡入、0.3 音量、閃避都改調 gain，才能在 iOS 正常運作。`AudioContext.resume()` 必須在第一次 `touchend/click` 的事件處理器裡同步呼叫。
  - **不要預載**：只有在使用者第一次互動、而且音樂設定不是 off 時才開始抓。行動版另出 64kbps AAC（約 1.4MB）。
  - 開關沿用 `music on/off` 手寫圖，放右上 safe-area 內，熱區 44pt。記憶 key 沿用 `walk-with-zilin:music`（localStorage，要包 try/catch）。
  - iOS 靜音開關：Web Audio 在靜音模式下不出聲是預期行為，不處理。
  - `visibilitychange` 時淡出暫停，沿用現有的 `hiddenFade` 行為。
- **橫直式切換**：直式模組在 `orientationchange` 進入橫式、而且 aspect ≥ 1.3 時，依 §3.1 reload 到主程式，hash 保留，所以使用者會停在同一頁。正在播影片時（`document.fullscreenElement` 或 `webkitDisplayingFullscreen`）**不要 reload**。
- **平板 768–1023**：直式 → 行動版模組，但場景內容 `max-width: 720px` 置中，work 總覽改成**兩欄**交錯，字母尺寸上限 64px。橫式 → 主程式（aspect 1.33–1.44，主要內容大致都看得到）。iPad Pro 12.9 直式（1024×1366）也走行動版模組（現在是被切 58% 的主程式）。

---

## 4. 效能預算

| 指標 | 現況（強制主程式・手機） | 行動版目標 |
|---|---|---|
| 首屏傳輸（loader 消失 / LCP 前） | 3.26MB | **≤ 600KB**：HTML+CSS+JS ≤ 80KB gzip、首景背景 ≤ 250KB、main 字母 PNG ≤ 120KB、花 ≤ 100KB |
| LCP（Fast 4G + CPU 4x） | loader 消失要 4.0s | **≤ 2.5s** |
| 前 30 秒總傳輸（不含影片） | 11.6MB（含 m4a 2.8MB） | **≤ 2.5MB**，其餘場景進入前 1 屏才載 |
| JS 主執行緒 long task | 2 個，最長 331ms | 任何單一 task ≤ 100ms |
| 解碼圖片記憶體 | 推估 >150MB | **≤ 60MB**：同時只保留當前 ±1 場景的背景 |
| 音樂 | 自動預載 2.8MB | 0（使用者開啟後才載，1.4MB） |

**圖片分級**（由腳本從 `public/assets/bg/*.webp` 產生，不覆蓋原檔，輸出到 `public/m/img/`）：
- 背景直式裁切：`@2x` 寬 780px（主檔，約 120–250KB，webp q≈72）、`@3x` 寬 1170px（只給 DPR 3 而且不是 saveData 時用）。用 `<img srcset sizes="100vw">`。
- 物件（easel、teapot…）：依手機顯示寬度 ×2 重新輸出。例如 easel-portrait 原圖 1245×2072、557KB，手機顯示 360pt → 輸出 720 寬，約 150KB。
- 字母 PNG：沿用原檔（多半 <10KB）。第二階段可以把每頁字母合成 sprite，減少 request（目前光 main 頁就要幾十個 request）。
- 首景背景用 `<link rel=preload as=image imagesrcset>`。非首景用 `loading=lazy decoding=async`，再加上 IntersectionObserver `rootMargin: 100% 0px` 預抓下一景。

**WebGL 降級**（飛燕草擺動、溪流光）：
- 手機預設**關閉**，改成 CSS 版：溪流用 `stream_mask` 當 mask，疊一層慢速平移的 `linear-gradient` 光帶（只用 `transform`，交給 GPU 合成）；飛燕草用 2–3 張切圖做 `rotate` 擺動，或乾脆不動。
- 下列條件**全部**成立才開 WebGL：`!prefers-reduced-motion`、`!saveData`、`navigator.deviceMemory ≥ 4`（Safari 沒有這個 API，當作不成立 → iOS 預設關）、使用者不在「省電」狀態。另外 canvas 解析度上限 = CSS 尺寸 × min(DPR, 1.5)，**絕不能用 2912 原尺寸**。
- 監看：每 2 秒算一次平均幀時間，超過 22ms 就自動切回 CSS 版，而且這個 session 不再切回來。
- `document.hidden` 或場景不在視窗時停止 rAF。

**減少動態／低電量**：
- `prefers-reduced-motion: reduce`：不播打字（字直接出現），不擺動、不漂浮，snap 換頁改淡入，WebGL 關。
- iOS 低耗電模式會把 rAF 限到 30fps，而且沒有 API 可以偵測。所以所有動畫都用 GSAP 的時間基準（不能用幀數基準），30fps 下才會一樣順。
- `Save-Data` / `connection.effectiveType` 是 2g/3g 時：只用 @2x 圖、影片 poster 加上「點擊載入」的提示、不預抓下一景。

---

## 5. 實作方案比較

### 方案 A：取回原始碼，在原始碼加入直式模式
- 做法：向原作者要網站 repo（含 SPEC.md、`scripts/build-videos.mjs`）。在 `Vi()` 這一層加一個 `layout: 'portrait'` 分支，資料檔多一份 portrait 座標表，Vite 照原流程打包。
- 工時：拿到 repo 之後約 **8–12 人日**。
- 風險：**能不能拿到 repo 不在我們手上**；要理解原作者的架構；對方未必接受我們的改動。
- 保真度：最高（同一套動效引擎）。

### 方案 B：直接在壓縮碼上 patch「直式鏡頭模式」
- 做法：patch `Vi()`，直式改成 `s = vh/1632 × k`，再 patch pager，把每頁拆成「水平平移的幾個停點」，每頁大約 3–4 個停點，觸控上下滑時鏡頭左右走。
- 工時：約 **6–10 人日**。
- 風險：**高**。312KB 壓縮碼靠字串取代、沒有測試；原作者重新部署就作廢；平移時字句會被切成好幾段（「walk with Kiara」橫跨 x≈500–2300），閱讀感很差；記憶體和首屏問題完全沒解決。
- 保真度：美術 100%，但閱讀性和可用性都差。**不推薦**。

### 方案 C：另做直式行動版模組（**推薦**）
- 做法：
  1. `tools/extract-data.mjs`：解析 `main-*.js`，把字母表（`{page:…}` 陣列）、子頁表（`pages:{work…}`）、config（`r={links,videos,music,…}`）、素材 hash 路徑抽成 `public/m/data.json`。每次主程式更新（例如改名字）重跑一次就同步。
  2. `tools/build-mobile-images.mjs`：用 sharp 依版面表產生直式背景和 @2x/@3x 物件圖。
  3. `public/m/`：一個小型 vanilla JS + GSAP（只用 core，約 25KB gz）app，以 Vite 另外打包進 `public/m/`，與主程式完全獨立。hash 路由**沿用同一套路徑**，分享連結桌面和手機通用。
  4. 分流：`index.html` 的 `<head>` 加一段 inline script，在 module 載入前依 §3.1 判斷，直式就換成載入 `/m/app.js`（同一個網址，不轉址），橫式維持原入口。原入口裡的 `max-width` 判斷要同步拿掉或改條件（這是 2.5KB 可讀檔，低風險）。
- 工時：約 **12–15 人日**（含 Phase 0–4）。
- 風險：中。新碼可以測試；主程式不動（除了 Phase 0 的入口條件和 iOS 音量 patch）。主要風險在美術：直式裁切構圖需要業主或畫家確認。
- 保真度：中高。同一批手繪素材和打字節奏；WebGL 在手機上降級是刻意取捨。

**推薦**：做 **C**，Phase 0 先上（橫式放行 + 改善直式靜態頁）。同時請業主問原作者要原始碼：拿得到的話，Phase 4 之後把 C 的版面表和元件移植進原 repo（A），收斂成單一程式碼。拿不到的話，C 本身就是完整的長期方案。

---

## 6. 分階段實作與驗收

> 每個 Phase 都在分支上做，用 Vercel preview 網址驗收，通過才合併 main（main push 會自動部署 77best.vercel.app）。
> 真機矩陣（最低限度）：iPhone SE 2/3（375×667，iOS Safari）、iPhone 15 或 16（393×852，iOS Safari）、Android 中階機（如 Pixel 6a 或三星 A5x，Chrome）、iPad 10 代直式和橫式（Safari）。另外 Playwright 自動化跑 390×844、375×667、820×1180、844×390。

### Phase 0：分流與快速改善（0.5–1 人日）
- 入口改成依 aspect 分流（§3.1）。aspect ≥ 1.3 的觸控裝置載入主程式。
- `index.html` 的 viewport 加 `viewport-fit=cover`。
- 直式暫時頁（`#narrow`）升級：保留靜態圖，加上「轉成橫向觀看完整體驗」的手繪提示，加上 Work 5 件、About 2 件、LinkedIn/X/Instagram 的純連結清單（大字、44pt），讓直式使用者至少能找到作品和聯絡方式。
- **驗收**
  - [x] Playwright：844×390、932×430、1024×768 載入主程式，`__pager` 存在，四頁和 9 個子頁都進得去並截圖。390×844、375×667 顯示升級後的暫時頁，連結全部 200。（2026-11-11 自動驗證：四頁＋9 個子頁截圖，零 ≥400、零 console error；外連 LinkedIn 對 curl 回 999、hackathon 頁對 curl 回 429 屬防機器人，瀏覽器實開 200）
  - [ ] （真機未測）真機 iPhone 橫拿：首頁到 contact 滑動翻頁正常；hackathon 影片 inline 播放；左上箭頭能點中（記錄點 10 次的命中次數，≥9/10）。
  - [x] 直式轉橫式時頁面 reload 後停在同一個 hash。（Playwright setViewportSize 模擬，`#/work/huhuu` 保留；真機未測）
  - [x] 桌面 1440×900 行為和改版前截圖逐頁比對一致。（另含 1280×800、1024×768；請求清單一致）

### Phase 1：行動版骨架 + 四個主場景（4–5 人日）
- 寫 `extract-data.mjs`、`build-mobile-images.mjs`、`/m` app 殼（scroll-snap、場景元件、字母排版引擎、打字動畫、hotword）。
- 首頁、about、work、contact 四個場景，加上 word 層級版面表。
- **驗收**
  - [x] 390×844、375×667、430×932 截圖：每個場景所有字母都在 safe area 內，沒有被切（自動檢查：每個字母 `getBoundingClientRect` 都落在 viewport 與 content box 內，行與行 AABB 重疊 <12%）。另加測 820×1180。**（2026-11-11 自動驗證，Playwright＋系統 Chrome，16/16 場景通過）**
  - [x] 首屏傳輸 ≤ 600KB；Fast 4G + CPU 4x 下 LCP ≤ 2.5s（Playwright + CDP 量測，附 log）。**（自動驗證：首屏＝首景背景＋標題字母解碼完成前傳輸 448KB（手機）／579KB（820 平板）；LCP API 400–470ms、首屏完成 590–670ms；gzip 靜態伺服器模擬 Vercel）**
  - [x] about/work hotword 點擊會導到正確 hash；LinkedIn/X/Instagram 開新分頁到正確網址。**（自動驗證；`#/about`、`#/work` 目前是 Phase 2 前的占位頁＋返回箭頭）**
  - [x] 重跑 `extract-data.mjs` 後首頁名字自動更新（用目前的名字驗）。**（自動驗證：重跑輸出不變、名字取自 bundle＝Kiara；`tools/test-engine.mjs` 另測 4/5/6/8/11 字母名字在 4 種尺寸都排得進去）**
  - [ ] 真機 iOS Safari：snap 翻頁順暢，網址列收合時版面不跳。**（真機未測；headless 以合成觸控滑動驗過 snap 一定停在場景邊界）**

**Phase 1 實作紀錄（分支 `mobile-v1`）**
- 工具：`tools/extract-data.mjs`（零依賴，產 `public/m/data.json`）、`tools/build-mobile-images.mjs`（sharp，產 `public/m/img/` 與 `manifest.json`）、`tools/test-engine.mjs`。`cd tools && npm i && npm run all` 一次重跑三者；產物要 commit（Vercel 不 build）。
- 版面表：`public/m/layout.js`（場景裁切、word 層級版面、物件），app 與出圖腳本共用。word 以 `${page}-${NN}` 定址，不綁文字。
- App：`public/m/app.js` 匯出 `mount(container, opts)`／`preload()`；`public/m/index.html` 是獨立測試頁。GSAP 3.15.1 core 在 `public/m/vendor/`。
- 已知取捨：首景固定用 @2x 背景（DPR3 也一樣）以守首屏預算；LCP API 在 Chrome 把滿版背景圖排除，量到的 LCP 元素是花朵，所以另記「首屏完成」時間。

### Phase 2：子頁與影片（3–4 人日）
- work 總覽、about 總覽、6 個影片子頁、dream-gallery。返回箭頭，瀏覽器上一頁。
- 影片手機版轉檔（業主同意之後）。
- **驗收**
  - [ ] 9 個子頁路由，直接開深連結（例：`/#/work/huhuu`）都能正確顯示。
  - [ ] iOS Safari 真機：每支影片點擊後 inline 播放，不會自動跳全螢幕；橫式影片的「全螢幕」按鈕可用；離開子頁影片會停。
  - [ ] Android Chrome 真機：同上，加上系統返回鍵回到上一層。
  - [ ] 子頁所有熱區 ≥ 44×44pt（自動檢查 bounding box）。

### Phase 3：動效、音樂、無障礙（2–3 人日）
- 花朵擺動、觸點光斑、漣漪/pollen、雲漂浮、場景進出的 scatter。
- Web Audio 音樂（行動版），並把同樣的 gain 修法 **patch 進主程式**，讓橫式 iPhone 也正確（兩處 `volume` 改成 gain，必須做 patch 前後比對）。
- `prefers-reduced-motion`、Save-Data 分支，WebGL 條件開啟和自動降級。
- **驗收**
  - [ ] iPhone 真機：音樂淡入（錄影確認不是瞬間全音量）；播放影片時音樂閃避；切到背景時淡出。
    - 主程式音量 patch（2026-11-11）：音樂與子頁影片的音量已改走 Web Audio GainNode（不支援時退回 `.volume`）。已自動驗證：模擬 iOS 忽略 `volume` 時，淡入 0→0.3（2.5s）、影片閃避、復原、背景淡出、循環交叉淡入的 gain 曲線都和桌面原行為一致；桌面截圖與請求清單不變。觸控裝置（`hover:none` 且 `pointer:coarse`）不再預載 bgm。**真機未測**。
  - [ ] 開啟「減少動態效果」：沒有打字動畫和擺動，內容完整。
  - [ ] 中階 Android 用 Chrome DevTools Performance 錄 10 秒捲動：沒有 >50ms 的 long task 連發，掉幀率 <5%。

### Phase 4：效能和真機總驗收（2 人日）
- **驗收**
  - [ ] 真機矩陣全部走完「首頁 → about → Chongqing 播影片 → 返回 → work → HuHuu 播影片 → contact 點 Instagram」，錄影存證。
  - [ ] iPhone SE 連續走完兩輪不會 reload 或閃退（記憶體）。Safari Web Inspector 的 Memory 時間線峰值 < 300MB。
  - [ ] Lighthouse mobile：Performance ≥ 85、Accessibility ≥ 90。
  - [ ] 桌面版回歸截圖比對無差異。
  - [ ] 派一個沒參與實作的 agent 照本清單重驗一次（重要改動，>5 檔）。

---

## 7. 需要使用者／業主決定或提供

1. **原始碼**：能不能向原作者取得網站 repo（含 SPEC.md、build 腳本）？會影響最後要不要收斂成方案 A。
2. **直式呈現方式**：同意「直式重排的故事捲動」（推薦），還是堅持「原畫布 + 鏡頭平移」（方案 B，不推薦）？
3. **橫式手機直接跑完整桌面版**（Phase 0）可以嗎？
4. **直式構圖**：各場景的裁切範圍需要美術確認。要不要請畫家**補繪直式延伸**（尤其首頁上下兩端、contact）？補繪的話保真度會明顯提高，但多一筆外包成本和時間。
5. **WebGL 效果**在手機上預設關閉、改成 CSS 版，可以接受嗎？
6. **音樂**：手機上維持「第一次觸控就自動播放」，還是改成預設關閉、由使用者手動開？（推薦預設關閉，因為手機上意外出聲的觀感差。）
7. **影片**：同意另出手機用低碼率版本嗎？hackathon（2:21）和 huhuu（2:13）要不要改成精華版，或外連 YouTube/Vimeo？
8. **名字／文案定案**：首頁名字正在由另一個任務修改中（資料目前是 `Kiara`）。行動版的字母資料會從主程式自動抽取，但請先確認最終文案，避免版面表要重排。
9. **平板直式**：要用手機版單欄（較省工），還是要專門的兩欄版面（本文件預設兩欄，+0.5 人日）？
10. **網址策略**：同一個網址自動分流（推薦，分享連結通用），還是開 `/m` 獨立路徑？
