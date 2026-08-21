# AYLIN — 21+

Mobil öncelikli, yetişkinlere özel (21+) kurgusal sexting sohbet uygulaması. Aylin; 24 yaşında, Kadıköy'de yaşayan, tamamen kurgusal bir karakterdir. Tüm senaryolar ve görseller kurgudur ve yalnızca yetişkinler arasındadır.

> AYLIN bağımsız bir üründür — VICEBLOCK ile ilgisi yoktur. CA yok, token yok, NFT yok, paywall yok.

## Özellikler

- iMessage tarzı karanlık pembe/altın telefon sohbeti: avatar, çevrimiçi durumu, "yazıyor…" noktaları, baloncuk kuyruğu, zaman etiketleri
- İlk açılışta 21+ yaş kapısı; Aylin ilk mesajı kendisi atar ve sohbeti o yönetir
- Fantezi çipleri: `OTEL · DUŞ · BALKON · TAKSİ · OFİS · SESLİ` — çipe basınca temalı fotoğraf + kısa mesajlar gelir
- Fotoğraf baloncukları: Aylin sohbete gerçek bir kız gibi captionlı fotoğraf atar (`public/aylin/` altında 9 özgün görsel); profiline dokununca galeri açılır, göndermedikleri kilitli/bulanık görünür
- Sesli mesaj baloncukları: dalga formu + süre + fısıltı transkripti (metin olarak)
- "Instant first beat": gönder tuşu asla askıda kalmaz — önce anlık kısa bir tepki düşer, model cevabı arkasından dolar
- Son 40 mesaj `localStorage`'da saklanır; başlıktaki ok ile sohbet sıfırlanır
- `XAI_API_KEY` yoksa uygulama yine tam çalışır: zengin yerel dirty-talk motoru devreye girer
- Sert güvenlik hattı: 21 yaş altı / okul / genç iması geçen her mesaj hem istemcide hem sunucuda anında reddedilir ve yetişkin oyuna geri döndürülür

## Stack

- Vite + React 19 + TypeScript (strict), tek bağımlılık seti, Vercel'e hazır
- `api/chat.ts` — xAI Grok'u çağıran Vercel serverless fonksiyonu
- `vite.config.ts` içindeki dev middleware aynı handler'ı `npm run dev`'de sunar (`vercel dev` gerekmez)
- Kilitli sistem promptu: `server/persona.ts` (istemciden asla değiştirilemez)

## Kurulum (lokal)

```bash
npm install
cp .env.example .env.local   # istersen XAI_API_KEY doldur
npm run dev                  # http://localhost:5173
```

Anahtar girmezsen sohbet yerel motorla oynanabilir halde kalır.

```bash
npm run build                # tsc -b && vite build
```

## Vercel'e kurulum

1. Repoyu Vercel'e import et — framework otomatik **Vite** algılanır, ekstra ayar gerekmez (`api/` klasörü serverless fonksiyon olarak deploy edilir).
2. API anahtarını ekle — Dashboard'dan: **Project → Settings → Environment Variables** altında `XAI_API_KEY` değerini Production (+ Preview) için ekle. CLI ile:

```bash
vercel env add XAI_API_KEY production
vercel env add XAI_API_KEY preview
# opsiyonel, varsayılanı grok-3-mini:
vercel env add XAI_MODEL production
```

3. Yeniden deploy et (env değişiklikleri yeni deploy ile etkinleşir):

```bash
vercel --prod
```

Anahtar `https://console.x.ai` üzerinden alınır. `XAI_MODEL` boş bırakılırsa `grok-3-mini` kullanılır.

## Nasıl oynanır

1. Yaş kapısında **21+** onayı ver.
2. Aylin ilk mesajı atar — cevap yaz ya da alttaki fantezi çiplerinden birine bas.
3. `SESLİ` çipi sesli mesaj (dalga formu + transkript) getirir; diğer çipler temalı fotoğraf + mesaj.
4. Ondan fotoğraf istemek için "foto at" yazman yeterli.
5. Üstte Aylin'in adına/avatarına dokun → profil ve fotoğraf galerisi. Sohbette gönderdiği fotoğraflar galeride açılır, kalanlar kilitlidir.
6. Sağ üstteki ok ile sohbeti sıfırlayabilirsin.

## API sözleşmesi

`POST /api/chat`

```json
{ "messages": [{ "role": "user", "content": "..." }] }
```

- `200 { "reply": "...", "source": "grok" | "guard" }`
- `503 { "error": "no_key" }` → istemci yerel motora düşer
- Model fotoğraf göndermek için cevabında `[FOTO:id]` etiketi kullanır (`ayna, yatak, balkon, dus, otel, taksi, saten, dudak, boyun`), sesli mesaj için `🎙️` öneki — ikisini de istemci baloncuğa çevirir.

## Güvenlik çizgisi

- Aylin ve tüm senaryolar kurgusaldır; karakter 24 yaşındadır, kullanıcı 21+ olmalıdır.
- 21 yaş altı, okul/öğrenci/genç iması içeren her girdi `shared/safety.ts` tarafından (istemci + sunucu) modele ulaşmadan reddedilir; sistem promptu da aynı sınırı taşır.
- Gerçek kişi, ensest, şiddet ve rıza dışı içerik kalıcı olarak kapalıdır.

## Görseller

`public/aylin.jpg` (avatar) ve `public/aylin/*.jpg` (sohbet fotoğrafları) özgün, stilize placeholder'lardır — istediğinde aynı isimlerle kendi portrelerinle değiştirebilirsin; kod dokunma gerektirmez. Avatar bozuksa/yoksa arayüz otomatik monogram fallback gösterir.
