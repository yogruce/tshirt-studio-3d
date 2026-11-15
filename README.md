# 👕 3D T-Shirt Studio & Tam 2D Kalıp Editörü

Tarayıcı üzerinde çalışan, **gerçek zamanlı 3D Tişört (Kısa Kollu & Uzun Kollu) önizleme sahnesi** ile **5 parçalı 2D dikiş kalıbı (UV) editörünü** birleştiren stüdyo uygulaması. Ayrıca **PromptVault** ile çift yönlü entegrasyon ve dış projelere modül olarak import edilebilen **JS / FastAPI Eklenti SDK'sı** içerir.

---

## 🚀 Tek Tıkla Kurulum ve Çalıştırma (Windows)

1. **`baslat.bat`** dosyasına çift tıklayın.
   * İlk çalıştırmada gerekli paketleri (`npm install`) otomatik kurar.
   * Yerel sunucuyu (`http://localhost:5173`) başlatır ve tarayıcınızı otomatik açar.
2. **`kurulum.bat`**: Bağımlılıkları kurar ve `dist/` üretim paketini derler.
3. **`guncelle.bat`**: GitHub üzerinden son güncellemeleri çeker (`git pull`) ve projeyi yeniden derler.

### Manuel Kurulum (Terminal)
```bash
npm install
npm run dev
```

---

## ✨ Temel Özellikler

* **Kısa Kollu ve Uzun Kollu 3D Modeller:**
  * **Kısa Kollu · Oversize Crew Neck** (`public/models/tshirt_short.glb`)
  * **Uzun Kollu · Long Sleeve Crew Neck** (`public/models/tshirt_long.glb`)
  * Modeller tamamen **düz, logosuz ve tek renk** olarak açılır.
* **Tam 2D Kalıp Editörü (Alt Panel):**
  * `Neck rib - front / back` (Yaka ribanası), `Right sleeve` (Sağ kol), `Left sleeve` (Sol kol), `Front` (Ön gövde) ve `Back` (Arka gövde) kalıpları.
  * Bilgisayarınızdaki **PNG, SVG, JPG, WebP** tasarımlarını doğrudan kalıpların üzerine **sürükleyip bırakarak** ekleyebilirsiniz.
  * Boyutlandırma, döndürme, yatay çevirme (`↔ Çevir`), kalıpta ortalama ve metin (`T`) ekleme araçları.
  * Dinamik `mm`, `cm`, `in` cetvelleri.
* **Kalıp Renkleri ve Stüdyo Işıklandırması (Sağ Panel):**
  * Gövde, kollar ve yaka ribanasını birlikte veya ayrı ayrı renklendirme.
  * Penye kumaş kabartma dokusu (*Normal Map*) ve gerçekçi kıvrım gölgeleri (*Ambient Occlusion*).
  * Yaprak gölgesi (*Leaf shadow*), pencere ışığı (*Window blinds*), HDRI ışık şiddeti ve açısı kontrolü.
* **Çıktı & Render (Export):**
  * **Şeffaf PNG İndir (2048×2048 Ultra HD)**
  * **Stüdyo Arka Planlı PNG İndir (2048×2048 Ultra HD)**
  * **360° Dönen Vitrin Videosu İndir (WebM / 60 FPS)**
  * **2D Kalıp Planı PNG İndir**

---

## ◈ PromptVault ile Birlikte Kullanım (3 Farklı Yöntem)

### Yöntem 1: Uygulama İçi Canlı PromptVault Köprüsü (Hazır)
1. PromptVault uygulamanız `http://127.0.0.1:7860` adresinde açıkken, 3D T-Shirt Studio sol alt araç çubuğundaki **`◈` (PromptVault Kasası)** butonuna tıklayın.
2. PromptVault içindeki **Projelerinizi (Workspaces)** filtreleyebilir, prompt/etiket araması yapabilir ve kasanızdaki herhangi bir görsele tıklayarak doğrudan seçtiğiniz kalıp parçasına (`Ön Gövde`, `Arka Gövde`, `Sağ Kol`, `Sol Kol`) yerleştirebilirsiniz.
3. Sağ alttaki **`◈ Render'ı PromptVault'a Kaydet`** butonu ile hazırladığınız 3D tişört tasarımının Ultra-HD PNG çıktısını tek tıkla doğrudan PromptVault kasanıza (`3d-mockup`, `tshirt-studio` etiketleriyle) kaydedebilirsiniz.

---

### Yöntem 2: JavaScript Eklenti Modülü Olarak Import Etme (`tshirt-studio-sdk.js`)
PromptVault'un kendi web arayüzüne (`promptvault/web/static/index.html`) veya herhangi bir web uygulamasına tek satırla **3D T-Shirt Modalı** ve galeri kartları üzerine **"👕 3D Dene"** butonu ekleyebilirsiniz:

```html
<script type="module">
  import { TShirtStudio } from 'http://localhost:5173/plugin/tshirt-studio-sdk.js';

  // 1) PromptVault galeri kartlarına otomatik "👕 3D Dene" butonu ekler:
  TShirtStudio.enablePromptVaultAutoButtons({
    studioUrl: 'http://localhost:5173',
    pvUrl: 'http://127.0.0.1:7860'
  });

  // 2) Veya istediğiniz yerde programatik olarak 3D Stüdyo Modalını açın:
  // TShirtStudio.openModal({ pvId: 42, piece: 'front', model: 'short' });
</script>
```

Ayrıca istediğiniz bir `<div>` içerisine gömülü modül olarak da bağlayabilirsiniz:
```js
const studio = TShirtStudio.mount('#myContainer', { model: 'long' });
studio.loadDesign('http://127.0.0.1:7860/api/images/15/file', 'back', 'Sırt Baskısı');
studio.setColor('#18191b');
```

---

### Yöntem 3: Python FastAPI Modülü Olarak PromptVault'a Bağlama (`promptvault_tshirt_plugin.py`)
Ayrı bir port açmaya gerek kalmadan, 3D T-Shirt Studio'yu doğrudan PromptVault'un kendi FastAPI sunucusu (`http://127.0.0.1:7860/tshirt-studio`) altında çalıştırmak için `promptvault/web/app.py` dosyasına şu 2 satırı ekleyebilirsiniz:

```python
from promptvault_tshirt_plugin import mount_tshirt_studio

# create_app() içinde:
mount_tshirt_studio(app, studio_dist_dir=r"C:\Users\yogru\.gemini\antigravity\scratch\tshirt-studio-3d\dist")
```
Bu sayede:
* `http://127.0.0.1:7860/tshirt-studio/` adresinde doğrudan 3D stüdyo açılır.
* `http://127.0.0.1:7860/tshirt-studio/plugin/tshirt-studio-sdk.js` adresinden JS SDK'sı sunulur.
