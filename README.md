# asya artin — 21+

Mobil öncelikli, yetişkinlere özel (21+) kurgusal sexting sohbet uygulaması. Asya Artin; 24 yaşında, İstanbul'da yaşayan, tamamen kurgusal bir karakterdir. Tüm senaryolar ve görseller kurgudur ve yalnızca yetişkinler arasındadır.

> Bağımsız bir üründür — VICEBLOCK ile ilgisi yoktur. CA yok, token yok, NFT yok, paywall yok.

## Karakter ve ses

- Gece yarısı X'te yer imlerine eklenen birinci tekil, açık sözlü Türkçe gönderilerin sesi: hal dökümü + emir, 2-5 kısa balonluk seriler (gerçek biri gibi peş peşe mesaj), küçük harf, başparmak typoları, inleme uzatmaları ("Ahhhhhh aşkımmmm" / "offf azdımmm" tarzı — seri başına 1-2 kelime). Karşısındakinin adını bilir ("emin" ya da "aşkım" der, asla "kullanıcı"). Soru sormaz, sohbet açıcı klişe kullanmaz, edebiyat yapmaz; sinematik motifler (ruj, balkon sigarası, saten) yasaklıdır.
- Register analizi ve yasaklı eski motif listesi: `server/tweet-voice.md` (dahili not; UI'da yayınlanmaz).
- Tüm konuşma içeriği **Grok**'tan gelir. Yerel cevap korpusu yoktur; oturum açılışını bile Grok yazar.
- Sert güvenlik hattı: 21 yaş altı / okul / genç iması geçen her girdi hem istemcide hem sunucuda modele ulaşmadan, karakter içinden reddedilir.

## Görünüm

- Gece notu + grenli fotoğraf esteti: krem / ten / kurumuş kan kırmızısı, neredeyse siyah zemin. Neon yok, bonbon yok.
- Yaş kapısında tam ekran `asya.jpg`, koyu perde ve ince film greni. İsim editorial serif (Playfair Display), mesajlar ham sans.
- Composer bir not defteri alanı gibi; fantezi tetikleyicileri (`otel · duş · balkon · taksi · ofis · sesli`) şeker hap değil, ince altı çizili metin.

## Fotoğraf

`public/asya.jpg` onun tek profil fotoğrafıdır ve her yerde kullanılır (yaş kapısı, başlık, avatar, sohbetteki "ben" fotoğrafı). **Depodaki dosya geçici, yüzsüz bir placeholder'dır** — gerçek Asya fotoğrafını aynı isimle `public/asya.jpg` üzerine bırak, kod değişikliği gerekmez. `public/asya/*.jpg` altındaki 7 sahne fotoğrafı da aynı şekilde değiştirilebilir.

## Stack

- Vite + React 19 + TypeScript (strict), Vercel'e hazır
- `api/chat.ts` — xAI Grok'u çağıran Vercel serverless fonksiyonu (`XAI_API_KEY`, `XAI_MODEL` varsayılan `grok-3-mini`)
- `vite.config.ts` içindeki dev middleware aynı handler'ı `npm run dev`'de sunar (`vercel dev` gerekmez)
- Kilitli sistem promptu: `server/persona.ts` — istemciden değiştirilemez
- Örnekleme: yalnızca `temperature: 1.25`. `grok-3-mini` reasoning modeli olduğu için `presence_penalty` / `frequency_penalty` gönderilmez (400 döner).

## Akış

- **Açılış**: 21+ kapısından sonra istemci `POST /api/chat { "opener": true }` çağırır. Sunucu, rastgele tohum + zaman damgası + tweet-hal açısı içeren gizli bir tetikleyiciyi modele enjekte eder; her oturum farklı açılır. Tetikleyici metni istemciye asla dönmez.
- **Sohbet**: istemci son 16 turu gönderir (peş peşe aynı yazarın balonları tek wire mesajında boş satırla birleşir); Grok cevabı 2-5 balona bölünür ve balonlar insan gecikmesiyle (~0.4-1.2 sn, uzun satırda biraz fazla) sırayla düşer. Gönderimde anında kısa bir "beat" düşer, model cevabı arkadan dolar.
- **Composer asla kilitlenmez**: Asya'nın balonları hâlâ düşerken yeni mesaj gönderilebilir. Yeni mesaj, sıradaki gösterilmemiş balonları iptal eder (ekrana düşenler kalır) ve yeni cevap hem eski balonları hem yeni mesajı hesaba katar.
- **Dayanıklılık**: istemci `/api/chat`'i 28 sn zaman aşımıyla en fazla 3 kez dener; sunucu xAI çağrısını bir kez yeniler. Hepsi başarısız olursa tek satır, karakter içi "bağlantı koptu... yine yaz" düşer — kanned sext yok.
- **Fotoğraflar**: model `[FOTO:id]` etiketiyle gönderir (`ben, ayna, yatak, balkon, dus, otel, taksi, saten`); çipler temalı fotoğrafı garanti eder. Profilde galeri; göndermedikleri kilitli.
- **Sesli**: `🎙️` önekli cevaplar dalga formlu sesli mesaj balonuna dönüşür ve **gerçekten seslendirilir** — `api/voice.ts`, xAI TTS'i proxyler (voice_id `eve`, `language: tr`, `speed: 0.72` — yavaş, nefesli). Transkript inleme register'ındadır (4-18 kelime + ahh/offf/mmm heceleri); `<whisper>` içine alınır, her `...` `[breath]` olur, inleme heceleri ayrı `[breath]`lerle sarılır, `🎙️`/`[FOTO]`/emoji seslendirilmeden temizlenir. İstemci blob URL'lerini oturum boyunca önbellekler ve balon görünür görünmez sesi ön-yükler. TTS erişilemezse balon sessiz dalga animasyonuna düşer.
- Son 60 mesaj `localStorage`'da tutulur; başlıktaki "sil" sohbeti sıfırlar (yeni açılışı yine Grok yazar).

## Kurulum (lokal)

```bash
npm install
cp .env.example .env.local   # XAI_API_KEY doldur (sohbet için gerekli)
npm run dev                  # http://localhost:5173
```

```bash
npm run build                # tsc -b && vite build
```

## Vercel

Proje mevcut (aylin / aylin-alpha.vercel.app) ve `XAI_API_KEY` + `XAI_MODEL=grok-3-mini` tanımlı — ekstra adım gerekmez; merge sonrası deploy yeterli. Yeni bir ortam kurulacaksa: **Project → Settings → Environment Variables** altına `XAI_API_KEY` (ve istenirse `XAI_MODEL`) ekle, yeniden deploy et.

## API sözleşmesi

`POST /api/chat`

```json
{ "messages": [{ "role": "user", "content": "..." }] }
```

veya oturum açılışı için:

```json
{ "opener": true }
```

- `200 { "reply": "...", "source": "grok" | "guard" }`
- `503 { "error": "no_key" }`, `502 { "error": "upstream_failed" }`, `400` hatalı gövde
- İstemci başarısızlıkta 3 deneme yapar; sonrası tek satır karakter içi bağlantı notu.

`POST /api/voice`

```json
{ "text": "...fısıltı transkripti..." }
```

- `200` → `audio/mpeg` baytları (xAI TTS, voice_id `eve`, tr, 0.72 hız)
- `503 no_key` / `502 tts_*` / `400` → istemci sessiz dalga animasyonuna düşer

## Güvenlik çizgisi

- Asya ve tüm senaryolar kurgusaldır; karakter 24 yaşındadır, kullanıcı 21+ olmalıdır.
- 21 yaş altı, okul/öğrenci/genç iması `shared/safety.ts` tarafından (istemci + sunucu) modele ulaşmadan reddedilir; sistem promptu aynı sınırı taşır. Argodaki "oğlan" yetişkin erkek olarak ele alınır.
- Gerçek kişi, ensest/aile, şiddet, rıza dışı ve yasa dışı içerik kalıcı olarak kapalıdır.
