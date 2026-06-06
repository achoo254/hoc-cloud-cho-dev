# Note học tập: Linux Logs — Cấu trúc, Tìm kiếm, Log Server Tập trung

> **Nguồn:** `inet-2026-05-24_214925.wmv` (1h16m50s, screen recording bài lab).
> **Phân tích:** Gemini 2.5 Flash, `media_resolution=low`, sampling 0.2 fps. Generated 2026-05-25.
>
> **Lưu ý quan trọng:**
> 1. **Timestamps có thể sai scale** — model đôi lúc xuất `HH:MM:SS` lớn hơn độ dài video thực (vd `07:05:00`, `08:25:00`). Khi tra cứu, hãy hiểu là **vị trí tương đối**, nên scan vùng lân cận chứ không tin tuyệt đối.
> 2. **Phạm vi video thực tế:** chủ yếu là **lab DHCP với `dnsmasq` trên Ubuntu**; phần logs/`journalctl`/`/var/log` chỉ là kỹ năng phụ. Mục **3. Log server tập trung** vì vậy mỏng — video không có demo ELK/Graylog/rsyslog forwarding.
> 3. Mục tiêu học "log server tập trung" CẦN bổ sung từ nguồn khác (chưa được video cover).



## TL;DR
-   Cài đặt và cấu hình DHCP server (`dnsmasq`) trên Ubuntu, bao gồm các bước chuẩn bị hệ thống và cấu hình dịch vụ.
-   Thực hành sử dụng các lệnh Linux cơ bản (`vi`, `hostnamectl`, `timedatectl`, `ip a`, `ping`, `apt install`) để quản lý hệ thống và khắc phục sự cố.
-   Hướng dẫn đọc và phân tích log của DHCP server bằng `journalctl` và `grep` để theo dõi quá trình cấp IP và các bản tin DHCP.
-   Giải thích về `cloud-init` và `sysprep` trong môi trường ảo hóa nhằm đảm bảo các máy ảo được clone không bị trùng lặp ID/MAC.

## 1. Cấu trúc thư mục /var/log
-   `/var/log` — Thư mục chứa các file log của hệ thống Linux, rất quan trọng cho quản trị viên hệ thống để theo dõi và khắc phục sự cố (05:00:00).
-   `syslog` (ngầm định) — File log chung của hệ thống, được quản lý bởi `rsyslogd` (05:30:00).
-   `journalctl` — Lệnh xem log của `systemd`, thường được sử dụng để xem log của các dịch vụ (05:00:00).
-   (Video không đề cập chi tiết về các file/sub-directory cụ thể trong `/var/log` như `/var/log/messages`, `/var/log/auth.log`, `/var/log/dmesg`, `/var/log/cron`, `/var/log/maillog`, `/var/log/httpd|nginx`, `/var/log/btmp`, `/var/log/wtmp`, `/var/log/lastlog`, `/var/log/audit/`, `/var/log/journal/`, và cơ chế rotate log).
-   (Video không đề cập đến sự khác biệt về cấu trúc log giữa các bản phân phối Linux).

## 2. Lệnh tìm kiếm & xử lý log trong Linux
-   `ls` — Liệt kê nội dung thư mục.
    -   Ví dụ từ video: `ls` (01:00:00).
-   `cat` — Hiển thị nội dung file.
    -   Ví dụ từ video: `cat /etc/resolv.conf` (01:55:00), `cat /etc/hosts` (02:05:00).
-   `ping` — Kiểm tra kết nối mạng.
    -   Ví dụ từ video: `ping 8.8.8.8` (01:40:00), `ping google.com` (01:50:00).
-   `apt install <package>` — Cài đặt gói phần mềm.
    -   Ví dụ từ video: `apt install iputils-ping` (01:50:00), `apt install dnsmasq` (02:35:00).
-   `hostnamectl set-hostname <new-hostname>` — Đặt tên máy chủ.
    -   Ví dụ từ video: `hostnamectl set-hostname dhcpserver01` (02:05:00).
-   `timedatectl` — Hiển thị thông tin thời gian và múi giờ hệ thống.
    -   Ví dụ từ video: `timedatectl` (02:35:00).
-   `timedatectl set-timezone <timezone>` — Đặt múi giờ hệ thống.
    -   Ví dụ từ video: `timedatectl set-timezone Asia/Ho_Chi_Minh` (02:50:00).
-   `vi`/`vim` — Trình soạn thảo văn bản trên Linux.
    -   Mục đích: Chỉnh sửa file cấu hình hoặc file văn bản.
    -   Ví dụ từ video: `vi /etc/netplan/01-netcfg.yaml` (01:30:00), `vi /etc/hosts` (02:05:00), `vi /etc/dnsmasq.conf` (02:50:00).
    -   Note bổ sung:
        -   `i`: Chuyển sang chế độ insert (chèn).
        -   `Esc`: Thoát chế độ insert.
        -   `:x`: Lưu và thoát.
        -   `:q!`: Thoát mà không lưu.
        -   `:set nu`: Hiển thị số dòng.
        -   `DD`: Xóa dòng hiện tại.
        -   `Shift+G`: Nhảy đến cuối file.
        -   `10G`: Nhảy đến dòng số 10.
-   `journalctl -fu <service>` — Xem log của dịch vụ theo thời gian thực.
    -   Mục đích: Theo dõi log của một dịch vụ cụ thể.
    -   Ví dụ từ video: `journalctl -fu dnsmasq.service` (04:15:00, 05:00:00, 05:20:00).
-   `grep -v "^#" | grep -v "^$"` — Lọc bỏ các dòng comment và dòng trống.
    -   Mục đích: Dọn dẹp file cấu hình để dễ đọc hơn.
    -   Ví dụ từ video: `cat /etc/dnsmasq.conf | grep -v "^#" | grep -v "^$"` (04:50:00).
-   `systemctl restart <service>` — Khởi động lại dịch vụ.
    -   Ví dụ từ video: `systemctl restart dnsmasq.service` (03:50:00).
-   `systemctl status <service>` — Kiểm tra trạng thái dịch vụ.
    -   Ví dụ từ video: `systemctl status dnsmasq.service` (03:55:00).
-   `ip a` — Hiển thị cấu hình mạng.
    -   Ví dụ từ video: `ip a` (01:00:00).
-   `reboot` — Khởi động lại hệ thống.
    -   Mục đích: Áp dụng các thay đổi cấu hình hệ thống.
-   `tail -f /var/log/syslog` — Xem log của `syslog` theo thời gian thực.
    -   Mục đích: Theo dõi các sự kiện chung của hệ thống.
    -   Ví dụ từ video: `tail -f /var/log/syslog` (07:05:00).

## 3. Hệ thống log server tập trung (centralized logging)
-   Lý do cần log tập trung:
    -   Để quản lý log từ nhiều máy chủ một cách hiệu quả.
    -   Quan trọng cho an ninh và tuân thủ quy định, đặc biệt trong các môi trường hạn chế internet như ngân hàng (01:00:00, 08:25:00).
-   Kiến trúc tổng quan: Giảng viên trình bày khái niệm về việc thu thập log từ nhiều máy chủ.
-   Các stack/component được nhắc:
    -   `rsyslog` (ngầm định) — Daemon quản lý syslog trên Ubuntu (05:30:00).
    -   `cloud-init` — Công cụ khởi tạo VM tự động trên Linux, giúp reset ID/MAC khi clone VM từ template (05:30:00, 06:00:00).
    -   `sysprep` — Công cụ tương tự `cloud-init` cho Windows VM (05:50:00).
-   (Video không đi sâu vào cấu hình mẫu của `rsyslog`/`syslog-ng` hay các stack/component log tập trung khác như Elastic Stack, Graylog, Splunk, Kafka, Filebeat/Fluentd/Fluent Bit/Vector/Logstash, Kibana/Grafana, ELK/EFK).
-   (Video không đề cập đến các lưu ý về security/ops như TLS, retention, parse JSON, performance trong bối cảnh log tập trung).

## 4. Demo / Lab thực hành trong video
-   **00:00:00 -> 00:35:00:** Giới thiệu bài lab DHCP, kiểm tra GitHub repo của học viên.
-   **00:35:00 -> 01:00:00:** Hướng dẫn cấu trúc thư mục trên GitHub cho bài lab.
-   **01:00:00 -> 01:40:00:** Đăng nhập SSH vào server Ubuntu bằng MobaXterm, kiểm tra IP (`ip a`).
-   **01:40:00 -> 01:55:00:** Cài đặt `iputils-ping` và kiểm tra kết nối internet (`ping 8.8.8.8`, `ping google.com`). Giải thích về DNS.
-   **01:55:00 -> 02:05:00:** Giải thích về `vi`/`vim` và các lệnh cơ bản (`i`, `:x`, `:q!`).
-   **02:05:00 -> 02:20:00:** Đặt hostname (`hostnamectl set-hostname`) và cấu hình `/etc/hosts`.
-   **02:20:00 -> 02:35:00:** Cấu hình timezone (`timedatectl set-timezone`).
-   **02:35:00 -> 02:50:00:** Cài đặt `dnsmasq` (`apt install dnsmasq`).
-   **02:50:00 -> 03:30:00:** Cấu hình `dnsmasq` cho DHCP server (`vi /etc/dnsmasq.conf`). Sử dụng `:set nu` để hiển thị số dòng, `Shift+G` để nhảy dòng.
-   **03:30:00 -> 03:50:00:** Giải thích cấu hình DHCP (range IP, lease time, gateway, DNS server, netmask).
-   **03:50:00 -> 04:00:00:** Khởi động lại và kiểm tra trạng thái `dnsmasq` (`systemctl restart dnsmasq.service`, `systemctl status dnsmasq.service`).
-   **04:00:00 -> 04:15:00:** Tạo VM client từ template trên vSphere.
-   **04:15:00 -> 04:30:00:** Kiểm tra log của DHCP server (`journalctl -fu dnsmasq.service`) khi client nhận IP.
-   **04:30:00 -> 04:45:00:** Giải thích về `cloud-init` và `sysprep` để tránh trùng lặp ID/MAC khi clone VM.
-   **04:45:00 -> 05:00:00:** Demo clone VM client thứ hai và kiểm tra log DHCP.
-   **05:00:00 -> 05:15:00:** Giải thích về thư mục `/var/log` và tầm quan trọng của việc đọc log.
-   **05:15:00 -> 05:30:00:** Demo tìm kiếm log DHCP trên server (`journalctl -fu dnsmasq.service`) và kiểm tra các bản tin DHCP (DISCOVER, OFFER, REQUEST, ACK).

## 5. Tips & Best Practices giảng viên nhấn mạnh
-   Sử dụng Git để quản lý tài liệu lab và ghi chú một cách có cấu trúc (00:35:00).
-   Sử dụng các tool SSH chuyên dụng (MobaXterm, PuTTY, Xshell) thay vì console trực tiếp để thao tác hiệu quả hơn (01:20:00).
-   Hiểu rõ cơ chế DNS (phân biệt `ping` IP và `ping` domain) (01:50:00).
-   Đặt hostname và timezone chuẩn trước khi cài đặt dịch vụ để tránh lỗi (02:05:00, 02:35:00).
-   Hiểu rõ các gói phụ thuộc khi cài đặt offline (02:40:00).
-   Với máy chủ có nhiều cạc mạng, chỉ nên cấu hình gateway trên một cạc để tránh xung đột (03:50:00).
-   Hiểu rõ vai trò của DHCP server (chỉ cấp IP, không có nhiệm vụ định tuyến ra internet) (05:15:00).
-   Sử dụng `cloud-init`/`sysprep` để reset ID/MAC khi clone VM từ template, đảm bảo mỗi VM có định danh duy nhất (05:30:00, 06:00:00).
-   Thành thạo việc đọc log để troubleshoot (giống như debug code) (05:00:00, 05:15:00).
-   Sử dụng các lệnh lọc log (`grep -v`, `grep -E`) để dễ dàng phân tích và chỉ hiển thị thông tin cần thiết (04:50:00).
-   Sử dụng `journalctl` để xem log của dịch vụ và `tail -f` để xem log theo thời gian thực (05:00:00, 07:05:00).

## 6. Mục lục theo timestamp
-   [00:00:00] — Giới thiệu bài lab DHCP và kiểm tra GitHub repo.
-   [00:35:00] — Hướng dẫn cấu trúc thư mục trên GitHub.
-   [01:00:00] — Đăng nhập SSH vào server Ubuntu, kiểm tra IP.
-   [01:40:00] — Cài đặt `iputils-ping` và kiểm tra kết nối internet.
-   [01:55:00] — Giải thích về `vi`/`vim` và các lệnh cơ bản.
-   [02:05:00] — Đặt hostname và cấu hình `/etc/hosts`.
-   [02:20:00] — Cấu hình timezone.
-   [02:35:00] — Cài đặt `dnsmasq`.
-   [02:50:00] — Cấu hình `dnsmasq` cho DHCP server.
-   [03:30:00] — Giải thích cấu hình DHCP.
-   [03:50:00] — Khởi động lại và kiểm tra trạng thái `dnsmasq`.
-   [04:00:00] — Tạo VM client từ template trên vSphere.
-   [04:15:00] — Kiểm tra log của DHCP server khi client nhận IP.
-   [04:30:00] — Giải thích về `cloud-init` và `sysprep`.
-   [04:45:00] — Demo clone VM client thứ hai và kiểm tra log DHCP.
-   [05:00:00] — Giải thích về thư mục `/var/log` và tầm quan trọng của việc đọc log.
-   [05:15:00] — Demo tìm kiếm log DHCP trên server.

## 7. Thuật ngữ & lệnh đáng nhớ (cheat sheet)
-   `DHCP` — Dynamic Host Configuration Protocol, giao thức cấp phát địa chỉ IP tự động.
-   `DNS` — Domain Name System, hệ thống phân giải tên miền thành địa chỉ IP.
-   `NAT` — Network Address Translation, kỹ thuật cho phép nhiều thiết bị dùng chung một địa chỉ IP công cộng để truy cập internet.
-   `System Admin` — Quản trị viên hệ thống.
-   `Lab` — Môi trường thực hành.
-   `Git` — Hệ thống kiểm soát phiên bản.
-   `MobaXterm` — Công cụ SSH client.
-   `vi`/`vim` — Trình soạn thảo văn bản trên Linux.
-   `i` (vi command) — Chuyển sang chế độ insert (chèn).
-   `Esc` (vi command) — Thoát chế độ insert.
-   `:x` (vi command) — Lưu và thoát.
-   `:q!` (vi command) — Thoát mà không lưu.
-   `:set nu` (vi command) — Hiển thị số dòng.
-   `DD` (vi command) — Xóa dòng hiện tại.
-   `Shift+G` (vi command) — Nhảy đến cuối file.
-   `10G` (vi command) — Nhảy đến dòng số 10.
-   `hostnamectl` — Lệnh quản lý hostname.
-   `timedatectl` — Lệnh quản lý thời gian và múi giờ hệ thống.
-   `dnsmasq` — Dịch vụ cung cấp DNS và DHCP.
-   `iputils-ping` — Gói phần mềm chứa lệnh `ping`.
-   `Cloud-init` — Công cụ khởi tạo VM tự động trên Linux (thường dùng trong môi trường cloud/ảo hóa).
-   `Sysprep` — System Preparation Tool, công cụ chuẩn bị Windows VM để clone.
-   `SID` — Security Identifier, định danh bảo mật duy nhất của hệ thống Windows.
-   `Machine ID` — Định danh duy nhất của hệ thống Linux.
-   `Log` — Ghi lại các sự kiện hệ thống.
-   `/var/log` — Thư mục chứa các file log.
-   `journalctl` — Lệnh xem log của systemd.
-   `grep` — Lệnh tìm kiếm theo mẫu trong file.
-   `grep -v` — Lọc bỏ các dòng chứa mẫu.
-   `grep -v "^#"` — Lọc bỏ các dòng bắt đầu bằng `#` (comment).
-   `grep -v "^$"` — Lọc bỏ các dòng trống.
-   `tail -f` — Xem nội dung file theo thời gian thực.
-   `cat` — Hiển thị nội dung file.
-   `systemctl status` — Kiểm tra trạng thái dịch vụ.
-   `systemctl restart` — Khởi động lại dịch vụ.
-   `ip a` — Hiển thị cấu hình mạng.
-   `reboot` — Khởi động lại hệ thống.
-   `rsyslogd` — Daemon quản lý syslog.
-   `DISCOVER` (DHCP) — Bản tin client gửi để tìm DHCP server.
-   `OFFER` (DHCP) — Bản tin DHCP server gửi để cấp IP cho client.
-   `REQUEST` (DHCP) — Bản tin client gửi để yêu cầu IP từ DHCP server.
-   `ACK` (DHCP) — Bản tin DHCP server gửi để xác nhận cấp IP cho client.