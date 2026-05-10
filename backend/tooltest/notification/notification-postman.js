// PM-MN-001 : GET /notifications — Lấy danh sách thông báo thành công
pm.test('Status 200 khi lấy danh sách thông báo thành công', function () {
    pm.response.to.have.status(200);
});

pm.test('Response đúng format: success=true, data.notifications là mảng, có total/page/limit', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Notifications retrieved successfully');
    pm.expect(json.data).to.have.property('notifications');
    pm.expect(json.data.notifications).to.be.an('array');
    pm.expect(json.data).to.have.property('total');
    pm.expect(json.data).to.have.property('page');
    pm.expect(json.data).to.have.property('limit');
});

// PM-MN-002 : GET /notifications — Danh sách thông báo rỗng
pm.test('Status 200 khi danh sách thông báo rỗng', function () {
    pm.response.to.have.status(200);
});

pm.test('Response trả notifications là mảng rỗng', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.data.notifications).to.be.an('array');
    pm.expect(json.data.notifications.length).to.equal(0);
});

// PM-MN-003 : GET /notifications — Query không hợp lệ
pm.test('Status 400 khi query phân trang không hợp lệ', function () {
    pm.response.to.have.status(400);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-MN-004 : GET /notifications/unread-count — Lấy số lượng chưa đọc thành công
pm.test('Status 200 khi lấy unread count thành công', function () {
    pm.response.to.have.status(200);
});

pm.test('Response đúng format: success=true và data.unread là số', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Unread notification count retrieved successfully');
    pm.expect(json.data).to.have.property('unread');
    pm.expect(json.data.unread).to.be.a('number');
});

// PM-MN-005 : GET /notifications/unread-count — Không có thông báo chưa đọc
pm.test('Status 200 khi unread count bằng 0', function () {
    pm.response.to.have.status(200);
});

pm.test('data.unread bằng 0', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.data.unread).to.equal(0);
});

// PM-MN-006 : GET /notifications/unread-count — Không có JWT token
pm.test('Status 401 khi gọi unread-count không có JWT', function () {
    pm.response.to.have.status(401);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-MN-007 : GET /notifications/:id — Lấy chi tiết thông báo thành công
pm.test('Status 200 khi lấy chi tiết thông báo thành công', function () {
    pm.response.to.have.status(200);
});

pm.test('Response đúng format: success=true, data.notification tồn tại', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Notification retrieved successfully');
    pm.expect(json.data).to.have.property('notification');
    pm.expect(json.data.notification).to.have.property('id');
});

// PM-MN-008 : GET /notifications/:id — Không tìm thấy thông báo
pm.test('Status 404 khi không tìm thấy thông báo', function () {
    pm.response.to.have.status(404);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-MN-009 : GET /notifications/:id — ID thông báo sai định dạng
pm.test('Status 400 khi ID thông báo sai định dạng', function () {
    pm.response.to.have.status(400);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-MN-010 : PATCH /notifications/:id/read — Đánh dấu đã đọc thành công
pm.test('Status 200 khi đánh dấu thông báo đã đọc thành công', function () {
    pm.response.to.have.status(200);
});

pm.test('Response đúng format: success=true, data.notification.isRead=true', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Notification marked as read');
    pm.expect(json.data).to.have.property('notification');
    pm.expect(json.data.notification).to.have.property('isRead');
    pm.expect(json.data.notification.isRead).to.be.true;
});

// PM-MN-011 : PATCH /notifications/:id/read — Đánh dấu thông báo không tồn tại
pm.test('Status 404 khi đánh dấu thông báo không tồn tại', function () {
    pm.response.to.have.status(404);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-MN-012 : PATCH /notifications/:id/read — Đánh dấu lại thông báo đã đọc
pm.test('Status 200 khi đánh dấu lại thông báo đã đọc', function () {
    pm.response.to.have.status(200);
});

pm.test('Response trả về notification hợp lệ với isRead=true', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.data).to.have.property('notification');
    pm.expect(json.data.notification).to.have.property('isRead');
    pm.expect(json.data.notification.isRead).to.be.true;
});

// PM-MN-013 : PATCH /notifications/mark-all-read — Đánh dấu toàn bộ đã đọc thành công
pm.test('Status 200 khi đánh dấu tất cả thông báo đã đọc thành công', function () {
    pm.response.to.have.status(200);
});

pm.test('Response đúng format: success=true, data.updated là số', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('All notifications marked as read');
    pm.expect(json.data).to.have.property('updated');
    pm.expect(json.data.updated).to.be.a('number');
});

// PM-MN-014 : PATCH /notifications/mark-all-read — Không có thông báo nào cần cập nhật
pm.test('Status 200 khi không có thông báo nào cần đánh dấu đã đọc', function () {
    pm.response.to.have.status(200);
});

pm.test('data.updated bằng 0', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.data.updated).to.equal(0);
});

// PM-MN-015 : PATCH /notifications/mark-all-read — Lỗi hệ thống khi cập nhật hàng loạt
pm.test('Status 500 khi xảy ra lỗi hệ thống ở mark-all-read', function () {
    pm.response.to.have.status(500);
});

pm.test('Response lỗi có thông tin message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});
