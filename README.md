# OpenVerseAutoBot

**OpenVerseAutoBot** là một công cụ tự động hoàn thành các nhiệm vụ hàng ngày trên nền tảng OpenVerse. Bot sử dụng private key ví Ethereum để đăng nhập, thực hiện nhiệm vụ, đổi IP qua Tor, và hỗ trợ proxy SOCKS5.

---

## Tính năng

- Đăng nhập tự động bằng private key Ethereum.
- Tự động lấy và hoàn thành các nhiệm vụ hàng ngày.
- Đổi IP qua Tor cho mỗi tài khoản.
- Hỗ trợ proxy SOCKS5 (mặc định là `socks5://127.0.0.1:9050`).
- Hiển thị tiến trình, trạng thái nhiệm vụ, điểm số, và thông tin tài khoản.
- Giao diện dòng lệnh đẹp, dễ theo dõi.

---

## Yêu cầu hệ thống

- **Node.js** >= 16.x
- **npm** >= 8.x
- **Hệ điều hành:** Windows, Linux, hoặc macOS
- **Tor** (chạy ở chế độ SOCKS5 và mở ControlPort, mặc định 9050/9051)
- Kết nối Internet

---

## Cài đặt

1. **Clone dự án:**

2. **Cài đặt thư viện:**
   ```bash
   npm install
   ```

3. **Cài đặt & cấu hình Tor:**
   - Tải Tor Browser hoặc Tor service phù hợp hệ điều hành.
   - Đảm bảo Tor đang chạy với:
     - SOCKS5 proxy tại `127.0.0.1:9050`
     - ControlPort mở tại `127.0.0.1:9051`
     - Đặt mật khẩu ControlPort trong file cấu hình Tor (`torrc`):
       ```
       ControlPort 9051
       HashedControlPassword <hash>
       ```
     - (Mặc định script dùng password: `....`, bạn có thể thay đổi trong `index.js`)

4. **Thêm private key:**
   - Tạo file `pk.txt` trong thư mục gốc.
   - Mỗi dòng là một private key ví Ethereum (không có tiền tố `0x` hoặc có đều được).
   - Ví dụ:
     ```
     0xabc123...
     0xdef456...
     ```

---

## Sử dụng

Chạy bot bằng lệnh:
```bash
node index.js
```

- Bot sẽ tự động:
  - Đổi IP Tor cho mỗi tài khoản.
  - Đăng nhập, lấy nhiệm vụ, hoàn thành nhiệm vụ.
  - Hiển thị tiến trình và thông tin tài khoản.
  - Lặp lại chu kỳ sau mỗi 24 giờ.

---

## Cấu hình nâng cao

- **Proxy:** Mặc định là `socks5://127.0.0.1:9050`. Nếu muốn đổi, sửa biến `proxy` trong hàm `processAccount` ở `index.js`.
- **Tor Control Password:** Đổi biến `TOR_CONTROL_PASSWORD` ở đầu file `index.js` nếu bạn thay đổi mật khẩu Tor.
- **Thời gian delay:** Có thể chỉnh các giá trị delay trong các hàm nếu muốn bot chạy nhanh/chậm hơn.

---

## Lưu ý bảo mật

- **Không chia sẻ file `pk.txt`** hoặc private key cho bất kỳ ai.
- Chỉ sử dụng trên máy cá nhân, không chạy trên máy chủ công cộng.
- Đảm bảo Tor được cấu hình đúng để bảo vệ IP thật của bạn.
- Không sử dụng private key chứa tài sản có giá trị.

---

## Xử lý lỗi thường gặp

- **Không đăng nhập được:** Kiểm tra lại private key, kết nối Tor, và cấu hình ControlPort.
- **Không đổi được IP:** Đảm bảo Tor đã bật ControlPort và đúng mật khẩu.
- **Không lấy được nhiệm vụ:** Có thể do API thay đổi hoặc tài khoản bị giới hạn.

---

## Đóng góp & liên hệ

- Nếu bạn gặp lỗi hoặc muốn đóng góp, hãy tạo issue hoặc pull request trên GitHub.
- Mọi thắc mắc liên hệ: [your-email@example.com]

---

## License

MIT License

---

**Chúc bạn sử dụng bot hiệu quả!** 