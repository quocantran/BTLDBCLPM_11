// PM-VR-001 : GET /dashboard/teacher — Teacher lấy dashboard của chính mình thành công
pm.test('Status 200 khi teacher lấy dashboard của chính mình', function () {
    pm.response.to.have.status(200);
});

pm.test('Response đúng format: success=true, message chuẩn, có stats/examPerformance/activeExams', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Teacher dashboard data retrieved successfully');
    pm.expect(json.data).to.have.property('stats');
    pm.expect(json.data.stats).to.have.property('totalStudents');
    pm.expect(json.data.stats).to.have.property('activeExams');
    pm.expect(json.data.stats).to.have.property('certificatesIssued');
    pm.expect(json.data).to.have.property('examPerformance');
    pm.expect(json.data.examPerformance).to.have.property('summary');
    pm.expect(json.data.examPerformance).to.have.property('records');
    pm.expect(json.data).to.have.property('activeExams');
    pm.expect(json.data.activeExams).to.be.an('array');
});

// PM-VR-003 : GET /dashboard/teacher — Student truy cập dashboard teacher
pm.test('Status 403 khi student truy cập dashboard teacher', function () {
    pm.response.to.have.status(403);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-VR-004 : GET /dashboard/teacher — Teacher truy cập dashboard của teacher khác
pm.test('Status 403 khi teacher truy cập dashboard không thuộc sở hữu', function () {
    pm.response.to.have.status(403);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-VR-005 : GET /dashboard/teacher — Không có user context
pm.test('Status 401 khi thiếu user context ở dashboard teacher', function () {
    pm.response.to.have.status(401);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-VR-006 : GET /dashboard/student — Lấy dashboard student thành công có dữ liệu
pm.test('Status 200 khi student lấy dashboard thành công', function () {
    pm.response.to.have.status(200);
});

pm.test('Response đúng format: success=true, message chuẩn, có performance và completedExams', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Student dashboard data retrieved successfully');
    pm.expect(json.data).to.have.property('performance');
    pm.expect(json.data.performance).to.have.property('points');
    pm.expect(json.data.performance).to.have.property('averageScore');
    pm.expect(json.data.performance).to.have.property('passRate');
    pm.expect(json.data).to.have.property('completedExams');
    pm.expect(json.data.completedExams).to.be.an('array');
});

// PM-VR-007 : GET /dashboard/student — Student chưa có bài thi hoàn thành
pm.test('Status 200 khi student chưa có dữ liệu bài thi hoàn thành', function () {
    pm.response.to.have.status(200);
});

pm.test('Response trả performance rỗng hợp lệ và completedExams là mảng rỗng', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.data.performance.points).to.be.an('array');
    pm.expect(json.data.performance.points.length).to.equal(0);
    pm.expect(json.data.performance.averageScore).to.equal(0);
    pm.expect(json.data.performance.passRate).to.equal(0);
    pm.expect(json.data.completedExams).to.be.an('array');
    pm.expect(json.data.completedExams.length).to.equal(0);
});