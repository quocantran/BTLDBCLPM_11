// PM-ME-001 : GET /exams/my-completed — Lấy danh sách bài thi đã hoàn thành rỗng
pm.test('Status 200 khi student chưa có bài thi đã hoàn thành', function () {
    pm.response.to.have.status(200);
});

pm.test('Response là mảng hợp lệ', function () {
    var json = pm.response.json();
    pm.expect(json).to.be.an('array');
});

// PM-ME-002 : GET /exams/my-completed — Lấy danh sách bài thi đã hoàn thành có dữ liệu
pm.test('Status 200 khi student có bài thi đã hoàn thành', function () {
    pm.response.to.have.status(200);
});

pm.test('Mỗi phần tử có submissionId, examPublicId, examTitle, score, result', function () {
    var json = pm.response.json();
    pm.expect(json).to.be.an('array');
    if (json.length > 0) {
        pm.expect(json[0]).to.have.property('submissionId');
        pm.expect(json[0]).to.have.property('examPublicId');
        pm.expect(json[0]).to.have.property('examTitle');
        pm.expect(json[0]).to.have.property('score');
        pm.expect(json[0]).to.have.property('result');
    }
});

// PM-ME-003 : GET /exams/my-completed — Teacher gọi endpoint của student
pm.test('Status 403 khi teacher gọi GET /exams/my-completed', function () {
    pm.response.to.have.status(403);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-ME-004 : GET /exams/teacher/:teacherId — Lấy danh sách exam theo teacher thành công
pm.test('Status 200 khi lấy danh sách exam theo teacher', function () {
    pm.response.to.have.status(200);
});

pm.test('Response đúng format: success=true, data.exams và data.pagination', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Exams retrieved successfully');
    pm.expect(json.data).to.have.property('exams');
    pm.expect(json.data.exams).to.be.an('array');
    pm.expect(json.data).to.have.property('pagination');
});

// PM-ME-005 : GET /exams/teacher/:teacherId?search=Midterm — Tìm kiếm exam theo keyword
pm.test('Status 200 khi search exam theo keyword hợp lệ', function () {
    pm.response.to.have.status(200);
});

pm.test('Kết quả trả về là mảng exam hợp lệ', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.data.exams).to.be.an('array');
});

// PM-ME-006 : GET /exams/teacher/:teacherId?search=\\ — Search ký tự backslash
pm.test('Status 400 khi search chứa ký tự backslash', function () {
    pm.response.to.have.status(400);
});

pm.test('Response lỗi hợp lệ, không trả 500', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
    pm.expect(pm.response.code).to.not.equal(500);
});

// PM-ME-007 : POST /exams — Teacher tạo exam thành công
pm.test('Status 201 khi teacher tạo exam thành công', function () {
    pm.response.to.have.status(201);
});

pm.test('Response đúng format và lưu examId, examPublicId', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Exam created successfully');
    pm.expect(json.data).to.have.property('exam');
    pm.expect(json.data.exam).to.have.property('id');
    pm.expect(json.data.exam).to.have.property('publicId');
    pm.expect(json.data.exam.publicId).to.match(/^E\d{6}$/);
    pm.collectionVariables.set('examId', json.data.exam.id);
    pm.collectionVariables.set('examPublicId', json.data.exam.publicId);
});

// PM-ME-008 : POST /exams — Student tạo exam
pm.test('Status 403 khi student tạo exam', function () {
    pm.response.to.have.status(403);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-ME-009 : POST /exams — title vượt quá giới hạn
pm.test('Status 400 khi title quá dài', function () {
    pm.response.to.have.status(400);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-ME-010 : GET /exams/:id — Teacher lấy chi tiết exam thành công
pm.test('Status 200 khi teacher lấy chi tiết exam', function () {
    pm.response.to.have.status(200);
});

pm.test('Response đúng format và có data.exam.questions', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Exam retrieved successfully');
    pm.expect(json.data).to.have.property('exam');
    pm.expect(json.data.exam).to.have.property('questions');
    pm.expect(json.data.exam.questions).to.be.an('array');
});

// PM-ME-011 : GET /exams/:id — Student lấy chi tiết exam
pm.test('Status 403 khi student gọi GET /exams/:id', function () {
    pm.response.to.have.status(403);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-ME-012 : GET /exams/:id — Lấy exam không tồn tại
pm.test('Status 404 khi lấy exam không tồn tại', function () {
    pm.response.to.have.status(404);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-ME-013 : PUT /exams/:id — Teacher cập nhật exam thành công
pm.test('Status 200 khi teacher cập nhật exam', function () {
    pm.response.to.have.status(200);
});

pm.test('Response đúng format và title được cập nhật', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Exam updated successfully');
    pm.expect(json.data).to.have.property('exam');
    pm.expect(json.data.exam).to.have.property('title');
});

// PM-ME-014 : PUT /exams/:id — Student cập nhật exam
pm.test('Status 403 khi student cập nhật exam', function () {
    pm.response.to.have.status(403);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-ME-015 : PUT /exams/:id — Cập nhật exam không tồn tại
pm.test('Status 404 khi cập nhật exam không tồn tại', function () {
    pm.response.to.have.status(404);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-ME-016 : PATCH /exams/:id/status — Teacher chuyển trạng thái exam sang active
pm.test('Status 200 khi teacher chuyển trạng thái exam sang active', function () {
    pm.response.to.have.status(200);
});

pm.test('Response đúng format và message chuẩn', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Exam marked as active');
    pm.expect(json.data).to.have.property('exam');
});

// PM-ME-017 : PATCH /exams/:id/status — Teacher chuyển trạng thái exam sang completed
pm.test('Status 200 khi teacher chuyển trạng thái exam sang completed', function () {
    pm.response.to.have.status(200);
});

pm.test('Response đúng format và message chuẩn', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Exam marked as completed');
    pm.expect(json.data).to.have.property('exam');
});

// PM-ME-018 : PATCH /exams/:id/status — Student chuyển trạng thái exam
pm.test('Status 403 khi student gọi PATCH /exams/:id/status', function () {
    pm.response.to.have.status(403);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-ME-019 : DELETE /exams/:id — Teacher xóa exam thành công
pm.test('Status 200 khi teacher xóa exam thành công', function () {
    pm.response.to.have.status(200);
});

pm.test('Response đúng format và message chuẩn', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Exam deleted successfully');
});

// PM-ME-020 : DELETE /exams/:id — Student xóa exam
pm.test('Status 403 khi student xóa exam', function () {
    pm.response.to.have.status(403);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-ME-021 : DELETE /exams/:id — Xóa exam không tồn tại
pm.test('Status 404 khi xóa exam không tồn tại', function () {
    pm.response.to.have.status(404);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-ME-022 : POST /exams/join — Student join exam thành công
pm.test('Status 200 khi student join exam thành công', function () {
    pm.response.to.have.status(200);
});

pm.test('Response chứa thông tin exam card hợp lệ', function () {
    var json = pm.response.json();
    pm.expect(json).to.have.property('publicId');
    pm.expect(json).to.have.property('title');
    pm.expect(json).to.have.property('status');
    pm.expect(json).to.have.property('course');
    pm.expect(json.course).to.have.property('courseName');
});

// PM-ME-023 : POST /exams/join — Student không thuộc course vẫn join được
pm.test('Status 403 khi student không thuộc course thực hiện join exam', function () {
    pm.response.to.have.status(403);
});

pm.test('Response lỗi có thông tin message', function () {
    var json = pm.response.json();
    if (json.error) {
        pm.expect(json.error).to.have.property('message');
    }
});

// PM-ME-024 : POST /exams/join — Join exam khi course tham chiếu không tồn tại
pm.test('Status 404 khi course tham chiếu của exam không tồn tại', function () {
    pm.response.to.have.status(404);
});

pm.test('Response lỗi có thông tin message', function () {
    var json = pm.response.json();
    if (json.error) {
        pm.expect(json.error).to.have.property('message');
    }
});

// PM-ME-025 : GET /exams/:publicId/take — Lấy đề thi để làm bài thành công
pm.test('Status 200 khi lấy đề thi để làm bài thành công', function () {
    pm.response.to.have.status(200);
});

pm.test('Response có questions và không lộ isCorrect', function () {
    var json = pm.response.json();
    pm.expect(json).to.have.property('publicId');
    pm.expect(json).to.have.property('questions');
    pm.expect(json.questions).to.be.an('array');
    if (json.questions.length > 0 && json.questions[0].choices && json.questions[0].choices.length > 0) {
        pm.expect(json.questions[0].choices[0].isCorrect).to.be.undefined;
    }
});

// PM-ME-026 : GET /exams/:publicId/take — Lấy đề thi khi exam chưa active
pm.test('Status 400 khi exam chưa active hoặc không trong thời gian làm bài', function () {
    pm.response.to.have.status(400);
});

pm.test('Response lỗi hợp lệ', function () {
    var json = pm.response.json();
    if (json.error) {
        pm.expect(json.error).to.have.property('message');
    }
});

// PM-ME-027 : GET /exams/:publicId/take — Lấy đề thi với publicId không tồn tại
pm.test('Status 404 khi lấy đề thi với publicId không tồn tại', function () {
    pm.response.to.have.status(404);
});

pm.test('Response lỗi hợp lệ', function () {
    var json = pm.response.json();
    if (json.error) {
        pm.expect(json.error).to.have.property('message');
    }
});

// PM-ME-028 : POST /exams/:publicId/submit — Nộp bài thi thành công
pm.test('Status 201 khi nộp bài thi thành công', function () {
    pm.response.to.have.status(201);
});

pm.test('Response có kết quả chấm điểm và lưu submissionId', function () {
    var json = pm.response.json();
    pm.expect(json).to.have.property('score');
    pm.expect(json).to.have.property('result');
    pm.expect(json).to.have.property('submissionId');
    pm.collectionVariables.set('submissionId', json.submissionId);
});

// PM-ME-029 : POST /exams/:publicId/submit — Nộp bài lần 2
pm.test('Status 403 khi student nộp bài lần thứ hai', function () {
    pm.response.to.have.status(403);
});

pm.test('Response lỗi hợp lệ', function () {
    var json = pm.response.json();
    if (json.error) {
        pm.expect(json.error).to.have.property('message');
    }
});

// PM-ME-030 : POST /exams/:publicId/submit — questionId sai định dạng
pm.test('Status 400 khi answers[].questionId sai định dạng', function () {
    pm.response.to.have.status(400);
});

pm.test('Response lỗi hợp lệ, không trả 500', function () {
    var json = pm.response.json();
    if (json.error) {
        pm.expect(json.error).to.have.property('message');
    }
    pm.expect(pm.response.code).to.not.equal(500);
});

// PM-ME-031 : GET /exams/:id/results — Teacher lấy kết quả exam thành công
pm.test('Status 200 khi teacher lấy kết quả exam', function () {
    pm.response.to.have.status(200);
});

pm.test('Response đúng format: data.exam và data.results', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Exam results retrieved successfully');
    pm.expect(json.data).to.have.property('exam');
    pm.expect(json.data).to.have.property('results');
    pm.expect(json.data.results).to.be.an('array');
});

// PM-ME-032 : GET /exams/:id/results — Student lấy kết quả exam
pm.test('Status 403 khi student gọi GET /exams/:id/results', function () {
    pm.response.to.have.status(403);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-ME-033 : GET /exams/:id/results — Lấy kết quả exam không tồn tại
pm.test('Status 404 khi lấy kết quả exam không tồn tại', function () {
    pm.response.to.have.status(404);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-ME-034 : GET /exams/:examId/submissions/:submissionId/result — Teacher xem chi tiết bài nộp thành công
pm.test('Status 200 khi teacher xem chi tiết bài nộp thành công', function () {
    pm.response.to.have.status(200);
});

pm.test('Response đúng format và có submissionId', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Submission detail retrieved successfully');
    pm.expect(json.data).to.have.property('submissionId');
});

// PM-ME-035 : GET /exams/:examId/submissions/:submissionId/result — Student gọi endpoint của teacher
pm.test('Status 403 khi student gọi endpoint chi tiết bài nộp của teacher', function () {
    pm.response.to.have.status(403);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-ME-036 : GET /exams/:examId/submissions/:submissionId/result — Submission không tồn tại
pm.test('Status 404 khi submission không tồn tại', function () {
    pm.response.to.have.status(404);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-ME-037 : GET /exams/submissions/:submissionId/result — Student xem kết quả bài nộp của mình
pm.test('Status 200 khi student xem kết quả bài nộp của mình', function () {
    pm.response.to.have.status(200);
});

pm.test('Response đúng format và có message chuẩn', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Exam result retrieved successfully');
    pm.expect(json.data).to.have.property('submissionId');
});

// PM-ME-038 : GET /exams/submissions/:submissionId/result — submissionId sai định dạng
pm.test('Status 400 khi submissionId sai định dạng', function () {
    pm.response.to.have.status(400);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-ME-039 : GET /exams/submissions/:submissionId/result — Student xem kết quả bài nộp của người khác
pm.test('Status 403 khi student xem bài nộp không thuộc sở hữu', function () {
    pm.response.to.have.status(403);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});
