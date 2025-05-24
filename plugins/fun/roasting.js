let handler = async (m, { conn, text }) => {
  const cooldownTime = 30; // 30 detik cooldown
  const sender = m.sender;

  // Show processing reaction
  conn.sendMessage(m.chat, {
    react: {
      text: "⏳",
      key: m.key,
    },
  });

  const orang =
    m.mentionedJid?.[0] ||
    (text ? text.replace(/[^0-9]/g, "") + "@s.whatsapp.net" : null);

  if (!orang) {
    return m.reply(
      "Tag orang atau ketik nomornya, contoh: *.roast @user* atau *.roast 628xxxx*"
    );
  }

  const roastList = [
    `@user, kadang gue mikir, kamu tuh kayak sinyal 1 bar di tengah hutan—nggak berguna tapi selalu muncul pas gak dibutuhin.`,
    `@user, lu tuh kayak charger 15 ribuan—bisa dipake, tapi bikin panas dan ngerusak semuanya.`,
    `@user, kalau otak kamu dijual di marketplace, kemungkinan besar masuk kategori "rusak parah, dijual kiloan".`,
    `@user, kamu kayak WiFi tetangga—kelihatan tapi nggak bisa dipake. Ngeselin banget!`,
    `@user, kalau ngomong tuh kayak lagu remix—banyak noise tapi gak jelas maksudnya.`,
    `@user, kamu itu bukan toxic sih, tapi lebih kayak limbah beracun yang seharusnya dikarantina 40 tahun.`,
    `@user, gaya hidupmu tuh kayak skripsi anak semester 9—jalan di tempat, banyak alasan, hasil nol.`,
    `@user, lu tuh kayak CAPTCHA yang gak bisa ditebak, cuma nyusahin orang doang.`,
    `@user, kalau jadi karakter game, kamu tuh pasti NPC yang ngasih misi gagal dari awal.`,
    `@user, jujur aja... tiap kamu buka mulut, IQ ruangan turun 10 poin.`,
    `@user, muka kamu tuh kayak error 404—nggak ketemu solusinya, bikin stres.`,
    `@user, kalau jadi hewan, kamu pasti masuk kategori hewan mitos, soalnya gak ada yang ngerti eksistensimu.`,
    `@user, kamu tuh kayak alarm jam 5 pagi pas libur—gak penting, cuma ganggu tidur orang.`,
    `@user, IQ kamu tuh kayak ping server merah—tinggi banget tapi gak berguna.`,
    `@user, lu tuh kayak file corrupt—dibuka bikin kesel, dihapus sayang kuota.`,
    `@user, kalau ada lomba jadi beban, lu pasti juara bertahan 5 tahun berturut-turut.`,
    `@user, jokes kamu tuh kayak sinetron azab—maksa, basi, tapi tetep aja nongol.`,
    `@user, ngomong sama lu tuh kayak ngisi CAPTCHA terus gagal, muter-muter gak jelas.`,
    `@user, kalau ketawa lu direkam, bisa dipake buat usir tuyul.`,
    `@user, gaya kamu tuh kayak intro YouTuber 2012—lebay, norak, dan pengen skip.`,
    `@user, lu tuh kayak charger rusak—bisa nyambung tapi nyetrum perasaan orang.`,
    `@user, setiap kamu muncul, vibes-nya kayak error di Windows—tiba-tiba, bikin panik, dan nyusahin.`,
    `@user, kamu itu kayak sandi WiFi yang udah nggak aktif—masih diingat, tapi udah gak guna.`,
    `@user, kamu tuh kayak grup WA keluarga—rame, tapi gak ada faedahnya.`,
    `@user, kalau jadi app, kamu pasti butuh update tiap hari tapi tetep nge-lag.`,
    `@user, tampangmu kayak file zip, kecil tapi isinya berat semua.`,
    `@user, vibes kamu kayak baterai 1%—mau dimanfaatin aja orang males.`,
    `@user, kalau lu jadi sinetron, pasti judulnya *“Anak Durhaka Gagal Update Otak.”*`,
    `@user, lu tuh kayak file download-an gagal—udah nunggu lama, eh error juga.`,
    `@user, otak lu kayak server gratis—down terus tiap dibutuhin.`,
    `@user, kalo jadi emoji, lu tuh pasti "buffering".`,
    `@user, IQ lu kayak koneksi WiFi publik—semua bisa pake, tapi nggak bisa diandalkan.`,
    `@user, tiap kali lu ngomong, grammar dunia ikut menangis.`,
    `@user, kalo jadi film, lu dapet rating 1 bintang dari netizen dan makhluk halus.`,
    `@user, jokes kamu tuh kayak status Facebook 2010—garing, jadul, dan bikin malu.`,
    `@user, kamu tuh kayak sabun cuci piring—selalu ada di dapur, tapi nggak berguna buat hidup.`,
    `@user, kalau hidupmu itu film, pasti genre-nya *"Horror Comedy."*`,
    `@user, ngomong sama lu tuh kayak buka aplikasi Android 4.0 di HP jadul—lemot dan bikin kesel.`,
    `@user, kamu tuh kayak kalkulator yang tombolnya rusak—nggak bisa nyelesain masalah.`,
    `@user, kalau lu jadi aplikasi, rating-nya pasti 1 bintang: "Gak ada faedahnya."`,
    `@user, otak kamu tuh kayak browser dengan tab 50—banyak, tapi nggak ada yang jalan dengan benar.`,
    `@user, kamu tuh kayak update Windows yang nggak pernah selesai—selalu ngerepotin orang.`,
    `@user, gaya kamu tuh kayak koneksi Bluetooth—hanya terhubung kalau lagi deket, tapi jarang bisa dipake.`,
    `@user, hidupmu tuh kayak video TikTok yang kebanyakan promosi, gak ada isinya.`,
    `@user, kalau jadi program, kamu pasti versi beta—masih banyak bugs dan belum selesai.`,
    `@user, kamu tuh kayak browser yang penuh extension—cuma penuh tapi gak efisien.`,
    `@user, kalau jadi aplikasi, kamu pasti butuh di-uninstall dari hidup ini.`,
    `@user, otak kamu tuh kayak Google Chrome—semakin lama, semakin berat dan ngelag.`,
    `@user, kamu kayak powerbank 5.000 mAh—gak cukup buat hidup orang lain.`,
    `@user, kalau jadi tweet, kamu pasti di-skip.`,
    `@user, hidupmu kayak aplikasi yang selalu crash—gak ada stabilnya.`,
    `@user, kamu tuh kayak GPS yang selalu ngasih jalan macet—nggak ada yang bener.`,
    `@user, kalau jadi lampu lalu lintas, kamu pasti merah terus, nggak pernah maju.`,
    `@user, gaya hidupmu kayak tutorial YouTube 5 menit yang gak pernah selesai.`,
    `@user, kamu kayak cuaca hujan pas weekend—bikin semuanya nggak enak.`,
    `@user, ngomong sama kamu tuh kayak nonton drama Korea tapi gak ngerti bahasa.`,
    `@user, kamu tuh kayak aplikasi WhatsApp yang selalu ngelag pas lagi penting.`,
    `@user, kalau jadi makanan, kamu pasti basi sebelum dimakan.`,
    `@user, otak kamu tuh kayak perangkat keras yang udah usang—perlu di-reset.`,
    `@user, kalau jadi social media, kamu pasti cuma jadi pencapaian 'followers' yang gak pernah berbobot.`,
    `@user, kamu tuh kayak WiFi di hotel—kecepatan 1 mbps, penuh sesak.`,
    `@user, ngomong sama kamu tuh kayak ngedownload file besar pake koneksi dial-up.`,
    `@user, hidupmu tuh kayak drama horor—selalu bikin takut, tapi nggak ada kejutan.`,
    `@user, kamu tuh kayak speaker yang rusak—keliatan besar, tapi suaranya nyebelin.`,
    `@user, kalau jadi film, kamu pasti cuma ada di kategori 'indie' yang nggak ada yang nonton.`,
    `@user, kamu kayak powerbank yang sudah lemah—gak bisa diandalkan.`,
    `@user, kalau hidup kamu jadi lagu, pasti genre-nya *"Cinta Gagal"*.`,
    `@user, ngomong sama kamu tuh kayak nunggu file .zip yang nggak pernah diekstrak.`,
    `@user, kamu tuh kayak kabel charger yang gampang putus—selalu mengecewakan.`,
    `@user, kalau jadi komputer, kamu pasti restart terus tiap kali ada pekerjaan.`,
    `@user, hidupmu kayak WiFi gratis—banyak yang pake, tapi nggak ada yang puas.`,
    `@user, kalau jadi emoji, kamu pasti "headache".`,
    `@user, kamu kayak printer yang error—nggak pernah bisa nyelesain pekerjaan dengan baik.`,
    `@user, otak kamu tuh kayak hard disk penuh—gak bisa dipake buat nyimpen yang penting.`,
    `@user, kamu tuh kayak mobil tua—nggak nyaman, penuh masalah, dan butuh perhatian terus.`,
    `@user, kalau jadi aplikasi, kamu pasti butuh update lagi, dan lagi, dan lagi.`,
    `@user, hidupmu tuh kayak film yang nggak punya plot—berantakan, gak jelas.`,
    `@user, kamu kayak kalkulator yang terus error pas butuh hitung yang susah.`,
    `@user, kalau jadi makanan, kamu pasti expired—nggak enak dimakan lagi.`,
    `@user, kamu tuh kayak sinyal 3G di daerah terpencil—bikin frustasi.`,
    `@user, kalau jadi charger, kamu pasti cuma bisa nyambung di tempat yang salah.`,
    `@user, gaya hidupmu kayak pesta yang ngga pernah jadi seru, terlalu banyak drama.`,
    `@user, kamu tuh kayak aplikasi kalender yang lupa ngingetin tugas penting.`,
    `@user, kalau jadi HP, kamu pasti gampang mati—gak bisa bertahan lama.`,
    `@user, kamu tuh kayak status WhatsApp yang nggak penting, tapi selalu muncul di atas.`,
    `@user, otak kamu tuh kayak aplikasi Instagram yang sering ngelag—terlalu banyak hal yang dibuka.`,
    `@user, kalau jadi film, kamu pasti bakal tayang di TV lokal dan dipake buat ngehibur orang yang lagi tidur.`,
    `@user, kamu tuh kayak mouse yang kabelnya kusut—nggak praktis dipake.`,
    `@user, ngomong sama kamu tuh kayak ngedengerin radio yang sering sinyalnya hilang.`,
    `@user, kalau jadi buku, kamu pasti punya banyak halaman kosong yang nggak pernah dibaca.`,
    `@user, kamu tuh kayak aplikasi edit foto yang cuma bisa bikin foto jadi blur.`,
    `@user, kalau jadi filter Instagram, kamu pasti bikin foto jadi gak natural.`,
    `@user, kamu tuh kayak pengingat alarm yang di-snooze terus—gak pernah ada kemajuan.`,
    `@user, kalau jadi musik, kamu pasti genre 'basi' yang nggak ada yang dengerin lagi.`,
    `@user, hidupmu tuh kayak update dari Instagram—gak penting, tapi terus muncul.`,
    `@user, kamu kayak notifikasi handphone yang selalu bikin ganggu.`,
    `@user, kalau jadi teman, kamu pasti yang sering di-skip di grup chat.`,
    `@user, kamu tuh kayak WiFi yang sering mati—nggak bisa diandalkan.`,
    `@user, kalau jadi acara TV, kamu pasti selalu ada iklan yang bikin orang males nonton.`,
    `@user, hidupmu kayak aplikasi yang butuh restart setiap kali ada masalah.`,
    `@user, kamu tuh kayak aplikasi yang ngasih notifikasi terus, tapi isinya nggak penting.`,
    `@user, kalau hidupmu jadi film, pasti genre-nya *"Drama Komedi yang Gagal"*.`,
    `@user, kamu kayak laptop dengan RAM kecil—banyak aplikasi, tapi lemot banget.`,
    `@user, kalau jadi makanan, kamu pasti junk food—gak bergizi, tapi kadang dibutuhkan.`,
    `@user, otak kamu tuh kayak komputer dengan virus—sering ngelag dan error.`,
    `@user, kamu tuh kayak rokok—dulu nyenengin, sekarang udah berbahaya buat kesehatan.`,
    `@user, kalau jadi karakter, kamu pasti selalu jadi villain yang nggak ada perkembangan.`,
    `@user, kamu kayak printer yang jarang dipake—selalu ngejam pas dibutuhin.`,
    `@user, hidupmu kayak aplikasi cuaca—nggak bisa prediksi dengan tepat.`,
    `@user, kamu tuh kayak alarm yang nggak bisa di-snooze—selalu ganggu.`,
    `@user, kalau jadi HP, kamu pasti sering lowbat pas lagi butuh.`,
    `@user, kamu kayak kabel charger yang susah dicari—gak ada yang pake.`,
    `@user, kalau jadi film horor, kamu pasti nggak pernah bikin orang takut, malah bikin tertawa.`,
    `@user, kamu tuh kayak botol air yang udah habis—nggak ada gunanya lagi.`,
    `@user, hidupmu kayak sinyal 4G yang sering hilang—membingungkan.`,
    `@user, kamu tuh kayak playlist lagu yang monoton—nggak pernah berubah.`,
    `@user, kalau jadi sabun, kamu pasti sabun cuci piring—selalu ada, tapi nggak penting buat hidup.`,
    `@user, kamu kayak postingan yang nggak ada engagement—nggak ada yang peduli.`,
    `@user, kalau jadi film action, kamu pasti jalan terus tanpa ada plot yang seru.`,
    `@user, kamu tuh kayak charger mobil—terlalu besar buat hidup orang biasa.`,
    `@user, kalau jadi emoji, kamu pasti "gagal ngertiin"—selalu bingung.`,
    `@user, kamu tuh kayak powerbank 10.000 mAh—cuma bisa ngecas HP sendiri.`,
    `@user, kalau jadi game, kamu pasti level satu yang terlalu gampang dan nggak menantang.`,
    `@user, hidupmu tuh kayak buku yang nggak ada isinya—gak ada cerita yang menarik.`,
    `@user, kamu tuh kayak Windows XP—udah ketinggalan zaman, tapi masih ada yang pake.`,
    `@user, kalau jadi pengingat alarm, kamu pasti terus berbunyi tanpa ada yang dengerin.`,
    `@user, kamu tuh kayak sinyal WiFi yang terputus terus, susah dihubungin.`,
    `@user, hidupmu kayak lampu mati—selalu gelap dan nggak ada yang bisa dilihat.`,
    `@user, kalau jadi lampu sorot, kamu pasti cuma menyinari ruang kosong.`,
    `@user, kamu kayak tombol mute di Zoom—selalu ada, tapi nggak ada yang peduli.`,
    `@user, kalau jadi speaker, kamu pasti bunyinya cempreng, nggak enak didengar.`,
    `@user, kamu tuh kayak kartu memori 1GB—nggak cukup buat nyimpen kenangan.`,
    `@user, hidupmu tuh kayak tampilan loading—nggak pernah kelar.`,
    `@user, kamu kayak aplikasi game yang selalu nge-crash—gak bisa diandalkan.`,
    `@user, kalau jadi browser, kamu pasti di-skip terus, nggak pernah dipakai.`,
    `@user, kamu tuh kayak gambar yang pixelated—nggak jelas dan buram.`,
    `@user, kalau jadi makanan, kamu pasti kebanyakan bahan pengawet—nggak sehat.`,
    `@user, kamu tuh kayak email yang selalu masuk folder spam—nggak pernah penting.`,
    `@user, hidupmu kayak film dokumenter yang diabaikan—nggak ada yang nonton.`,
    `@user, kamu kayak aplikasi cuaca yang selalu salah ramalan—selalu ngecewain.`,
    `@user, kalau jadi sinyal, kamu pasti yang paling lemah—gak ada koneksi yang bagus.`,
    `@user, kamu tuh kayak tisu basah—gampang robek dan nggak bisa dipake lagi.`,
    `@user, kalau jadi aplikasi, kamu pasti sering hang—gak pernah stabil.`,
    `@user, kamu kayak menu makanan fast food yang selalu sama—gak ada variasi.`,
    `@user, hidupmu kayak update iOS—selalu ada perbaikan, tapi nggak pernah sempurna.`,
    `@user, kamu tuh kayak smartphone yang baterainya cepet habis—nggak bisa bertahan lama.`,
    `@user, kalau jadi musik, kamu pasti genre *"ketinggalan zaman"*—udah nggak enak didenger.`,
    `@user, kamu kayak refresh button di website—selalu perlu di-click, tapi nggak ada perubahan.`,
    `@user, hidupmu tuh kayak film komedi slapstick—selalu bikin orang bingung, nggak lucu.`,
    `@user, kamu tuh kayak aplikasi kalender yang lupa nyatet jadwal penting.`,
    `@user, kalau jadi buku, kamu pasti genre *"gagal"*, nggak ada yang minat baca.`,
    `@user, kamu tuh kayak modem dial-up—nggak cepet, nyebelin, dan kadang susah connect.`,
    `@user, hidupmu tuh kayak laptop yang selalu nge-hang—sering nggak bisa dipake.`,
    `@user, kalau jadi bintang film, kamu pasti hanya jadi figuran yang nggak punya peran.`,
    `@user, kamu kayak aplikasi pencatat yang nggak pernah bisa menyimpan data dengan benar.`,
    `@user, kalau jadi game, kamu pasti level yang paling mudah—gak ada tantangan.`,
    `@user, kamu tuh kayak bot yang selalu ngasih jawaban yang salah—gak berguna.`,
    `@user, hidupmu kayak tampilan loading website yang nggak pernah selesai.`,
    `@user, kamu kayak kalkulator yang tombol-tombolnya nggak bisa dipencet—gak efektif.`,
    `@user, kalau jadi minuman, kamu pasti cuma air putih—gak ada rasa, tapi tetap ada di hidup orang lain.`,
    `@user, kamu tuh kayak buku resep yang nggak pernah selesai—sempat ada ide, tapi nggak ada hasil.`,
    `@user, hidupmu kayak versi beta—masih banyak kekurangan, belum siap diluncurkan.`,
    `@user, kamu tuh kayak dokumen Word yang nggak pernah di-save—semuanya hilang tanpa jejak.`,
    `@user, kalau jadi makanan, kamu pasti junk food—gak sehat, tapi tetap digemari orang.`,
    `@user, kamu tuh kayak status Facebook yang udah basi—nggak ada yang peduli.`,
    `@user, hidupmu kayak aplikasi YouTube yang selalu error—nggak bisa dinikmati.`,
    `@user, kamu kayak software yang terus update, tapi nggak pernah nambah fungsionalitasnya.`,
    `@user, kalau jadi film dokumenter, kamu pasti isinya cuma drama yang nggak perlu.`,
    `@user, kamu tuh kayak kamera HP yang nggak fokus—selalu blur.`,
    `@user, hidupmu kayak koneksi internet yang terlalu banyak buffering—nyebelin banget.`,
    `@user, kamu kayak aksesori fashion yang nggak cocok—gak ada nilai lebihnya.`,
    `@user, kalau jadi aplikasi, kamu pasti yang paling sering di-uninstall.`,
    `@user, kamu tuh kayak tombol escape di keyboard—selalu dicari, tapi nggak pernah berhasil.`,
    `@user, hidupmu kayak sinyal 5G yang nggak ada gunanya—kenceng, tapi nggak ada yang bisa dipake.`,
    `@user, kamu kayak aplikasi yang update terus, tapi isinya nggak ada yang baru.`,
    `@user, kalau jadi cuaca, kamu pasti badai yang nggak bisa diprediksi—nggak jelas.`,
    `@user, kamu tuh kayak password yang susah banget ditebak—cuma nyusahin orang.`,
    `@user, hidupmu kayak film animasi yang terlalu banyak efek—kurang substansi.`,
    `@user, kamu tuh kayak kalkulator yang nggak punya tombol minus—gak bisa ngurangin masalah.`,
    `@user, kalau jadi pengingat, kamu pasti cuma bikin orang makin lupa.`,
    `@user, kamu tuh kayak aplikasi yang nge-load lama banget—terlalu banyak masalah.`,
  ];

  const roastText = roastList[
    Math.floor(Math.random() * roastList.length)
  ].replace(/@user/g, `@${orang.split("@")[0]}`);

  console.log(orang);
  console.log(roastText);

  try {
    await conn.sendMessage(m.chat, {
      text: roastText,
      mentions: [orang],
    });
  } catch (error) {
    console.error("Error saat mengirim pesan:", error);
    m.reply("Terjadi kesalahan saat mengirim roast, coba lagi nanti.");
  }
};

handler.help = ["roast @user | 628xxxx"];
handler.tags = ["fun"];
handler.command = /^(roast)$/i;
handler.limit = true;
handler.group = true;
handler.register = true;

module.exports = handler;
