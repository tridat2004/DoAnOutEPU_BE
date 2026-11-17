# Tổng hợp nghiệp vụ: Hệ thống quản lý dự án nội bộ (Trello/Jira lite)

> Đồ án tốt nghiệp, triển khai thực tế cho một công ty (single-tenant, không có tầng Workspace).

## 1. Tổng quan

- **Mục tiêu**: quản lý dự án và công việc nội bộ bằng board kiểu Kanban.
- **Phạm vi**: một công ty duy nhất, tài khoản do Admin cấp, không đăng ký công khai.
- **Cấu trúc dữ liệu**:

```
Hệ thống (1 công ty)
 └── Project
      └── Board → Column → Task
                          ├── Comment
                          ├── Attachment
                          ├── Checklist / Subtask
                          └── Activity log
```

## 2. Phân quyền (RBAC)

### 2.1 Role cấp hệ thống

| Role | Mô tả |
|------|-------|
| `ADMIN` | Quản lý user, xem toàn bộ project, xem thống kê toàn hệ thống |
| `USER` | Nhân viên bình thường, chỉ thấy project mình tham gia |

### 2.2 Role cấp project

Một user có thể có role khác nhau ở các project khác nhau. Lưu ở bảng `project_members(user_id, project_id, role)`.

| Role | Mô tả |
|------|-------|
| `MANAGER` | Quản lý project, thành viên, cột board |
| `MEMBER` | Tạo/sửa task, comment, kéo thả |
| `VIEWER` | Chỉ xem (tùy chọn, có thể bỏ) |

### 2.3 Ma trận quyền

| Hành động | Admin hệ thống | Manager | Member | Viewer |
|-----------|:---:|:---:|:---:|:---:|
| Tạo / khóa tài khoản user | ✅ | ❌ | ❌ | ❌ |
| Xem tất cả project | ✅ | ❌ | ❌ | ❌ |
| Tạo project | ✅ | ✅ | ✅ (tùy chính sách) | ❌ |
| Sửa / archive / xóa project | ✅ | ✅ | ❌ | ❌ |
| Thêm / xóa member, đổi role project | ✅ | ✅ | ❌ | ❌ |
| Tạo / sửa / xóa cột board | ✅ | ✅ | ❌ | ❌ |
| Tạo / sửa task, kéo thả | ✅ | ✅ | ✅ | ❌ |
| Xóa task | ✅ | ✅ | Chỉ task mình tạo | ❌ |
| Comment | ✅ | ✅ | ✅ | ❌ |
| Xem board, task | ✅ | ✅ | ✅ | ✅ |

> **Lưu ý**: luôn kiểm tra quyền ở **backend**. Ẩn nút ở frontend chỉ là hỗ trợ UX, không phải bảo mật.

## 3. Các module nghiệp vụ

### 3.1 Xác thực & tài khoản
- Đăng nhập / đăng xuất
- Không cho tự đăng ký; Admin tạo tài khoản hoặc gửi lời mời qua email
- Đổi mật khẩu, quên mật khẩu (reset qua email)
- Profile: tên, avatar, email, phòng ban
- (Tùy chọn) SSO qua Google Workspace / Microsoft 365

### 3.2 Quản lý project
- Tạo, sửa, archive, xóa mềm project
- Thông tin: tên, mô tả, ngày bắt đầu/kết thúc, trạng thái
- Thêm / xóa thành viên, gán role project
- Rời project (không được nếu là Manager cuối cùng)

### 3.3 Board & Column
- Mỗi project có một hoặc nhiều board
- Cột mặc định: `To Do` / `In Progress` / `Done`
- Thêm, đổi tên, sắp xếp lại, xóa cột (cột còn task phải chuyển task đi trước)
- (Tùy chọn) Giới hạn WIP theo cột

### 3.4 Task (card)

| Trường | Ghi chú |
|--------|---------|
| Title | Bắt buộc |
| Description | Hỗ trợ rich text hoặc markdown |
| Assignee | Một hoặc nhiều người, phải là member của project |
| Reporter | Người tạo task |
| Due date / Start date | Có cảnh báo sắp hạn / quá hạn |
| Priority | Low / Medium / High / Urgent |
| Label / Tag | Tùy chỉnh theo project, có màu |
| Trạng thái | Chính là cột chứa task |
| Checklist / Subtask | Tùy chọn |
| Attachment | Giới hạn dung lượng và loại file |

Chức năng đi kèm:
- Kéo thả task giữa các cột và sắp xếp thứ tự trong cột
- Comment, @mention đồng nghiệp
- Lịch sử thay đổi của từng task

### 3.5 Tìm kiếm & lọc
- Tìm theo tiêu đề, mô tả
- Lọc theo assignee, label, priority, due date, trạng thái
- Bộ lọc nhanh: "Task của tôi", "Sắp đến hạn", "Quá hạn"

### 3.6 Notification
Gửi khi:
- Được assign task
- Có comment mới hoặc bị @mention
- Task sắp đến hạn / quá hạn
- Task mình theo dõi bị đổi trạng thái
- Được thêm vào project

Kênh: in-app (bắt buộc), email (nên có). Cho phép user bật/tắt từng loại.

### 3.7 Activity log
- Ghi lại: ai, làm gì, trên đối tượng nào, lúc nào, giá trị cũ → mới
- Xem theo task và theo project
- Admin xem được log toàn hệ thống

### 3.8 Dashboard & thống kê
- Số task theo trạng thái, theo người, theo priority
- Task quá hạn
- Tiến độ project (% task hoàn thành)
- Admin: thống kê toàn công ty, có thể lọc theo phòng ban

### 3.9 Trang Admin (route `/admin/*` trong cùng web)
- Quản lý user: tạo, sửa, khóa/mở khóa, reset mật khẩu, gán role hệ thống
- Quản lý phòng ban/team (tùy chọn)
- Xem toàn bộ project, có thể vào xem hoặc archive
- Thống kê tổng quan
- Xem log hệ thống

Không cần tách app hay domain riêng, chỉ cần chặn bằng `role === ADMIN` ở backend.

## 4. Quy tắc nghiệp vụ quan trọng

1. Task chỉ được assign cho user đang là member của project đó.
2. Project luôn phải có ít nhất một Manager.
3. Xóa user = khóa tài khoản, không xóa cứng; dữ liệu và log cũ vẫn giữ nguyên.
4. Xóa project/task dùng **soft delete**, có thể khôi phục.
5. User không truy cập được project mình không tham gia (trừ Admin).
6. Cột bị xóa phải xử lý task bên trong trước (chuyển sang cột khác).
7. Mọi thay đổi quan trọng đều ghi vào activity log.

## 5. Yêu cầu phi chức năng

- **Bảo mật**: hash mật khẩu (bcrypt/argon2), JWT + refresh token, chống brute-force đăng nhập, validate input, giới hạn upload file
- **Hiệu năng**: phân trang danh sách, index các cột hay query
- **Realtime**: cập nhật board qua WebSocket (điểm cộng khi demo)
- **Vận hành**: Docker, deploy lên server công ty hoặc VPS, backup DB định kỳ
- **Chất lượng**: tài liệu API (Swagger), test cơ bản, log lỗi
- **Giao diện**: responsive, dùng được trên điện thoại

## 6. Ngoài phạm vi (để sau)

Sprint, backlog, epic, burndown chart, custom workflow, time tracking, tích hợp bên thứ ba (GitHub, Slack...), multi-tenant.

## 7. Lộ trình đề xuất

| Giai đoạn | Nội dung |
|-----------|----------|
| 1 | Auth, quản lý user, role hệ thống |
| 2 | Project, member, role project |
| 3 | Board, column, task, kéo thả |
| 4 | Comment, assignee, label, due date, tìm kiếm, lọc |
| 5 | Notification (in-app + email), activity log |
| 6 | Dashboard, trang admin |
| 7 | Realtime, deploy, dùng thử với nhân viên thật, viết tài liệu |

## 8. Các bảng dữ liệu chính (gợi ý)

`users`, `departments`, `projects`, `project_members`, `boards`, `columns`, `tasks`, `task_assignees`, `labels`, `task_labels`, `comments`, `attachments`, `checklists`, `notifications`, `activity_logs`
