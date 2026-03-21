import { Telegraf, Markup, Context } from 'telegraf';
import { getDb } from './db.js';
import { message } from 'telegraf/filters';

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ADMINS = (process.env.ADMIN_IDS || '7618889413,5541894729').split(',').map(id => parseInt(id.trim()));
const CHANNELS = (process.env.CHANNELS || 'lyceumverse, Mirzokhid_blog')
  .split(',')
  .map(c => c.trim().replace(/^@/, ''));
const PLATFORM_URL = process.env.PLATFORM_URL || 'https://iedmock.vercel.app';

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN is not set in environment variables');
}

export const bot = new Telegraf(BOT_TOKEN);

// Helper to generate referral code
function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Check subscription
async function checkSubscription(userId: number) {
  try {
    for (const channel of CHANNELS) {
      const member = await bot.telegram.getChatMember(`@${channel}`, userId);
      if (['left', 'kicked'].includes(member.status)) {
        return { isSubscribed: false, channel };
      }
    }
    return { isSubscribed: true, channel: null };
  } catch (error) {
    console.error('Subscription check error:', error);
    return { isSubscribed: false, channel: null };
  }
}

// Subscription keyboard
function subscriptionKeyboard() {
  const buttons = CHANNELS.map(channel => 
    Markup.button.url(`📢 ${channel} kanaliga obuna bo'lish`, `https://t.me/${channel}`)
  );
  return Markup.inlineKeyboard([
    ...buttons.map(b => [b]),
    [Markup.button.callback('✅ Obunani tekshirish', 'check_sub')]
  ]);
}

// Main menu
async function sendMainMenu(ctx: Context, userId: number) {
  const db = await getDb();
  const user = db.prepare('SELECT referal_code, referal_count, is_verified FROM users WHERE user_id = ?').get(userId);
  
  if (!user) return;

  const { referal_code, referal_count, is_verified } = user;
  
  const buttons: any[][] = [
    [
      Markup.button.callback('👥 Mening referallarim', 'my_referrals'),
      Markup.button.callback('🔗 Referal linkim', 'my_link')
    ],
    [Markup.button.callback('📸 Natijani yuklash', 'upload_screenshot')]
  ];

  if (referal_count >= 5 && is_verified === 1) {
    buttons.push([Markup.button.url('✅ Platformaga o\'tish', PLATFORM_URL)]);
  } else if (referal_count >= 5 && is_verified === 0) {
    buttons.push([Markup.button.callback('⏳ Yuklangan', 'already_uploaded')]);
  }

  let statusText = "";
  if (referal_count >= 5 && is_verified === 1) {
    statusText = "✅ Siz platformaga kirish huquqiga egasiz!";
  } else if (referal_count >= 5 && is_verified === 0) {
    statusText = "✅ Siz 5 ta referal to'pladingiz! Natijangizni yuklang va platformaga kirasiz.";
  } else {
    statusText = `📊 ${referal_count}/5 ta referal to'pladingiz. 5 ta referal to'plang va natijangizni yuklang!`;
  }

  const chat = await ctx.getChat();
  const firstName = (chat as any).first_name || 'Foydalanuvchi';

  await ctx.replyWithHTML(
    `🏠 <b>Asosiy menyu</b>\n\n` +
    `👤 Ism: ${firstName}\n` +
    `🔑 Referal kodingiz: <code>${referal_code}</code>\n\n` +
    `${statusText}\n\n` +
    ` Natijangizni yuklash tugmasini bosing va skrinshotni yuboring!`,
    Markup.inlineKeyboard(buttons)
  );
}

// Start command
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username || 'None';
  const fullName = `${ctx.from.first_name} ${ctx.from.last_name || ''}`.trim();
  
  const db = await getDb();
  let user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  
  const startPayload = ctx.payload; // Referral code from /start <payload>

  if (!user) {
    const newReferralCode = generateReferralCode();
    let refererId: number | null = null;

    if (startPayload) {
      const referer = db.prepare('SELECT user_id FROM users WHERE referal_code = ?').get(startPayload);
      if (referer && referer.user_id !== userId) {
        refererId = referer.user_id;
        db.prepare('UPDATE users SET referal_count = referal_count + 1 WHERE user_id = ?').run(refererId);
        db.prepare('INSERT INTO referrals (user_id, referer_id) VALUES (?, ?)').run(userId, refererId);
      }
    }

    db.prepare(
      'INSERT INTO users (user_id, username, full_name, referal_code, referer_id, is_verified) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, username, fullName, newReferralCode, refererId, 0);
  }

  const { isSubscribed, channel } = await checkSubscription(userId);
  
  if (!isSubscribed) {
    return ctx.reply(
      `❌ Botdan foydalanish uchun quyidagi kanallarga obuna bo'lishingiz kerak:\n\n` +
      `❗️ ${channel || 'kanal'}-ga obuna bo'lmagansiz!\n\n` +
      `Obuna bo'lgandan so'ng 'Obunani tekshirish' tugmasini bosing.`,
      subscriptionKeyboard()
    );
  }

  await sendMainMenu(ctx, userId);
});

// Callback handlers
bot.action('check_sub', async (ctx) => {
  const userId = ctx.from.id;
  const { isSubscribed, channel } = await checkSubscription(userId);
  
  if (isSubscribed) {
    await ctx.deleteMessage();
    await sendMainMenu(ctx, userId);
  } else {
    await ctx.answerCbQuery(`❌ ${channel || 'kanal'}-ga obuna bo'lmagansiz!`, { show_alert: true });
  }
});

bot.action('my_referrals', async (ctx) => {
  const userId = ctx.from.id;
  const db = await getDb();
  const referrals = db.prepare(`
    SELECT u.user_id, u.full_name, u.username, r.date 
    FROM referrals r 
    JOIN users u ON r.user_id = u.user_id 
    WHERE r.referer_id = ?
    ORDER BY r.date DESC
  `).all(userId);

  if (referrals.length === 0) {
    return ctx.reply("📭 Hozircha referallaringiz yo'q.\n\n🔗 Referal linkingizni do'stlarga yuboring!");
  }

  let text = `👥 <b>Sizning referallaringiz (${referrals.length})</b>\n\n`;
  referrals.slice(0, 20).forEach((ref, i) => {
    const usernameText = ref.username !== 'None' ? `@${ref.username}` : "❌";
    text += `${i + 1}. ${ref.full_name} (${usernameText})\n   📅 ${ref.date.substring(0, 10)}\n\n`;
  });

  if (referrals.length > 20) {
    text += `\n... va yana ${referrals.length - 20} ta referal`;
  }

  await ctx.replyWithHTML(text);
});

bot.action('my_link', async (ctx) => {
  const userId = ctx.from.id;
  const db = await getDb();
  const user = db.prepare('SELECT referal_code FROM users WHERE user_id = ?').get(userId);
  
  if (user) {
    const botInfo = await bot.telegram.getMe();
    const link = `https://t.me/${botInfo.username}?start=${user.referal_code}`;
    const shareText = encodeURIComponent(`Assalomu alaykum! Botdan foydalanish uchun obuna bo'ling va 5 ta referal to'plang!`);
    
    await ctx.replyWithHTML(
      `🔗 <b>Sizning referal linkingiz:</b>\n\n<code>${link}</code>\n\n` +
      `📢 Do'stlaringizga ulashing! Har bir do'stingiz obuna bo'lganda referal soningiz ortadi.`,
      Markup.inlineKeyboard([
        [Markup.button.url('📤 Linkni ulashish', `https://t.me/share/url?url=${link}&text=${shareText}`)],
        [Markup.button.callback('🔁 Orqaga', 'back_menu')]
      ])
    );
  }
});

bot.action('upload_screenshot', async (ctx) => {
  const userId = ctx.from.id;
  const db = await getDb();
  const user = db.prepare('SELECT referal_count, is_verified FROM users WHERE user_id = ?').get(userId);
  
  if (user) {
    if (user.is_verified === 1) {
      return ctx.answerCbQuery("✅ Siz allaqachon platformaga kirish huquqiga egasiz!", { show_alert: true });
    } else if (user.referal_count < 5) {
      return ctx.answerCbQuery(`❌ Siz hali 5 ta referal to'plamadingiz! (${user.referal_count}/5)`, { show_alert: true });
    } else {
      await ctx.replyWithHTML(
        " <b>Natijangizni yuklang</b>\n\n" +
        "Iltimos, natijangizning skrinshotini yuboring.\n\n" +
        "⚠️ <b>Eslatma:</b> Skrinshot aniq va tushunarli bo'lishi kerak!\n\n" +
        "📌 Faqat rasm (jpg, png) formatida yuboring.\n\n" +
        `📊 Hozirgi referal soningiz: ${user.referal_count}/5`
      );
      // In Telegraf, we use a state or just wait for the next photo message.
      // For simplicity in this script, we'll just handle any photo sent.
    }
  }
});

bot.action('already_uploaded', async (ctx) => {
  await ctx.answerCbQuery("✅ Siz allaqachon natijangizni yuklagansiz! Tez orada platformaga kirasiz.", { show_alert: true });
});

bot.action('back_menu', async (ctx) => {
  await ctx.deleteMessage();
  await sendMainMenu(ctx, ctx.from.id);
});

// Photo handler (Screenshot)
bot.on(message('photo'), async (ctx) => {
  const userId = ctx.from.id;
  const db = await getDb();
  const userData = db.prepare('SELECT full_name, username, referal_count, is_verified FROM users WHERE user_id = ?').get(userId);

  if (!userData) return;

  if (userData.referal_count >= 5 && userData.is_verified === 0) {
    db.prepare('UPDATE users SET is_verified = 1 WHERE user_id = ?').run(userId);
    
    await ctx.replyWithHTML(
      "✅ <b>Tabriklaymiz!</b> ✅\n\n" +
      "Sizning natijangiz muvaffaqiyatli yuborildi!\n" +
      "Endi platformadan foydalanishingiz mumkin.\n\n" +
      "👇 Quyidagi tugma orqali platformaga o'ting:",
      Markup.inlineKeyboard([
        [Markup.button.url('🚀 Platformaga o\'tish', PLATFORM_URL)]
      ])
    );
  } else {
    await ctx.replyWithHTML(
      "✅ <b>Natijangiz muvaffaqiyatli yuborildi!</b>\n\n" +
      " Sizning skrinshotingiz adminlarga yuborildi.\n\n" +
      "🙏 E'tiboringiz uchun rahmat!"
    );
  }

  // Notify admins
  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  const caption = (
    ` <b>Yangi natija yuborildi!</b>\n\n` +
    `👤 Foydalanuvchi: ${userData.full_name}\n` +
    `🆔 ID: ${userId}\n` +
    `📝 Username: @${userData.username !== 'None' ? userData.username : '❌'}\n` +
    `📊 Referal soni: ${userData.referal_count}/5\n` +
    `✅ Holati: ${userData.is_verified ? 'Tasdiqlangan' : 'Yangi'}\n` +
    `📅 Vaqt: ${new Date().toISOString()}`
  );

  for (const adminId of ADMINS) {
    try {
      await bot.telegram.sendPhoto(adminId, photo.file_id, { caption, parse_mode: 'HTML' });
    } catch (e) {
      console.error(`Failed to notify admin ${adminId}:`, e);
    }
  }

  await sendMainMenu(ctx, userId);
});

// Admin command
bot.command('admin', async (ctx) => {
  const userId = ctx.from.id;
  if (!ADMINS.includes(userId)) {
    return ctx.reply("❌ Siz admin emassiz!");
  }

  const db = await getDb();
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const verifiedUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_verified = 1').get().count;
  const fivePlusUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE referal_count >= 5').get().count;
  const totalReferrals = db.prepare('SELECT COUNT(*) as count FROM referrals').get().count;
  const topUsers = db.prepare('SELECT user_id, full_name, username, referal_count FROM users ORDER BY referal_count DESC LIMIT 10').all();

  let text = `📊 <b>Admin panel statistikasi</b>\n\n` +
    `👥 Umumiy foydalanuvchilar: ${totalUsers}\n` +
    `✅ Tasdiqlanganlar: ${verifiedUsers}\n` +
    `⭐ 5+ referal to'plaganlar: ${fivePlusUsers}\n` +
    `🔄 Jami referallar: ${totalReferrals}\n\n` +
    `🏆 <b>Top 10 foydalanuvchilar:</b>\n`;

  topUsers.forEach((user, i) => {
    const usernameText = user.username !== 'None' ? `@${user.username}` : "❌";
    text += `${i + 1}. ${user.full_name} (${usernameText}) - ${user.referal_count} ta referal\n`;
  });

  await ctx.replyWithHTML(text, Markup.inlineKeyboard([
    [Markup.button.callback('📢 Xabar yuborish', 'broadcast')],
    [Markup.button.callback('📊 Batafsil statistika', 'detailed_stats')]
  ]));
});

bot.action('broadcast', async (ctx) => {
  if (!ADMINS.includes(ctx.from.id)) return;
  await ctx.reply("📢 Yubormoqchi bo'lgan xabaringizni yuboring (Oddiy xabar sifatida):");
  // In a real app, we'd use a scene or state to capture the next message.
  // For this demo, we'll just listen for the next text message from an admin.
});

bot.action('detailed_stats', async (ctx) => {
  if (!ADMINS.includes(ctx.from.id)) return;
  const db = await getDb();
  const today = new Date().toISOString().split('T')[0];
  
  const todayUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE date(joined_date) = ?').get(today).count;
  const todayRefs = db.prepare('SELECT COUNT(*) as count FROM referrals WHERE date(date) = ?').get(today).count;
  const topFive = db.prepare('SELECT full_name, username, referal_count FROM users ORDER BY referal_count DESC LIMIT 5').all();

  let text = `📈 <b>Batafsil statistika</b>\n\n` +
    `📅 <b>Bugungi statistika:</b>\n` +
    `• Yangi foydalanuvchilar: ${todayUsers}\n` +
    `• Yangi referallar: ${todayRefs}\n\n` +
    `🏆 <b>Eng ko'p referal to'plaganlar:</b>\n`;

  topFive.forEach((user, i) => {
    const usernameText = user.username !== 'None' ? `@${user.username}` : "❌";
    text += `${i + 1}. ${user.full_name} (${usernameText}) - ${user.referal_count} ta\n`;
  });

  await ctx.replyWithHTML(text);
});

// Simple broadcast listener (for demo purposes)
bot.on(message('text'), async (ctx) => {
  if (ADMINS.includes(ctx.from.id) && (ctx.message as any).reply_to_message?.text?.includes("Yubormoqchi bo'lgan xabaringizni yuboring")) {
    const db = await getDb();
    const users = db.prepare('SELECT user_id FROM users').all();
    let success = 0;
    let failed = 0;

    for (const user of users) {
      try {
        await bot.telegram.copyMessage(user.user_id, ctx.chat.id, ctx.message.message_id);
        success++;
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e) {
        failed++;
      }
    }
    await ctx.reply(`✅ Xabar yuborildi!\n\nMuvaffaqiyatli: ${success}\nMuvaffaqiyatsiz: ${failed}`);
  }
});
