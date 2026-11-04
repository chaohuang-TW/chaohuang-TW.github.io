# 正式角色素材：五科雙姿勢

五名正式角色保留已認可idle，並各自接入同名attack.png攻擊關鍵姿勢，共十張原圖。均經正常Library下載與實際看圖，src/art.js同時提供heroAssets及heroAttackAssets。以下為idle檔名：

- 國語：01-mandarin-rune-swordsman-idle.png
- 英文：02-english-spell-mage-idle.png
- 數學：03-mathematics-shield-knight-idle.png
- 社會：04-social-studies-navigator-idle.png
- 自然：05-natural-sciences-elementalist-idle.png

十檔皆為1024×1536 RGBA真透明全身直幅，alpha範圍0–255。每張為靜態關鍵姿勢；兩姿勢切換與CSS／SVG程式動畫組合為動作，並非多幀手繪或骨架動畫。檔案與下載原圖逐byte相同，沒有裁切或改像素；原有數學圖與母包也相同。保留完整武器、特效與安全邊，介面用 object-fit: contain 等比呈現。

角色名字、科目與技能在 src/data/index.js；該檔舊 asset / position 欄位不作載入依據。未來若素材缺失，介面仍保留同尺寸並明示待整合；目前十個正式檔案均已存在。五人實際桌機／手機畫面驗收請看 docs/QA.md，素材來源、Library ID、alpha邊界與歷史阻擋見 docs/ASSETS.md。

不得放入來源不明或未授權參考站素材；更換素材時須保留生成歷史及來源記錄。整隊概念圖僅作風格參考，不裁切為單人素材。
