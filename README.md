# asya — 21+

Mobil öncelikli, yetişkinlere özel (21+) kurgusal sexting sohbet uygulaması. Asya; 24 yaşında, İstanbul'da yaşayan, tamamen kurgusal bir karakterdir — Emin'in kız arkadaşıdır ve uygulamayı yalnızca o kullanır. Tüm senaryolar ve görseller kurgudur ve yalnızca yetişkinler arasındadır.

> Bağımsız bir üründür — VICEBLOCK ile ilgisi yoktur. CA yok, token yok, NFT yok, paywall yok.

## Karakter ve ses

- Gece yarısı X'te yer imlerine eklenen birinci tekil, açık sözlü Türkçe gönderilerin sesi: hal dökümü + emir, 2-5 kısa balonluk seriler (gerçek biri gibi peş peşe mesaj), küçük harf, başparmak typoları, inleme uzatmaları ("Ahhhhhh aşkımmmm" / "offf azdımmm" tarzı — seri başına 1-2 kelime). Karşısındakinin adını bilir ("emin" ya da "aşkım" der, asla "kullanıcı"). Soru sormaz, sohbet açıcı klişe kullanmaz, edebiyat yapmaz; sinematik motifler (ruj, balkon sigarası, saten) yasaklıdır.
- Sevgili, register bozulmadan: Asya Emin'in kız arkadaşıdır; geçmişlerini hatırlar, kişiliği zamanla onun sevdiklerine göre şekillenir (kink'ler, lakaplar, iç şakalar, saatler). Şefkat pisliğin İÇİNDE yaşar — tatlı-chatbot muhabbeti yoktur.
- Aynalama ve çeşitlilik (persona): Emin'in "ne yapıyorsun / napıyosun / naber"i küçük muhabbet değil davettir — cevap çoğu kez bedeninin o anki hali ve sık sık onu düşünerek kendine dokunuyor oluşudur, ama cevap ailesi her seferinde döner (yemek başında, yarı uykuda, az önce boşalmış, utangaç, bratty...) ve aynı cevap iki kez üst üste gelmez. Boşalma/doruk anı her seferinde başka sesle işaretlenir (ham "ohhh boşaldım" raporu, şefkatli "bak boşaldım canım aşkım", ıslak parmak yalatma, titreyen bacak, uykulu sarılma) — ezber senaryo yok. Onun register'ı aynalanır: gerçek sevgili gibi yazana aynı ağızla, ondan bir adım daha pis cevap verir; uzatmaları ve kısalığı da aynalar. Sert sınırlar hiçbir register'da esnemez.
- Register analizi ve yasaklı eski motif listesi: `server/tweet-voice.md` (dahili not; UI'da yayınlanmaz).
- Tüm konuşma içeriği **Grok**'tan gelir. Yerel cevap korpusu yoktur; oturum açılışını bile Grok yazar.
- Sert güvenlik hattı: 21 yaş altı / okul / genç iması geçen her girdi hem istemcide hem sunucuda modele ulaşmadan, karakter içinden reddedilir.

## Görünüm

- Gece notu + grenli fotoğraf esteti: krem / ten / kurumuş kan kırmızısı, neredeyse siyah zemin. Neon yok, bonbon yok.
- Yaş kapısında tam ekran `asya.jpg`, koyu perde ve ince film greni. İsim editorial serif (Playfair Display), mesajlar ham sans.
- Composer bir not defteri alanı gibi; tetikleyiciler şeker hap değil, ince altı çizili metin. Katalogda 13 sahne çipi vardır (`otel, duş, balkon, taksi, ofis, mutfak, asansör, araba, yatak, merdiven, cam, kulüp, soyunma`); görünen satır `devam` + günün 6 sahnesi + `sesli` (8 çip) olarak döner — rotasyon günlük yenilenir ve `localStorage`'da saklanır. `devam` yönetmen çipidir: sahneyi bir adım Asya ilerletir.
- Başlıkta adının altında ruh hali kelimesi (`çevrimiçi · sakin/ısınmış/azgın/taşmış`), kademeye göre hafifçe ısınan renkte — sayı ya da bar asla görünmez.

## Fotoğraf

- **Dönen profil fotoğrafı:** başlık avatarı, profil sayfası avatarı ve favicon/apple-touch ikonu saat başı değişir. Rotasyon listesi `/asya.jpg` + `/pfp/1.jpg`–`/pfp/6.jpg` (7 fotoğraf, `src/lib/pfp.ts`); indeks `Math.floor(Date.now() / 3_600_000) % 7` olduğundan aynı saatte her yerde aynı fotoğraf görünür ve dakikalık kontrol sayesinde sayfa yenilenmeden döner. Hepsi Asya'nın selfie'sidir.
- `public/asya.jpg` yaş kapısındaki tam ekran fotoğraf ve sohbetteki "ben" fotoğrafı olarak da kullanılır. `public/asya/*.jpg` altındaki 12 fotoğraf — 7 sahne (`ayna, yatak, balkon, dus, otel, taksi, saten`) + 5'lik çıplak/tease seti (`gomlek, etek, dantel, acik, dovme`) — aynı isimle değiştirilebilir, kod değişikliği gerekmez.

## Stack

- Vite + React 19 + TypeScript (strict), Vercel'e hazır
- `api/chat.ts` — xAI Grok'u çağıran Vercel serverless fonksiyonu (`XAI_API_KEY`, `XAI_MODEL` varsayılan `grok-3-mini`)
- `vite.config.ts` içindeki dev middleware aynı handler'ı `npm run dev`'de sunar (`vercel dev` gerekmez)
- Kilitli sistem promptu: `server/persona.ts` — istemciden değiştirilemez
- Örnekleme: yalnızca `temperature: 1.25`. `grok-3-mini` reasoning modeli olduğu için `presence_penalty` / `frequency_penalty` gönderilmez (400 döner).

## Akış

- **Açılış**: 21+ kapısından sonra istemci `POST /api/chat { "opener": true }` çağırır (varsa hafıza dijesti de gider). Sunucu, rastgele tohum + zaman damgası + tweet-hal açısı içeren gizli bir tetikleyiciyi modele enjekte eder; her oturum farklı açılır. Hafıza varsa Asya onu sessizce tanır (tek doğal geri çağırma olabilir, "hoş geldin" cümlesi asla). Tetikleyici metni istemciye asla dönmez.
- **Sohbet**: istemci son 40 turu gönderir (peş peşe aynı yazarın balonları tek wire mesajında boş satırla birleşir); Grok cevabı 2-5 balona bölünür ve balonlar insan gecikmesiyle (~0.4-1.2 sn, uzun satırda biraz fazla) sırayla düşer. Gönderimde anında kısa bir "beat" düşer, model cevabı arkadan dolar.
- **Uyarlanır beat**: gönderim anındaki beat artık Emin'in SON mesajına tepki verir (`src/lib/beats.ts`). Mesaj diacritic-fold ile kovalara ayrılır — yönetmen devri ("tamam", "geldim"), foto/sesli isteği ("dur bakiyom", "bi sn"), açık saçık laf ("offff", "ahhhh"), sahne başlangıcı ("off başlıyoruz", "hazırlanıyorum"), tatlı hitap ("aşkımmmm", "hmm aşkım"), övgü (utangaç kıkırdama), selam, soğuk tek kelime (sessiz "hmm"), soru, nötr — her kova 13-16 kısa satır, hepsi tek token/ifade; cevap korpusu DEĞİLDİR, gerçek sohbeti yine Grok yazar. Son 4 beat asla tekrarlanmaz (`sessionStorage`, `asya.beats.v1`). Başlıktaki durum da arada değişir ("yazıyor…" / "yazıyo…" / "…"), WhatsApp küçüklüğünde kalır.
- **Fantezi çipleri**: her sahne çipinin tek sabit cümlesi yerine 12-16 farklı Türkçe 21+ açılış satırından oluşan bir HAVUZU vardır (`src/lib/chips.ts`) — kısa, kullanıcı ağzından yazılmış kıvılcımlar. Dokunuşta havuz TAMAMEN dönmeden hiçbir satır tekrarlanmaz (kullanılan indeksler `localStorage`'da, `asya.chips.v1`): ofise 10 kez basmak 10 farklı ofis başlangıcı verir. Seçilen satır composer geçmişine ve Grok'a gider — Asya O varyasyona cevap verir, ezber sahne anlatamaz. Görünen satır günde bir kez 13 sahneden 6'sını çeker (+`devam` +`sesli`), rotasyon da aynı anahtarda saklanır.
- **İlişki hafızası**: her başarılı cevaptan sonra son alışveriş (`emin: ... | asya: ...`, zaman damgalı) `localStorage`'daki kompakt dijeste eklenir (`asya.memory.v1`, ~2800 karakter; en eski satırlar düşer — ekstra Grok çağrısı yok). Dijest her `POST /api/chat` gövdesinde `memory` alanı olarak gider ve sunucu onu ikinci bir sistem mesajı olarak enjekte eder ("RELATIONSHIP MEMORY with Emin — asla alıntılama, hafıza dosyasından bahsetme"). Başlıktaki "sil" yalnızca balonları temizler, hafızayı ve ruh halini ASLA silmez; hafıza silme ayarlar sayfasında gizlidir (ruh halini de sıfırlar).
- **Ruh hali (arousal)**: 0-100'lük bir sayı `localStorage`'da yaşar (`asya.mood.v1`, değer + zaman damgası) ve her `/api/chat` çağrısında (açılış dahil) `mood` alanı olarak gider; sunucu onu üçüncü bir sistem notuna çevirir ("RIGHT NOW you are azgın (63/100)... never mention a meter"). Kademeler: 0-24 sakin, 25-49 ısınmış, 50-74 azgın, 75-100 taşmış. Sayı üç yoldan oynar: modelin cevabın sonuna eklediği gizli `[MOOD:±n]` etiketi (parse söker, asla balon olmaz; tur başına ±16 sınırı), Emin'in mesajından küçük istemci dürtmesi (açık saçık laf / foto isteği / övgü ısıtır, soğuk tek kelime serinletir) ve saatte ~8 puanlık boşta soğuma (sabaha 100'de kalmaz). Başlıkta adının altında yalnızca Türkçe kademe kelimesi görünür (`çevrimiçi · azgın`, kademeye göre hafif renk) — sayı, bar, HUD yok. Düşük ısıda daha nazlı ve kısa yazar, foto isteğinde nazlanır; yüksek ısıda kendiliğinden foto/sesli atabilir.
- **Yönetmen turu ("devam")**: Emin sahneyi yazmak istemediğinde kısa bir devir cümlesi ("olsun", "bir şeyler olsun", "devam", "devam et", "sen yönet", "anlat", "hikaye", "ne olursa olsun" — tam eşleşme; uzun cümle içindeki "devam" tetiklemez) ya da composer'daki `devam` çipi isteğe `director: true` ekler. Sunucu ek bir sistem notu enjekte eder: sahneyi TEK somut adım kendisi ilerletir, "şimdi ne yapalım?" gibi dümen soruları o tur yasaktır, thread soğuksa küçük samimi bir kıvılcım, aktın ortasındaysa bir adım tırmanış. `devam` çipi diğer çiplerin aksine foto zorlamaz. Normal mesajlar normal kalır — yönetmen turu opt-in'dir.
- **Composer asla kilitlenmez**: Asya'nın balonları hâlâ düşerken yeni mesaj gönderilebilir. Yeni mesaj, sıradaki gösterilmemiş balonları iptal eder (ekrana düşenler kalır) ve yeni cevap hem eski balonları hem yeni mesajı hesaba katar.
- **Dayanıklılık**: istemci `/api/chat`'i 28 sn zaman aşımıyla en fazla 3 kez dener; sunucu xAI çağrısını bir kez yeniler. Hepsi başarısız olursa tek satır, karakter içi "bağlantı koptu... yine yaz" düşer — kanned sext yok.
- **Fotoğraflar**: model `[FOTO:id]` etiketiyle gönderir. Sahne seti `ben, ayna, yatak, balkon, dus, otel, taksi, saten` (dekor; ten isteğine asla cevap olamaz); çıplak/tease seti `gomlek, etek, dantel, acik, dovme`. **Vücut hedefleme** (JPEG'lerin gerçekten gösterdiğine göre etiketlendi): meme/göğüs isteği → `acik` (çıplak meme), sonra `gomlek` (açık düğme dekoltesi), sonra `dantel` — asla `etek`, asla sahne karesi; kalça/etek/bacak/çorap → `etek`; iç çamaşırı/sütyen/külot → `dantel`; dövme → `dovme`; tam çıplak/soyun → `acik`. Bu eşleme hem personada hem istemcide yaşar: net bir vücut isteğinde model yanlış id seçerse istemci fotoyu doğru setten kullanılmamış bir id ile değiştirir (yanlış kareyi anlatan altyazı düşer); model foto atmadıysa yalnızca azgın/taşmış ısıda en iyi id enjekte edilir — düşük ısıda fotosuz cevap NAZDIR, dokunulmaz (persona da öyle ister: sakin/ısınmışken ilk ten isteği çoğunlukla tek satır nazla döner, foto 1-2 tur sonra gelir; azgın/taşmışken hızlı, bazen istenmeden). Çıplak-set gönderilerinde eski "en fazla 2-3 kelime altyazı" kuralı gevşedi: o fotoğraf hakkında TEK gerçek sevgili cümlesi (etiketin yanında ya da hemen önceki/sonraki balonda); sahne kareleri kısa altyazıda kalır. Tur başına en fazla bir foto; gönderilen id'ler geçmişte ve dijestte `[foto:id]` olarak durur, uyan taze id varken tekrar gönderilmez (hepsi gittiyse yanlış parça yerine en uyanı tekrar gelir). Çipler artık fotoğrafı GARANTİ ETMEZ — metin önce gelir ve **sahne doğruluğu şarttır**: bir çip yalnızca o sahneyi GERÇEKTEN gösteren JPEG'i iliştirebilir (kareler tek tek doğrulandı: `otel/dus/balkon/yatak` kendi sahneleri, `taksi.jpg` jenerik yağmurlu arka koltuk olduğu için `araba`ya da uyar, `soyunma`→`gomlek` düğmeleri açık kare olduğu için sahnenin ta kendisi — yalnızca azgın+ ısıda). Eşleşen karesi OLMAYAN sahneler (`ofis` — `ayna` bir makyaj masasıdır, asla "ofis" değil —, `mutfak`, `asansör`, `merdiven`, `cam`, `kulüp`) dekor artığı foto ASLA zorlamaz: metinle kalır, yalnızca azgın+ ısıda daha nadir bir zarla mekân iddiası taşımayan yakın-kare bir tease düşebilir (`gomlek/acik/dovme`; `etek/dantel` karede yatak/yatak odası göründüğü için hariç). Eşleşen sahnelerde zar ruh haliyle ölçeklenir (sakin/ısınmış ~%30, azgın+ ~%55) ve daha önce gönderilmiş bir id asla zorla tekrarlanmaz. Persona da yer dürüstlüğünü taşır: bir fotoğraf, karede görünmeyen bir mekânmış gibi asla altyazılanmaz. `sesli` yine sesli notu garanti eder; `devam` yine hiç foto zorlamaz. Profilde galeri; göndermedikleri kilitli.
- **Sesli**: `🎙️` önekli cevaplar dalga formlu sesli mesaj balonuna dönüşür ve **gerçekten seslendirilir** — `api/voice.ts`, xAI TTS'i proxyler. Varsayılan ses `eve` (`language: tr`, `speed: 0.72` — yavaş, nefesli; işlenişi hiç değişmedi). Transkript inleme register'ındadır (4-18 kelime + ahh/offf/mmm heceleri); `<whisper>` içine alınır, her `...` `[breath]` olur, inleme heceleri ayrı `[breath]`lerle sarılır, `🎙️`/`[FOTO]`/emoji seslendirilmeden temizlenir. İstemci blob URL'lerini oturum boyunca (ses+mesaj başına) önbellekler ve balon görünür görünmez sesi ön-yükler. TTS erişilemezse balon sessiz dalga animasyonuna düşer.
- **Ayarlar (başlıktaki dişli)**: özel bir sayfada 5 kadın sesi listelenir — `eve` ("Eve · şimdiki", varsayılan), `luna` ("Luna · daha azdırıcı"), `ara` ("Ara · fısıltı"), `iris` ("Iris · genç"), `carina` ("Carina · sıcak"). Id'ler `GET /v1/tts/voices`'tan doğrulanmıştır. Dokunarak seçilir, "dinle" kısa Türkçe bir inleme cümlesini seçili sesle `/api/voice` üzerinden çalar. Seçim `localStorage`'a yazılır (`asya.settings.v1`), ses değişince bellekteki ses önbelleği düşürülür (eski eve blob'ları yeni seste çalmaz). Beş ses de aynı 0.72 hızda sentezlenir — xAI'nin kabul ettiği aralık 0.7-1.5'tir; eski 0.68 "alternatif hız" bu tabanın altında kaldığı için eve dışındaki her ses 400 dönüyordu. Composer'da genel bir ses menüsü yoktur. Hafıza silme de yalnızca burada.
- Son 400 mesaj `localStorage`'da tutulur; başlıktaki "sil" sohbeti sıfırlar (yeni açılışı yine Grok yazar, hafıza kalır).

## Kurulum (lokal)

```bash
npm install
cp .env.example .env.local   # XAI_API_KEY doldur (sohbet için gerekli)
npm run dev                  # http://localhost:5173
```

```bash
npm run build                # tsc -b && vite build
npm run smoke                # havuz/kova duman testleri (beat kovaları, çip havuzları, rotasyon)
```

## Vercel

Proje mevcut (aylin / aylin-alpha.vercel.app) ve `XAI_API_KEY` + `XAI_MODEL=grok-3-mini` tanımlı — ekstra adım gerekmez; merge sonrası deploy yeterli. Yeni bir ortam kurulacaksa: **Project → Settings → Environment Variables** altına `XAI_API_KEY` (ve istenirse `XAI_MODEL`) ekle, yeniden deploy et.

## API sözleşmesi

`POST /api/chat`

```json
{ "messages": [{ "role": "user", "content": "..." }], "memory": "…ilişki dijesti…", "mood": 63, "director": false }
```

veya oturum açılışı için:

```json
{ "opener": true, "memory": "…ilişki dijesti…", "mood": 12 }
```

- `memory` isteğe bağlıdır (maks ~3200 karakter, sunucuda kırpılır); varsa ikinci sistem mesajı olarak modele enjekte edilir. Reşit-olmayan iması taşıyan dijest sunucuda sessizce düşürülür.
- `mood` isteğe bağlıdır (0-100'e kıskaçlanır); varsa üçüncü sistem notu olarak gider ve model cevabın sonuna gizli `[MOOD:±n]` etiketi ekler (istemci söker, asla göstermez).
- `director` isteğe bağlıdır; `true` ise sunucu yönetmen notunu ekler (sahneyi bir adım o ilerletir, soru sormaz). Açılışta yok sayılır.
- `200 { "reply": "...", "source": "grok" | "guard" }`
- `503 { "error": "no_key" }`, `502 { "error": "upstream_failed" }`, `400` hatalı gövde
- İstemci başarısızlıkta 3 deneme yapar; sonrası tek satır karakter içi bağlantı notu.

`POST /api/voice`

```json
{ "text": "...fısıltı transkripti...", "voice": "luna" }
```

- `voice` isteğe bağlıdır; izin listesi `eve | luna | ara | iris | carina`, tanınmayan/boş değer `eve`'e düşer. Beş ses de 0.72 hızda (xAI aralığı 0.7-1.5), hepsi `language: tr` + aynı whisper/[breath] markup'ı. İzin listesindeki bir sese xAI yine de 400 dönerse aynı istek aynı sesle bir kez yinelenir — kullanıcı luna seçtiyse asla sessizce eve çalınmaz.
- `200` → `audio/mpeg` baytları
- `503 no_key` / `502 tts_*` / `400` → istemci sessiz dalga animasyonuna düşer

## Güvenlik çizgisi

- Asya ve tüm senaryolar kurgusaldır; karakter 24 yaşındadır, kullanıcı 21+ olmalıdır.
- 21 yaş altı, okul/öğrenci/genç iması `shared/safety.ts` tarafından (istemci + sunucu) modele ulaşmadan reddedilir; sistem promptu aynı sınırı taşır. Argodaki "oğlan" yetişkin erkek olarak ele alınır. Aynı kontrol `memory` alanına da uygulanır.
- Gerçek kişi, ensest/aile, hayvan ve yasa dışı içerik kalıcı olarak kapalıdır.
- Yetişkinler arası rızalı sert oyun / CNC / BDSM (ağzını kapatma, kemer, "kafama bas") karakterin kendi talebi olarak kurgunun içindedir — rıza her zaman Asya'nındır, herkes 21+.
