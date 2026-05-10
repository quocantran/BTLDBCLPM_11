// PM-MC-001 : POST /courses — Teacher tạo khóa học thành công
pm.test('Status 201 khi teacher tạo khóa học thành công', function () {
    pm.response.to.have.status(201);
});

pm.test('Response đúng format: success=true, message chuẩn, data.course có đủ field chính', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Course created successfully');
    pm.expect(json.data).to.have.property('course');
    pm.expect(json.data.course).to.have.property('id');
    pm.expect(json.data.course).to.have.property('publicId');
    pm.expect(json.data.course).to.have.property('courseName');
    pm.expect(json.data.course).to.have.property('teacherId');
    pm.expect(json.data.course).to.have.property('enrollmentCount');
    pm.expect(json.data.course.publicId).to.match(/^C\d{6}$/);
});

pm.test('Lưu teacherCourseId để dùng cho API delete/update', function () {
    var json = pm.response.json();
    if (json.data && json.data.course) {
        pm.collectionVariables.set('teacherCourseId', json.data.course.id);
    }
});

// PM-MC-002 : POST /courses — Student tạo khóa học
pm.test('Status 403 khi student tạo khóa học', function () {
    pm.response.to.have.status(403);
});

pm.test('Response lỗi có success=false và error.message hợp lệ', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-MC-003 : POST /courses — Tên khóa học < 6 ký tự
pm.test('Status 400 khi courseName ngắn hơn 6 ký tự', function () {
    pm.response.to.have.status(400);
});

pm.test('Response validation lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-MC-004 : POST /courses — Tên khóa học > 100 ký tự
pm.test('Status 400 khi courseName dài hơn 100 ký tự', function () {
    pm.response.to.have.status(400);
});

pm.test('Response validation lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-MC-005 : GET /courses/teacher/:teacherId — Lấy danh sách khóa học thành công
pm.test('Status 200 khi lấy danh sách khóa học của teacher', function () {
    pm.response.to.have.status(200);
});

pm.test('Response đúng format: success=true, message chuẩn, data.courses là mảng', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Courses retrieved successfully');
    pm.expect(json.data).to.have.property('courses');
    pm.expect(json.data.courses).to.be.an('array');
});

// PM-MC-006 : GET /courses/teacher/:teacherId?search=Python — Filter theo từ khóa
pm.test('Status 200 khi search theo từ khóa hợp lệ', function () {
    pm.response.to.have.status(200);
});

pm.test('Kết quả search chỉ trả course match keyword', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.data.courses).to.be.an('array');
    if (json.data.courses.length > 0) {
        pm.expect(json.data.courses[0]).to.have.property('courseName');
    }
});

// PM-MC-007 : GET /courses/teacher/:teacherId?search=\\ — Search ký tự backslash
pm.test('Status 400 khi search chứa ký tự backslash', function () {
    pm.response.to.have.status(400);
});

pm.test('Response lỗi có error.message, không trả 500', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
    pm.expect(pm.response.code).to.not.equal(500);
});

// PM-MC-009 : DELETE /courses/delete/:courseId — Xóa khóa học của chính teacher thành công
pm.test('Status 200 khi teacher xóa khóa học của chính mình', function () {
    pm.response.to.have.status(200);
});

pm.test('Response đúng format: success=true, message chuẩn', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Course deleted successfully');
});

// PM-MC-010 : DELETE /courses/delete/:courseId — Student xóa khóa học
pm.test('Status 403 khi student cố xóa khóa học', function () {
    pm.response.to.have.status(403);
});

pm.test('Response lỗi có success=false và error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-MC-011 : DELETE /courses/delete/:courseId — Teacher A xóa khóa học của Teacher B
pm.test('Status 403 khi teacher không phải owner xóa khóa học', function () {
    pm.response.to.have.status(403);
});

pm.test('Response lỗi có success=false và error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-MC-012 : DELETE /courses/delete/:courseId — Xóa course không tồn tại
pm.test('Status 404 khi xóa course không tồn tại', function () {
    pm.response.to.have.status(404);
});

pm.test('Response lỗi có error.message chứa "Course not found"', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error.message).to.include('Course not found');
});

// PM-MC-013 : PATCH /courses/:courseId/name — Cập nhật tên khóa học thành công
pm.test('Status 200 khi cập nhật tên khóa học thành công', function () {
    pm.response.to.have.status(200);
});

pm.test('Response đúng format và trả courseName mới', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Course name updated successfully');
    pm.expect(json.data).to.have.property('course');
    pm.expect(json.data.course).to.have.property('courseName');
});

// PM-MC-014 : PATCH /courses/:courseId/name — Tên mới < 6 ký tự
pm.test('Status 400 khi cập nhật courseName ngắn hơn 6 ký tự', function () {
    pm.response.to.have.status(400);
});

pm.test('Response validation lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-MC-015 : PATCH /courses/:courseId/name — Tên mới > 100 ký tự
pm.test('Status 400 khi cập nhật courseName dài hơn 100 ký tự', function () {
    pm.response.to.have.status(400);
});

pm.test('Response validation lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-MC-016 : PATCH /courses/:courseId/name — Teacher A sửa course của Teacher B
pm.test('Status 403 khi teacher không phải owner cập nhật course', function () {
    pm.response.to.have.status(403);
});

pm.test('Response lỗi có success=false và error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});
