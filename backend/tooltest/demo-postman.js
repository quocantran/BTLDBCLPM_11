// PM_AM_001 : Đăng nhập thành công
pm.test('Status 200', function () {
    pm.response.to.have.status(200);
});

// Kiểm tra thông tin token và user
pm.test('Trả về JWT token và thông tin user', function () {
    var json = pm.response.json();
    pm.expect(json).to.have.property('accessToken');
    pm.expect(json).to.have.property('tokenType');
    pm.expect(json).to.have.property('id');
    pm.expect(json).to.have.property('username');
    pm.expect(json).to.have.property('email');
    pm.expect(json).to.have.property('roles');
    pm.expect(json.roles).to.be.an('array');
});

// Lưu thông tin vào biến mỗi trường
pm.test('Lưu token và thông tin vào biến môi trường', function () {
    var json = pm.response.json();
    pm.collectionVariables.set('adminToken', json.token);
    pm.collectionVariables.set('testUserId', json.id);
    pm.collectionVariables.set('testUsername', json.username);
    console.log('Token đã lưu:', json.token);
});

// PM_AM_002 : Đăng nhập với username không tồn tại
pm.test('Status 400 khi username không tồn tại', function () {
    pm.response.to.have.status(400);
});

// PM_AM_003 : Đăng nhập với mật khẩu sai
pm.test('Bị từ chối khi sai mật khẩu', function () {
    pm.expect(pm.response.code).to.be.oneOf([400, 401]);
});

// PM_AM_004 : Đăng nhập với user bị xóa mềm
pm.test('Status 400 khi tài khoản bị xóa mềm', function () {
    pm.response.to.have.status(400);
});

// PM_AM_005 : Kiểm tra yêu cầu reset password thành công
pm.test('Status 200', function () {
    pm.response.to.have.status(200);
});

// Kiểm tra kết quả trả về
pm.test('Trả về operationResult SUCCESS', function () {
    var json = pm.response.json();
    pm.expect(json).to.have.property('operationName');
    pm.expect(json).to.have.property('operationResult');
    pm.expect(json.operationName).to.eql('REQUEST_PASSWORD_RESET');
    pm.expect(json.operationResult).to.eql('SUCCESS');
});

// PM_AM_006 : Kiểm tra yêu cầu reset password với email không tồn tại
pm.test('Status 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Trả về operationResult ERROR khi email không tồn tại', function () {
    var json = pm.response.json();
    pm.expect(json.operationName).to.eql('REQUEST_PASSWORD_RESET');
    pm.expect(json.operationResult).to.eql('ERROR');
});

// PM_AM_007 : Kiểm tra reset password với token hợp lệ
pm.test('Status 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Trả về operationResult SUCCESS', function () {
    var json = pm.response.json();
    pm.expect(json.operationName).to.eql('PASSWORD_RESET');
    pm.expect(json.operationResult).to.eql('SUCCESS');
});

// PM_AM_008 : Kiểm tra reset password với token không hợp lệ
pm.test('Status 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Trả về operationResult ERROR khi token sai', function () {
    var json = pm.response.json();
    pm.expect(json.operationName).to.eql('PASSWORD_RESET');
    pm.expect(json.operationResult).to.eql('ERROR');
});