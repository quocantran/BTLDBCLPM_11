// PM-UMC-001 : POST /certificates/issue — Cấp chứng chỉ thành công
pm.test('Status 201 khi cấp chứng chỉ thành công', function () {
    pm.response.to.have.status(201);
});

pm.test('Response đúng format: success=true, message chuẩn, có dữ liệu chứng chỉ', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Certificate issued');
    pm.expect(json.data).to.exist;
});

// PM-UMC-002 : POST /certificates/issue — Không tìm thấy submission
pm.test('Status 404 khi không tìm thấy submission để cấp chứng chỉ', function () {
    pm.response.to.have.status(404);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-UMC-003 : POST /certificates/issue — Không tìm thấy student
pm.test('Status 404 khi student không tồn tại', function () {
    pm.response.to.have.status(404);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
    pm.expect(json.error.message).equal("Student not found");
});

// PM-UMC-004 : GET /certificates — Lấy danh sách chứng chỉ thành công
pm.test('Status 200 khi lấy danh sách chứng chỉ', function () {
    pm.response.to.have.status(200);
});

pm.test('Response đúng format: success=true, data là mảng, có meta.page/limit/total', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Certificates fetched');
    pm.expect(json.data).to.be.an('array');
    pm.expect(json.meta).to.have.property('page');
    pm.expect(json.meta).to.have.property('limit');
    pm.expect(json.meta).to.have.property('total');
});

// PM-UMC-005 : GET /certificates?issuedFrom=...&issuedTo=... — issuedTo nhỏ hơn issuedFrom
pm.test('Status 400 khi issuedTo nhỏ hơn issuedFrom', function () {
    pm.response.to.have.status(400);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-UMC-006 : GET /certificates?courseName=\\ — courseName chứa ký tự regex không hợp lệ
pm.test('Status 400 khi courseName chứa ký tự regex không hợp lệ', function () {
    pm.response.to.have.status(400);
});

pm.test('Response lỗi hợp lệ, không trả 500', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
    pm.expect(pm.response.code).to.not.equal(500);
});

// PM-UMC-007 : GET /certificates/:id — Lấy chi tiết chứng chỉ thành công
pm.test('Status 200 khi lấy chi tiết chứng chỉ thành công', function () {
    pm.response.to.have.status(200);
});

pm.test('Response đúng format: success=true, message chuẩn, data tồn tại', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Certificate fetched');
    pm.expect(json.data).to.exist;
});

// PM-UMC-008 : GET /certificates/:id — Chứng chỉ không tồn tại
pm.test('Status 404 khi chứng chỉ không tồn tại', function () {
    pm.response.to.have.status(404);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-UMC-009 : GET /certificates/:id — ID chứng chỉ sai định dạng
pm.test('Status 404 khi ID chứng chỉ sai định dạng', function () {
    pm.response.to.have.status(404);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-UMC-010 : GET /certificates/student/:studentId — Lấy chứng chỉ theo student thành công
pm.test('Status 200 khi lấy chứng chỉ theo student thành công', function () {
    pm.response.to.have.status(200);
});

pm.test('Response đúng format: success=true, data là mảng, message chuẩn', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Certificates fetched');
    pm.expect(json.data).to.be.an('array');
});

// PM-UMC-011 : GET /certificates/student/:studentId — Student chưa có chứng chỉ
pm.test('Status 200 khi student chưa có chứng chỉ', function () {
    pm.response.to.have.status(200);
});

pm.test('Response trả data là mảng rỗng', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.data).to.be.an('array');
    pm.expect(json.data.length).to.equal(0);
});

// PM-UMC-012 : GET /certificates/student/:studentId — Filter theo status
pm.test('Status 200 khi lọc chứng chỉ theo status ở endpoint student', function () {
    pm.response.to.have.status(200);
});

pm.test('Response trả data là mảng hợp lệ', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.data).to.be.an('array');
});

// PM-UMC-013 : GET /certificates/course/:courseId — Lấy chứng chỉ theo course thành công
pm.test('Status 200 khi lấy chứng chỉ theo course thành công', function () {
    pm.response.to.have.status(200);
});

pm.test('Response đúng format: success=true, data là mảng, message chuẩn', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Certificates fetched');
    pm.expect(json.data).to.be.an('array');
});

// PM-UMC-014 : GET /certificates/course/:courseId — Course chưa có chứng chỉ
pm.test('Status 200 khi course chưa có chứng chỉ', function () {
    pm.response.to.have.status(200);
});

pm.test('Response trả data là mảng rỗng', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.data).to.be.an('array');
    pm.expect(json.data.length).to.equal(0);
});

// PM-UMC-015 : GET /certificates/course/:courseId — Filter theo status
pm.test('Status 200 khi lọc chứng chỉ theo status ở endpoint course', function () {
    pm.response.to.have.status(200);
});

pm.test('Response trả data là mảng hợp lệ', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.data).to.be.an('array');
});

// PM-UMC-019 : POST /certificates/:id/generate — Tạo ảnh chứng chỉ thành công
pm.test('Status 200 khi tạo ảnh chứng chỉ thành công', function () {
    pm.response.to.have.status(200);
});

pm.test('Response có imageIpfsHash, metadataIpfsHash và gateway URL', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Certificate image generated and uploaded successfully');
    pm.expect(json.data).to.have.property('imageIpfsHash');
    pm.expect(json.data).to.have.property('metadataIpfsHash');
    pm.expect(json.data).to.have.property('imageGatewayUrl');
    pm.expect(json.data).to.have.property('metadataGatewayUrl');
});

// PM-UMC-020 : POST /certificates/:id/generate — Tạo ảnh chứng chỉ với ID không tồn tại
pm.test('Status 404 khi tạo ảnh chứng chỉ với ID không tồn tại', function () {
    pm.response.to.have.status(404);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});

// PM-UMC-021 : POST /certificates/:id/generate — Student gọi endpoint generate
pm.test('Status 403 khi student gọi endpoint tạo ảnh chứng chỉ', function () {
    pm.response.to.have.status(403);
});

pm.test('Response lỗi có error.message', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
});
