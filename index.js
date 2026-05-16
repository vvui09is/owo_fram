const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// ==================== CẤU HÌNH HỆ THỐNG ====================
const ADMIN_ID = "950939671821697084"; // Chỉ ID này mới có quyền điều khiển bot
const CHANNEL_ID = "1414165834649309265";     // ID Kênh Discord để các bot gửi lệnh farm
// ==========================================================

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomRange = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

const bots = []; // Mảng lưu trữ các client bot

// Hàm đọc danh sách token từ file tokens.txt
function loadTokens() {
    const filePath = path.join(__dirname, 'tokens.txt');
    if (!fs.existsSync(filePath)) {
        // Nếu chưa có file thì tạo file trống để người dùng điền
        fs.writeFileSync(filePath, 'TOKEN_DISCORD_LINE_1\nTOKEN_DISCORD_LINE_2', 'utf-8');
        console.log(chalk.red('[-] Thư mục chưa có file tokens.txt. Đã tự động tạo file, vui lòng mở file tokens.txt lên điền token vào rồi chạy lại tool!'));
        process.exit(0);
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    // Lọc bỏ các dòng trống, khoảng trắng dư thừa
    const tokens = content.split(/\r?\n/).map(t => t.trim()).filter(t => t.length > 0 && !t.startsWith('#'));
    return tokens;
}

// Logic vòng lặp farm chính cho mỗi tài khoản
async function startFarming(client, index) {
    client.isFarming = true;
    console.log(chalk.green(`[+] [${client.user.username}] Bắt đầu quy trình cày cuốc...`));

    const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
    if (!channel) {
        console.log(chalk.red(`[-] [${client.user.username}] Không tìm thấy hoặc không có quyền truy cập kênh farm mang ID: ${CHANNEL_ID}`));
        return;
    }

    while (client.isFarming) {
        try {
            // Lệnh 1: owo hunt
            console.log(chalk.cyan(`[${new Date().toLocaleTimeString()}] [${client.user.username}] -> owo hunt`));
            await channel.send('owo hunt');
            await sleep(randomRange(2500, 4500)); // Nghỉ ngắn ngẫu nhiên giữa 2 lệnh

            if (!client.isFarming) break;

            // Lệnh 2: owo battle
            console.log(chalk.blue(`[${new Date().toLocaleTimeString()}] [${client.user.username}] -> owo battle`));
            await channel.send('owo battle');

            // Thời gian chờ cho lượt tiếp theo (cooldown owo gốc là 15s)
            // Đặt ngẫu nhiên từ 17s - 25s kết hợp so le theo số thứ tự bot để tránh spam dồn dập
            const cooldown = randomRange(17000, 25000) + (index * 1500);
            console.log(chalk.gray(`[${client.user.username}] Nghỉ chờ hồi chiêu ${cooldown / 1000} giây...\n`));
            await sleep(cooldown);

        } catch (error) {
            console.error(chalk.red(`[-] [${client.user.username}] Gặp lỗi khi gửi lệnh: ${error.message}`));
            await sleep(6000);
        }
    }
}

// Hàm khởi tạo toàn bộ hệ thống bot
async function initSystem() {
    const tokens = loadTokens();
    if (tokens.length === 0) {
        console.log(chalk.red('[-] File tokens.txt trống rỗng. Hãy thêm ít nhất 1 token vào file!'));
        process.exit(0);
    }

    console.log(chalk.magenta(`[*] Tìm thấy tổng cộng ${tokens.length} token trong file. Đang tiến hành đăng nhập...`));

    tokens.forEach((token, index) => {
        const client = new Client({ checkUpdate: false });
        client.isFarming = false;

        client.on('ready', () => {
            console.log(chalk.yellow(`[Bot #${index + 1}] Đăng nhập thành công: ${client.user.tag}`));
            bots.push(client);
        });

        // 1. Luồng xử lý điều khiển từ Admin
        client.on('messageCreate', async (message) => {
            if (message.author.id !== ADMIN_ID) return;

            const command = message.content.trim().toLowerCase();

            if (command === '!start') {
                if (client.isFarming) {
                    return message.reply(`🤖 **${client.user.username}** đã ở trạng thái farm sẵn từ trước!`);
                }
                // Giãn cách thời gian khởi chạy giữa các nick để không bị nghẽn mạng Discord
                await sleep(index * 3500); 
                startFarming(client, index);
                message.reply(`✅ **${client.user.username}** đã vào luồng farm.`);
            }

            if (command === '!stop') {
                if (!client.isFarming) {
                    return message.reply(`💤 **${client.user.username}** đang trong chế độ nghỉ ngơi.`);
                }
                client.isFarming = false;
                console.log(chalk.gray(`[-] [${client.user.username}] Đã nhận lệnh dừng farm.`));
                message.reply(`🛑 **${client.user.username}** đã dừng hành động farm.`);
            }

            if (command === '!status') {
                const state = client.isFarming ? "🟢 Đang hoạt động" : "🔴 Đang tạm dừng";
                message.reply(`👤 **${client.user.username}** Trạng thái: ${state}`);
            }
        });

        // 2. Hệ thống chống Ban khẩn cấp tự động khi gặp Captcha OwO
        client.on('messageCreate', async (message) => {
            // Kiểm tra tin nhắn từ đúng ID của OwO Bot gốc
            if (message.author.id === "408785106942115842") { 
                // Nếu tin nhắn đề cập đến ID của tài khoản clone này và có từ khóa bắt xác thực
                if (message.content.includes(client.user.id) && (message.content.includes("captcha") || message.content.includes("verify") || message.content.includes("link"))) {
                    client.isFarming = false; // Phanh gấp khẩn cấp
                    
                    console.log(chalk.bgRed.white(`[!!!] CẢNH BÁO NGUY HIỂM: Tài khoản ${client.user.username} dính gậy CAPTCHA từ OwO. ĐÃ DỪNG FARM!`));
                    
                    const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
                    if (channel) {
                        channel.send(`⚠️⚠️⚠️ <@${ADMIN_ID}> **CỨU VIỆN KHẨN CẤP!**\nTài khoản **${client.user.username}** vừa dính kiểm tra Captcha từ OwO Bot.\nHệ thống đã ngắt tiến trình farm tự động của nick này để tránh bị ban xu/acc. Vui lòng vào giải tay!`);
                    }
                }
            }
        });

        // Đăng nhập bot
        client.login(token).catch(() => {
            console.log(chalk.red(`[-] [Lỗi Đăng Nhập] Token thứ ${index + 1} không hợp lệ, sai định dạng hoặc đã bị hết hạn.`));
        });
    });
}

// Chạy hệ thống
initSystem();
