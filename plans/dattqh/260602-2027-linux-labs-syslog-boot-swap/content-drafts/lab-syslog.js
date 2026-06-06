// Lab content — Syslog tập trung (rsyslog server ↔ client). Shape camelCase (Mongo).
// Practical xây từ output THẬT trên dattqh-nat (171, server) + dattqh-client (172, client).
// Citations: RFC 5424/3164/5426/6587, rsyslog.com/doc, man rsyslog.conf(5)/logger(1).

export default {
  slug: 'syslog',
  module: '02-linux',
  title: 'Syslog tập trung (rsyslog server ↔ client)',
  estimatedMinutes: 45,

  misconceptions: [
    {
      wrong: 'Syslog và systemd-journald là hai tên gọi của cùng một thứ.',
      right: 'Syslog là <em>giao thức + định dạng message</em> (<a href="https://datatracker.ietf.org/doc/html/rfc5424">RFC 5424</a>); journald là một <em>daemon</em> ghi journal nhị phân cục bộ; rsyslog là một daemon khác implement syslog. Ba khái niệm khác tầng.',
      why: 'P1: <a href="https://datatracker.ietf.org/doc/html/rfc5424#section-6">RFC 5424 §6</a> định nghĩa syslog message gồm PRI + HEADER + STRUCTURED-DATA + MSG — đây là format text trên dây, không phải một chương trình. P2: Trên Ubuntu 24.04, <code>systemd-journald</code> nhận log qua socket <code>/run/systemd/journal/</code> rồi lưu nhị phân tại <code>/var/log/journal</code> hoặc <code>/run/log/journal</code> (volatile); <code>rsyslog</code> đọc lại journal đó qua module <code>imjournal</code> rồi ghi text ra <code>/var/log/syslog</code> và/hoặc forward đi. P3: Khi debug, <code>journalctl</code> đọc journal nhị phân của journald, còn <code>tail -f /var/log/syslog</code> đọc output text của rsyslog — hai nguồn có thể lệch nhau nếu rsyslog bị dừng nhưng journald vẫn chạy.',
    },
    {
      wrong: 'Cài rsyslog xong là log tự động được gửi sang server tập trung.',
      right: 'rsyslog mặc định chỉ ghi log cục bộ. Forward qua mạng cần khai báo action <code>omfwd</code> với <code>target</code> + <code>port</code> trong <code>/etc/rsyslog.d/</code>.',
      why: 'P1: <a href="https://www.rsyslog.com/doc/configuration/modules/omfwd.html">module omfwd</a> là output module chịu trách nhiệm gửi message ra TCP/UDP; không khai báo nó thì không có đường ra mạng. P2: Cấu hình tối thiểu phía client là một dòng <code>*.* action(type="omfwd" target="…" port="514" protocol="tcp")</code> — selector <code>*.*</code> nghĩa mọi facility, mọi severity. P3: Đây là lý do sau khi <code>apt install rsyslog</code> trên client mà server tập trung vẫn trống — thiếu file forward; kiểm tra bằng <code>ss -tnp | grep :514</code> xem có kết nối ra server không.',
    },
    {
      wrong: 'Dùng UDP 514 thì log chắc chắn tới được server.',
      right: 'UDP 514 (<a href="https://datatracker.ietf.org/doc/html/rfc5426">RFC 5426</a>) không có ACK, mất gói khi mạng nghẽn hoặc server bận. Muốn không mất log cần TCP (<a href="https://datatracker.ietf.org/doc/html/rfc6587">RFC 6587</a>) kèm queue.',
      why: 'P1: RFC 5426 quy định transport UDP cho syslog là best-effort — không retransmit, không phát hiện mất gói. P2: rsyslog hỗ trợ <code>protocol="tcp"</code> (octet-framing/RFC 6587) và <code>queue.type="linkedList"</code> + <code>action.resumeRetryCount</code> để giữ message trong hàng đợi khi server tạm down rồi gửi lại. P3: Khi chọn UDP cho tiện, mất log lúc cao tải sẽ im lặng — không có dấu hiệu; chuyển sang TCP + queue đánh đổi độ trễ/bộ nhớ lấy độ tin cậy, kiểm bằng <code>logger</code> test rồi đối chiếu trên server.',
    },
    {
      wrong: 'Mỗi máy gửi log lên server thì server tự tách log theo từng host.',
      right: 'Server gộp mọi message vào sink mặc định nếu không có template. Tách theo host/program phải tự định nghĩa <code>template</code> dynafile dựa trên property <code>%HOSTNAME%</code>, <code>%PROGRAMNAME%</code>.',
      why: 'P1: <a href="https://www.rsyslog.com/doc/configuration/templates.html">rsyslog template</a> cho phép dùng property của message để sinh tên file động (dynaFile). P2: Template <code>"/var/log/remote/%HOSTNAME%/%PROGRAMNAME%.log"</code> + <code>action(type="omfile" dynaFile=…)</code> tạo cây thư mục theo host và chương trình; điều kiện <code>if ($fromhost-ip != "127.0.0.1")</code> tránh trộn log cục bộ của server. P3: Không có template thì mọi host đổ chung vào <code>/var/log/syslog</code> của server, rất khó truy vết nguồn — đây là khác biệt giữa "có nhận log" và "log dùng được".',
    },
  ],

  tldr: [
    {
      what: 'Facility · Severity (PRI)',
      why: 'P1: <a href="https://datatracker.ietf.org/doc/html/rfc5424#section-6.2.1">RFC 5424 §6.2.1</a> định nghĩa PRI = facility×8 + severity. Facility (0–23: kern, user, auth, cron, local0–7…) cho biết nguồn; severity (0–7: emerg→debug) cho biết mức. P2: Selector trong rsyslog dạng <code>facility.severity</code> (vd <code>auth.warning</code>, <code>*.*</code>) để route message. P3: Lọc theo PRI là cách giảm nhiễu khi forward — vd chỉ gửi <code>*.warning</code> lên server, giữ debug cục bộ.',
      whyBreaks: 'Chọn nhầm facility (vd ghi local7 nhưng filter local0) khiến message không khớp rule và biến mất.',
      deploymentUse: 'Quy ước facility cho app tự viết: dùng local0–local7 (RFC 5424 reserved cho local use), không chiếm kern/auth.',
    },
    {
      what: 'imudp / imtcp (input server)',
      why: 'P1: <a href="https://www.rsyslog.com/doc/configuration/modules/imtcp.html">imtcp</a>/<a href="https://www.rsyslog.com/doc/configuration/modules/imudp.html">imudp</a> là input module mở cổng nghe trên server. P2: <code>module(load="imtcp") input(type="imtcp" port="514")</code> mở TCP 514; tương tự imudp cho UDP 514. Verify bằng <code>ss -lntup | grep :514</code> thấy rsyslogd LISTEN. P3: Không load input module thì server không nghe — client kết nối bị refuse, đây là bước đầu khi dựng log tập trung.',
      whyBreaks: 'Quên load module hoặc firewall chặn 514 → client báo connection refused / log kẹt trong queue.',
      deploymentUse: 'Production: bind input vào IP nội bộ, mở 514/tcp chỉ cho subnet quản trị; cân nhắc TLS (imtcp + gtls) khi qua mạng không tin cậy.',
    },
    {
      what: 'omfwd (forward client)',
      why: 'P1: <a href="https://www.rsyslog.com/doc/configuration/modules/omfwd.html">omfwd</a> là output module gửi message ra mạng. P2: <code>*.* action(type="omfwd" target="192.168.122.171" port="514" protocol="tcp")</code> — chọn TCP để có kết nối tin cậy; thêm <code>action.resumeRetryCount</code> để thử lại khi đứt. P3: Đây là toàn bộ "đường ra" của client; quan sát kết nối bằng <code>ss -tnp | grep :514</code>.',
      whyBreaks: 'Sai target IP/port hoặc server chưa nghe → message dồn vào queue, đầy queue thì bắt đầu mất.',
      deploymentUse: 'Đặt file forward tên 90-*.conf để chạy sau rule mặc định; dùng FQDN + DNS nội bộ thay IP cứng khi có hạ tầng DNS.',
    },
    {
      what: 'Queue + resumeRetryCount',
      why: 'P1: <a href="https://www.rsyslog.com/doc/concepts/queues.html">rsyslog queue</a> đệm message giữa input và action. P2: <code>queue.type="linkedList" queue.size="10000"</code> + <code>action.resumeRetryCount="100"</code> giữ tối đa 10000 message trong RAM khi action (forward) tạm fail rồi resend khi server lên lại. P3: Đây là khác biệt giữa "mất log khi server reboot" và "log đến chậm nhưng đủ"; đánh đổi RAM lấy độ bền.',
      whyBreaks: 'Queue mặc định nhỏ + retry hữu hạn → server down lâu thì queue đầy, message mới bị drop (đếm qua impstats).',
      deploymentUse: 'Tải cao / SLA log: dùng disk-assisted queue (<code>queue.type="disk"</code> hoặc LinkedList + spillToDisk) để không mất khi RAM đầy hoặc rsyslog restart.',
    },
    {
      what: 'Template dynafile (server)',
      why: 'P1: Template sinh chuỗi từ property message (RFC 5424 fields). P2: <code>template(name="RemoteHostFile" type="string" string="/var/log/remote/%HOSTNAME%/%PROGRAMNAME%.log")</code> rồi <code>action(type="omfile" dynaFile="RemoteHostFile")</code> ghi log mỗi host/program một file. P3: Tách nguồn ngay tại tầng ghi giúp <code>grep</code>/log-rotate theo host dễ hơn nhiều so với một file gộp.',
      whyBreaks: 'dynaFile trỏ thư mục mà user rsyslog (syslog) không ghi được → "Could not open dynamic file … discarding message".',
      deploymentUse: 'Cấp quyền thư mục cho user mà rsyslog drop xuống (<code>$PrivDropToUser syslog</code>); gắn logrotate cho cây /var/log/remote.',
    },
    {
      what: 'logger (sinh test message)',
      why: 'P1: <a href="https://man7.org/linux/man-pages/man1/logger.1.html">logger(1)</a> ghi một message vào syslog qua socket <code>/dev/log</code>. P2: <code>logger -p auth.warning "msg"</code> đặt facility=auth, severity=warning; rsyslog nhận qua imuxsock rồi áp rule (kể cả forward). P3: Là cách kiểm tra đường log end-to-end mà không cần chờ event thật — đối chiếu message trên server sau khi gửi.',
      whyBreaks: 'Quên <code>-p</code> → mặc định <code>user.notice</code>, có thể không khớp filter đang test.',
      deploymentUse: 'Dùng trong healthcheck/script: gửi heartbeat <code>logger</code> định kỳ, alert nếu server tập trung không thấy heartbeat.',
    },
  ],

  walkthrough: [
    {
      step: 1,
      what: 'Ứng dụng sinh log → socket /dev/log',
      why: 'Process gọi syslog(3) hoặc chạy logger(1) ghi vào unix socket /dev/log. Trên hệ systemd, journald nghe socket này; rsyslog lấy lại qua imuxsock/imjournal. Đây là điểm vào của mọi log hệ thống.',
      whyBreaks: 'Nếu rsyslog không load input đọc journal/socket → /var/log/syslog không cập nhật dù journald vẫn ghi.',
      observeWith: 'logger -p user.info "hello"; sau đó journalctl -n 5 và tail -n 5 /var/log/syslog để thấy cùng message ở hai nơi.',
      code: '# Sinh một message thử\nlogger -p user.info "walkthrough step1"\n\n# Xem ở journald (binary journal)\njournalctl -n 3 --no-pager\n\n# Xem ở rsyslog (text)\ntail -n 3 /var/log/syslog',
    },
    {
      step: 2,
      what: 'rsyslog client áp rule *.* → action omfwd',
      why: 'rsyslog đọc các file /etc/rsyslog.d/*.conf theo thứ tự tên. File forward (90-forward.conf) chứa selector *.* khớp mọi message, đẩy vào action omfwd để gửi server. Selector quyết định cái gì được forward.',
      whyBreaks: 'Đặt file forward tên đứng trước rule có "stop" → message bị chặn trước khi tới omfwd; hoặc selector hẹp (chỉ *.err) bỏ sót log info.',
      observeWith: 'rsyslogd -N1 kiểm tra cú pháp; ls /etc/rsyslog.d/ xem thứ tự file; cat /etc/rsyslog.d/90-forward.conf.',
      code: '# /etc/rsyslog.d/90-forward.conf (client)\n*.* action(type="omfwd"\n           target="192.168.122.171"\n           port="514"\n           protocol="tcp"\n           action.resumeRetryCount="100"\n           queue.type="linkedList"\n           queue.size="10000")',
    },
    {
      step: 3,
      what: 'Transport TCP 514 client → server',
      why: 'omfwd mở kết nối TCP tới server:514, đóng khung message theo octet-counting (RFC 6587). TCP cho ACK tầng giao vận nên client biết server đã nhận; UDP thì không. Kết nối giữ mở để stream message liên tục.',
      whyBreaks: 'Server chưa nghe 514 hoặc firewall chặn → kết nối không ESTAB, message dồn queue; queue đầy thì drop.',
      observeWith: 'Trên client: ss -tnp | grep :514 phải thấy ESTAB tới 192.168.122.171:514. Trên server: ss -lntup | grep :514 thấy LISTEN.',
      code: '# Client: kiểm tra kết nối ra server\nss -tnp | grep \':514\'\n# ESTAB 192.168.122.172:xxxxx 192.168.122.171:514 users:(("rsyslogd",...))',
    },
    {
      step: 4,
      what: 'Server imtcp nhận → parse property',
      why: 'Input module imtcp trên server nhận stream, parse message thành các property: fromhost-ip, hostname, programname, msg, timereported. Các property này dùng để route và sinh tên file. Không parse được thì không tách nguồn được.',
      whyBreaks: 'Message không đúng format syslog (app ghi raw) → property hostname/programname rỗng, file đích sai tên.',
      observeWith: 'Trên server: ss -lntup | grep :514 (đang LISTEN udp+tcp). journalctl -u rsyslog -f xem rsyslog xử lý.',
      code: '# /etc/rsyslog.d/10-remote-server.conf (server)\nmodule(load="imudp")\ninput(type="imudp" port="514")\nmodule(load="imtcp")\ninput(type="imtcp" port="514")',
    },
    {
      step: 5,
      what: 'Template dynafile → ghi /var/log/remote/<host>/<prog>.log',
      why: 'Rule if ($fromhost-ip != "127.0.0.1") then action omfile dynaFile RemoteHostFile ghi message remote ra cây thư mục theo host/program, rồi stop để không trộn vào /var/log/syslog cục bộ của server. Đây là bước "tách nguồn" cốt lõi.',
      whyBreaks: 'rsyslog drop xuống user syslog; nếu /var/log/remote thuộc root mode 755 → syslog không tạo subdir được → "Could not open dynamic file … discarding message" (lỗi 2207).',
      observeWith: 'Trên server: find /var/log/remote -type f -ls; journalctl -u rsyslog | grep -i "could not open" khi có lỗi.',
      code: '# Server: template + ghi theo host\ntemplate(name="RemoteHostFile" type="string"\n         string="/var/log/remote/%HOSTNAME%/%PROGRAMNAME%.log")\nif ($fromhost-ip != "127.0.0.1") then {\n    action(type="omfile" dynaFile="RemoteHostFile"\n           fileCreateMode="0640" dirCreateMode="0755")\n    stop\n}',
      failModes: [
        { symptom: 'TCP ESTAB nhưng /var/log/remote rỗng, không có file nào', evidence: "rsyslogd[*]: omfile: creating parent directories for file '/var/log/remote/dattqh-client/CRON.log' failed: Permission denied [try https://www.rsyslog.com/e/2207]" },
      ],
      fixSteps: [
        { step: 'Cấp quyền thư mục cho user mà rsyslog drop xuống (syslog)', command: 'sudo chown syslog:syslog /var/log/remote && sudo systemctl restart rsyslog' },
      ],
    },
    {
      step: 6,
      what: 'Verify end-to-end bằng logger',
      why: 'Gửi message mốc từ client bằng logger, rồi grep trên server. Đây là cách xác nhận toàn tuyến (sinh log → forward → nhận → ghi đúng file) hoạt động, thay vì chờ event tự nhiên.',
      whyBreaks: 'Nếu grep không thấy: kiểm tra theo thứ tự kết nối TCP → quyền thư mục → selector rule, mỗi cái là một failure mode khác.',
      observeWith: 'Client: logger -p user.notice "MARKER $(date +%s)". Server: grep -r MARKER /var/log/remote.',
      code: '# Client\nlogger -p user.notice "LAB-SYSLOG-OK $(hostname) $(date +%H:%M:%S)"\n\n# Server (sau ~1-2s)\nsudo grep -rh "LAB-SYSLOG-OK" /var/log/remote\n# 2026-06-02T13:45:26+00:00 dattqh-client dattqh-client: LAB-SYSLOG-OK ...',
    },
  ],

  quiz: [
    {
      q: 'PRI value trong syslog message (RFC 5424) được tính thế nào?',
      options: [
        'severity × 8 + facility',
        'facility × 8 + severity',
        'facility + severity',
        'Một số ngẫu nhiên do daemon gán',
      ],
      correct: 1,
      whyCorrect: '<a href="https://datatracker.ietf.org/doc/html/rfc5424#section-6.2.1">RFC 5424 §6.2.1</a>: PRI = facility × 8 + severity. Vd facility=4 (auth), severity=4 (warning) → PRI = 36.',
      whyOthersWrong: {
        '0': 'Đảo vị trí — nhân severity sẽ cho giá trị sai, facility mới là phần "cao".',
        '2': 'Phép cộng đơn thuần không tách được facility/severity khi decode.',
        '3': 'PRI là giá trị xác định theo công thức, không ngẫu nhiên.',
      },
    },
    {
      q: 'Vì sao chọn TCP thay vì UDP khi forward log lên server tập trung?',
      options: [
        'TCP nhanh hơn UDP',
        'UDP không mở được cổng 514',
        'TCP (RFC 6587) có kết nối + ACK, kết hợp queue giúp không mất log khi server tạm down',
        'Chỉ TCP mới mang được facility/severity',
      ],
      correct: 2,
      whyCorrect: 'UDP 514 (<a href="https://datatracker.ietf.org/doc/html/rfc5426">RFC 5426</a>) là best-effort, mất gói im lặng. TCP (<a href="https://datatracker.ietf.org/doc/html/rfc6587">RFC 6587</a>) + <code>queue</code> + <code>resumeRetryCount</code> giữ và gửi lại message.',
      whyOthersWrong: {
        '0': 'UDP thường nhanh hơn do không bắt tay; tốc độ không phải lý do chọn TCP ở đây.',
        '1': 'UDP 514 mở được bình thường (imudp) — đó là transport syslog cổ điển.',
        '3': 'Cả TCP lẫn UDP đều mang nguyên PRI (facility/severity) trong message.',
      },
    },
    {
      q: 'Trên server, message từ client không xuất hiện dù ss thấy TCP ESTAB. journal báo "Could not open dynamic file … Permission denied". Nguyên nhân?',
      options: [
        'Client gửi sai port',
        'Thư mục đích không cho user mà rsyslog drop privilege (syslog) ghi/tạo subdir',
        'Firewall server chặn 514',
        'Selector *.* trên client sai',
      ],
      correct: 1,
      whyCorrect: 'rsyslog drop xuống user <code>syslog</code> (<code>$PrivDropToUser</code>). Nếu /var/log/remote thuộc root mode 755, syslog không tạo subdir → discard. Fix: <code>chown syslog:syslog /var/log/remote</code>.',
      whyOthersWrong: {
        '0': 'Sai port thì không có ESTAB; đề bài đã thấy ESTAB.',
        '2': 'Firewall chặn thì cũng không ESTAB được.',
        '3': 'Selector sai làm client không gửi; nhưng ở đây server đã nhận (có log lỗi ghi file) → message đã tới.',
      },
    },
    {
      q: 'Cấu hình nào trên server làm log mỗi host được ghi vào file riêng theo program?',
      options: [
        'Chỉ cần load imtcp là đủ',
        'template dynafile dùng %HOSTNAME%/%PROGRAMNAME% + action omfile dynaFile',
        'Đặt swappiness=0',
        'Dùng UDP thay TCP',
      ],
      correct: 1,
      whyCorrect: '<a href="https://www.rsyslog.com/doc/configuration/templates.html">Template</a> sinh đường dẫn động từ property, <code>action(type="omfile" dynaFile=…)</code> ghi theo đường dẫn đó. Không có template → gộp chung /var/log/syslog.',
      whyOthersWrong: {
        '0': 'imtcp chỉ giúp nhận; không quyết định cách ghi/tách file.',
        '2': 'swappiness thuộc quản lý bộ nhớ, không liên quan syslog.',
        '3': 'Transport không ảnh hưởng cách ghi file đích.',
      },
    },
    {
      q: 'Lệnh nào tạo một message thử với facility=auth, severity=warning để kiểm tra đường log?',
      options: [
        'logger -p auth.warning "test"',
        'echo "test" > /var/log/auth.log',
        'systemctl restart rsyslog',
        'journalctl -p warning',
      ],
      correct: 0,
      whyCorrect: '<a href="https://man7.org/linux/man-pages/man1/logger.1.html">logger(1)</a> với <code>-p auth.warning</code> đặt đúng facility.severity rồi ghi qua /dev/log; rsyslog áp rule (kể cả forward).',
      whyOthersWrong: {
        '1': 'Ghi thẳng file bỏ qua rsyslog pipeline → không kiểm tra được forward.',
        '2': 'Restart không sinh message ứng dụng.',
        '3': 'journalctl chỉ đọc log đã có, không tạo message mới.',
      },
    },
  ],

  flashcards: [
    { front: 'PRI = ? (RFC 5424)', back: 'facility × 8 + severity', why: 'Decode PRI khi đọc raw syslog; biết facility/severity để viết selector lọc đúng.' },
    { front: 'Module input mở cổng 514 trên server?', back: 'imtcp (TCP) và imudp (UDP) — load + input(port="514")', why: 'Thiếu input module thì server không nghe, client connection refused.' },
    { front: 'Module forward log ra mạng phía client?', back: 'omfwd — action(type="omfwd" target= port= protocol="tcp")', why: 'Đây là "đường ra"; không khai báo thì log chỉ nằm cục bộ.' },
    { front: 'Vì sao thêm queue + resumeRetryCount cho omfwd?', back: 'Giữ message khi server tạm down và gửi lại; tránh mất log', why: 'Đánh đổi RAM lấy độ tin cậy — khác biệt mất/không mất log khi server reboot.' },
    { front: 'Lỗi 2207 "Could not open dynamic file … Permission denied" do đâu?', back: 'Thư mục đích không cho user syslog (rsyslog drop privilege) tạo subdir', why: 'Fix bằng chown syslog:syslog; là FAIL/FIX hay gặp khi dựng dynafile.' },
    { front: 'Property nào tách log theo nguồn trong template?', back: '%HOSTNAME% và %PROGRAMNAME% (+ %fromhost-ip% để lọc remote)', why: 'Sinh cây /var/log/remote/<host>/<prog>.log để truy vết theo máy.' },
    { front: 'Kiểm tra cú pháp rsyslog trước khi restart?', back: 'rsyslogd -N1', why: 'Bắt lỗi config trước, tránh restart làm rsyslog không lên (mất log mới).' },
    { front: 'logger dùng để làm gì khi test syslog?', back: 'Sinh message thử với -p facility.severity qua /dev/log', why: 'Kiểm tra toàn tuyến forward end-to-end không cần chờ event thật.' },
  ],

  tryAtHome: [
    {
      phaseType: 'core',
      title: 'Phase 1 — Cấu hình rsyslog SERVER nhận log (171)',
      vmTarget: 'server',
      estimatedMinutes: 12,
      why: 'P1: Server cần load input module và mở cổng 514 trước (<a href="https://www.rsyslog.com/doc/configuration/modules/imtcp.html">imtcp</a>/<a href="https://www.rsyslog.com/doc/configuration/modules/imudp.html">imudp</a>). P2: Thêm template dynafile + rule ghi message remote theo host/program; <code>rsyslogd -N1</code> validate trước khi restart. P3: Sau bước này <code>ss -lntup | grep :514</code> phải thấy LISTEN cả UDP lẫn TCP — gate bắt buộc trước khi client kết nối.',
      cmd: '# Trên dattqh-nat (192.168.122.171)\nsudo tee /etc/rsyslog.d/10-remote-server.conf >/dev/null <<\'EOF\'\nmodule(load="imudp")\ninput(type="imudp" port="514")\nmodule(load="imtcp")\ninput(type="imtcp" port="514")\ntemplate(name="RemoteHostFile" type="string"\n         string="/var/log/remote/%HOSTNAME%/%PROGRAMNAME%.log")\nif ($fromhost-ip != "127.0.0.1") then {\n    action(type="omfile" dynaFile="RemoteHostFile"\n           fileCreateMode="0640" dirCreateMode="0755")\n    stop\n}\nEOF\nsudo mkdir -p /var/log/remote\nsudo rsyslogd -N1\nsudo systemctl restart rsyslog\nsudo ss -lntup | grep \':514\'',
      observeWith: '<code>rsyslogd -N1</code> in "version 8.2312.0 … End of config validation run. Bye." không error. <code>ss -lntup | grep :514</code> thấy rsyslogd LISTEN <code>0.0.0.0:514</code> + <code>[::]:514</code> cho cả UDP và TCP.',
      steps: [
        { n: 1, do: 'Tạo <code>/etc/rsyslog.d/10-remote-server.conf</code> với imudp+imtcp port 514 và template dynafile (nội dung như khối lệnh trên).', expect: '<code>cat /etc/rsyslog.d/10-remote-server.conf</code> hiển thị đúng nội dung; <code>sudo mkdir -p /var/log/remote</code> tạo thư mục đích.' },
        { n: 2, do: 'Validate: <code>sudo rsyslogd -N1</code>.', expect: '<code>rsyslogd: version 8.2312.0, config validation run (level 1) …</code> rồi <code>End of config validation run. Bye.</code> — KHÔNG có dòng "error".' },
        { n: 3, do: 'Restart + kiểm cổng: <code>sudo systemctl restart rsyslog</code> rồi <code>sudo ss -lntup | grep \':514\'</code>.', expect: '4 dòng: <code>udp 0.0.0.0:514</code>, <code>udp [::]:514</code>, <code>tcp LISTEN 0.0.0.0:514</code>, <code>tcp LISTEN [::]:514</code> — đều thuộc process rsyslogd.' },
      ],
      troubleshooting: [
        { symptom: '<code>ss</code> không thấy :514 sau restart.', fix: 'Xem <code>sudo journalctl -u rsyslog -n 20</code>. Thường do cú pháp module sai — chạy lại <code>rsyslogd -N1</code> đọc dòng error. Đảm bảo <code>module(load="imtcp")</code> đứng trước <code>input(type="imtcp")</code>.' },
        { symptom: 'rsyslog active nhưng chỉ thấy UDP 514, thiếu TCP.', fix: 'Thiếu khối <code>module(load="imtcp") input(type="imtcp" port="514")</code>. Bổ sung, validate, restart.' },
      ],
    },
    {
      phaseType: 'core',
      title: 'Phase 2 — Cấu hình rsyslog CLIENT forward (172)',
      vmTarget: 'client1',
      estimatedMinutes: 10,
      why: 'P1: Client cần một action <a href="https://www.rsyslog.com/doc/configuration/modules/omfwd.html">omfwd</a> trỏ server:514. P2: Chọn <code>protocol="tcp"</code> + <code>queue.type="linkedList"</code> + <code>action.resumeRetryCount="100"</code> để không mất log khi server tạm down. P3: Sau restart, <code>ss -tnp | grep :514</code> phải thấy kết nối ESTAB ra 192.168.122.171 — chứng minh đường ra đã mở.',
      cmd: '# Trên dattqh-client (192.168.122.172)\nsudo tee /etc/rsyslog.d/90-forward.conf >/dev/null <<\'EOF\'\n*.* action(type="omfwd"\n           target="192.168.122.171"\n           port="514"\n           protocol="tcp"\n           action.resumeRetryCount="100"\n           queue.type="linkedList"\n           queue.size="10000")\nEOF\nsudo rsyslogd -N1\nsudo systemctl restart rsyslog\nss -tnp | grep \':514\'\nlogger -p user.notice "LAB-SYSLOG-OK $(hostname) $(date +%H:%M:%S)"',
      observeWith: '<code>ss -tnp | grep :514</code> thấy <code>ESTAB 192.168.122.172:&lt;port&gt; 192.168.122.171:514 users:(("rsyslogd",...))</code>. Sau <code>logger</code>, message đi qua kết nối này tới server.',
      steps: [
        { n: 1, do: 'Tạo <code>/etc/rsyslog.d/90-forward.conf</code> với action omfwd TCP tới 192.168.122.171:514 + queue (nội dung như trên). Tên 90-* để chạy sau rule mặc định.', expect: '<code>cat /etc/rsyslog.d/90-forward.conf</code> đúng nội dung; <code>sudo rsyslogd -N1</code> báo "End of config validation run. Bye." không error.' },
        { n: 2, do: 'Restart: <code>sudo systemctl restart rsyslog</code> rồi <code>ss -tnp | grep \':514\'</code>.', expect: 'Một dòng <code>ESTAB</code> từ IP client <code>192.168.122.172</code> tới <code>192.168.122.171:514</code>, owner rsyslogd. Nếu thấy <code>SYN-SENT</code> kéo dài → server chưa nghe (quay lại Phase 1).' },
        { n: 3, do: 'Gửi message mốc: <code>logger -p user.notice "LAB-SYSLOG-OK $(hostname) $(date +%H:%M:%S)"</code>.', expect: 'Lệnh trả về ngay (không lỗi). Message đã được đẩy vào pipeline rsyslog và forward qua kết nối TCP ở bước 2.' },
      ],
      troubleshooting: [
        { symptom: 'Kết nối kẹt <code>SYN-SENT</code>, không ESTAB.', fix: 'Server chưa LISTEN 514 hoặc không thông L3. Trên client: <code>ping -c1 192.168.122.171</code>. Trên server: <code>sudo ss -lntup | grep :514</code>. Cả 2 VM ufw mặc định inactive; nếu bật thì mở <code>514/tcp</code>.' },
        { symptom: '<code>rsyslogd -N1</code> báo lỗi tham số omfwd.', fix: 'Kiểm tra dấu ngoặc/đóng action; các tham số queue dùng dạng <code>queue.type="linkedList"</code> (đúng cú pháp RainerScript object).' },
      ],
    },
    {
      phaseType: 'core',
      title: 'Phase 3 — FAIL/FIX: bắt lỗi quyền + xác minh nhận log',
      vmTarget: 'server',
      estimatedMinutes: 13,
      why: 'P1: rsyslog drop privilege xuống user <code>syslog</code> (<code>$PrivDropToUser syslog</code> trong /etc/rsyslog.conf). P2: Nếu <code>/var/log/remote</code> do root tạo (mode 755), user syslog không tạo được subdir → message bị discard kèm lỗi 2207. P3: Đây là failure mode điển hình của dynafile; biết đọc journal để chẩn đoán nhanh là kỹ năng chính của phase này.',
      cmd: '# Trên server 171 — chẩn đoán khi /var/log/remote rỗng\nsudo journalctl -u rsyslog -n 20 --no-pager | grep -i "could not open"\nsudo ls -ld /var/log/remote\n\n# FIX: cấp quyền cho user rsyslog drop xuống\nsudo chown syslog:syslog /var/log/remote\nsudo systemctl restart rsyslog\n\n# Verify: sau khi client gửi lại, xem cây file\nsudo find /var/log/remote -type f -ls\nsudo grep -rh "LAB-SYSLOG-OK" /var/log/remote',
      observeWith: '<code>journalctl -u rsyslog</code> trước fix có dòng <code>omfile: creating parent directories … Permission denied [try https://www.rsyslog.com/e/2207]</code>. Sau <code>chown</code> + client gửi lại: <code>find /var/log/remote -type f</code> liệt kê <code>dattqh-client/sshd.log</code>, <code>systemd.log</code>, … owner <code>syslog:syslog</code> mode 0640.',
      analysis: {
        observation: 'TCP ESTAB hai chiều (server thấy peer 192.168.122.172, client thấy ESTAB tới .171:514) nhưng <code>/var/log/remote</code> vẫn rỗng; journal server lặp lại lỗi "Could not open dynamic file … Permission denied".',
        mechanism: 'Message ĐÃ tới tầng action của server (nên mới có log lỗi ghi file) — vấn đề không phải mạng/transport mà ở quyền filesystem. rsyslog chạy as root lúc khởi tạo rồi drop xuống <code>syslog:syslog</code>; thư mục đích thuộc <code>root:root</code> mode 755 nên user syslog không <code>mkdir</code> subdir <code>dattqh-client/</code> được, omfile trả state -3000 và discard.',
        lesson: 'Khi "kết nối có mà log không có", phân biệt 3 tầng theo thứ tự: (1) transport — <code>ss</code> ESTAB chưa? (2) nhận/parse — server có log lỗi ghi không? (3) ghi đích — quyền thư mục cho user rsyslog drop xuống. Lỗi 2207 chỉ thẳng tầng (3). Fix là <code>chown</code> cho đúng user, không phải mở thêm firewall.',
      },
      steps: [
        { n: 1, do: 'Trên server, sau khi client (Phase 2) đã gửi log nhưng <code>sudo find /var/log/remote -type f</code> không ra file: đọc journal <code>sudo journalctl -u rsyslog -n 20 --no-pager | grep -i "could not open"</code>.', expect: 'Thấy <code>omfile: creating parent directories for file \'/var/log/remote/dattqh-client/…\' failed: Permission denied</code> và <code>Could not open dynamic file … discarding message</code>.' },
        { n: 2, do: 'Xác nhận quyền: <code>sudo ls -ld /var/log/remote</code>.', expect: '<code>drwxr-xr-x 2 root root … /var/log/remote</code> — thuộc root, user syslog không ghi được.' },
        { n: 3, do: 'FIX: <code>sudo chown syslog:syslog /var/log/remote && sudo systemctl restart rsyslog</code>.', expect: '<code>ls -ld /var/log/remote</code> giờ là <code>drwxr-xr-x 2 syslog syslog</code>.' },
        { n: 4, do: 'Trên client gửi lại: <code>logger -p user.notice "LAB-SYSLOG-OK retry"</code>. Trên server: <code>sudo find /var/log/remote -type f -ls</code> và <code>sudo grep -rh LAB-SYSLOG-OK /var/log/remote</code>.', expect: 'Cây file xuất hiện: <code>/var/log/remote/dattqh-client/{sshd,systemd,rsyslogd,...}.log</code> (owner syslog:syslog, 0640). grep trả: <code>2026-…T…+00:00 dattqh-client dattqh-client: LAB-SYSLOG-OK retry</code>.' },
      ],
      troubleshooting: [
        { symptom: 'Sau chown vẫn không có file mới.', fix: 'Client có thể chưa gửi lại message mới (file chỉ tạo khi có message). Trigger <code>logger</code> trên client; hoặc chờ event định kỳ (CRON). Kiểm tra lại journal server không còn lỗi 2207.' },
        { symptom: 'File tạo được nhưng đọc bị từ chối.', fix: 'fileCreateMode 0640 → đọc cần là owner syslog hoặc group syslog/dùng sudo. Dùng <code>sudo tail</code> hoặc thêm user vào group phù hợp.' },
      ],
    },
    {
      phaseType: 'optional',
      title: 'Phase 4 (tuỳ chọn) — Kiểm chứng queue chống mất log khi server down',
      vmTarget: 'client1',
      estimatedMinutes: 10,
      why: 'P1: <a href="https://www.rsyslog.com/doc/concepts/queues.html">Queue</a> + <code>resumeRetryCount</code> giữ message khi action forward fail. P2: Dừng rsyslog server, gửi vài message ở client → chúng nằm trong linkedList queue (RAM) thay vì mất; bật lại server, message được resend. P3: Chứng minh trực tiếp khác biệt TCP+queue so với UDP best-effort.',
      cmd: '# 1) Trên SERVER: dừng nhận\nsudo systemctl stop rsyslog\n\n# 2) Trên CLIENT: gửi mốc trong lúc server down\nfor i in 1 2 3; do logger -p user.notice "QUEUE-TEST $i $(date +%s)"; done\nss -tnp | grep \':514\'   # không còn ESTAB (server down)\n\n# 3) Trên SERVER: bật lại\nsudo systemctl start rsyslog\nsleep 3\n\n# 4) Trên SERVER: kiểm message đã resend\nsudo grep -rh "QUEUE-TEST" /var/log/remote',
      observeWith: 'Lúc server down, client <code>ss -tnp | grep :514</code> không còn ESTAB (hoặc SYN-SENT). Sau khi server lên lại ~vài giây, <code>grep QUEUE-TEST</code> trên server trả đủ cả 3 message — không mất, dù gửi lúc server offline.',
      steps: [
        { n: 1, do: 'Trên <strong>server</strong> (171): <code>sudo systemctl stop rsyslog</code> để mô phỏng server nhận log tạm down.', expect: '<code>systemctl is-active rsyslog</code> → <code>inactive</code>; cổng 514 không còn LISTEN.' },
        { n: 2, do: 'Trên <strong>client</strong> (172) trong lúc server down: <code>for i in 1 2 3; do logger -p user.notice "QUEUE-TEST $i $(date +%s)"; done</code> rồi <code>ss -tnp | grep \':514\'</code>.', expect: 'logger trả về ngay (không block). <code>ss</code> không còn dòng ESTAB tới .171:514 (server down) — 3 message nằm trong linkedList queue ở RAM client.' },
        { n: 3, do: 'Trên <strong>server</strong>: <code>sudo systemctl start rsyslog</code>, chờ ~3s, rồi <code>sudo grep -rh "QUEUE-TEST" /var/log/remote</code>.', expect: 'Cả 3 dòng QUEUE-TEST xuất hiện trên server — message gửi lúc server offline vẫn được client resend khi kết nối phục hồi (queue + resumeRetryCount).' },
      ],
      analysis: {
        observation: 'Ba message QUEUE-TEST gửi trong lúc server tắt vẫn xuất hiện trên server sau khi bật lại.',
        mechanism: 'omfwd fail khi server down → action vào trạng thái suspended; message tích trong linkedList queue (tối đa queue.size=10000) ở RAM client. resumeRetryCount=100 cho phép thử kết nối lại nhiều lần; khi server LISTEN lại, queue flush toàn bộ qua kết nối TCP mới.',
        lesson: 'Độ bền log không đến từ "gửi đi là xong" mà từ queue + retry phía client. Đánh đổi: queue RAM mất khi client reboot — production cần disk-assisted queue nếu không được phép mất log qua reboot.',
      },
      troubleshooting: [
        { symptom: 'Message mất sau khi server lên lại.', fix: 'Queue có thể đã đầy (server down quá lâu, vượt queue.size) hoặc client bị restart (queue RAM mất). Tăng queue.size hoặc chuyển disk-assisted queue; tránh restart client trong lúc test.' },
      ],
    },
  ],
}
