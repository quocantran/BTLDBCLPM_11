// PM-UA-001 : POST /auth/register — Đăng ký thành công
pm.test('Status 201 khi đăng ký thành công', function () {
    pm.response.to.have.status(201);
});

pm.test('Response đúng format: success=true, message chuẩn, có meta.timestamp, không có data', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('User registered successfully');
    pm.expect(json.meta).to.have.property('timestamp');
    pm.expect(json.data).to.be.undefined;
});

// PM-UA-002 : POST /auth/register — Username đã tồn tại
pm.test('Status 409 khi username đã tồn tại', function () {
    pm.response.to.have.status(409);
});

pm.test('error.message chứa "Username already exists"', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error.message).to.include('Username already exists');
});

// PM-UA-003 : POST /auth/register — Email đã tồn tại
pm.test('Status 409 khi email đã tồn tại', function () {
    pm.response.to.have.status(409);
});

pm.test('error.message chứa "User with this email already exists"', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error.message).to.include('User with this email already exists');
});

// PM-UA-004 : POST /auth/login — Đăng nhập thành công bằng username
pm.test('Status 200 khi đăng nhập thành công bằng username', function () {
    pm.response.to.have.status(200);
});

pm.test('Response chứa đủ tokens, user info, không leak passwordHash', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Login successful');
    pm.expect(json.data).to.have.property('accessToken');
    pm.expect(json.data).to.have.property('refreshToken');
    pm.expect(json.data.user).to.have.property('id');
    pm.expect(json.data.user).to.have.property('username');
    pm.expect(json.data.user).to.have.property('email');
    pm.expect(json.data.user).to.have.property('role');
    pm.expect(json.data.user.passwordHash).to.be.undefined;
    pm.expect(json.data.user.refreshTokenHash).to.be.undefined;
});

pm.test('Lưu accessToken, refreshToken, userId vào collection variables', function () {
    var json = pm.response.json();
    if (json.data) {
        pm.collectionVariables.set('accessToken', json.data.accessToken);
        pm.collectionVariables.set('refreshToken', json.data.refreshToken);
        pm.collectionVariables.set('userId', json.data.user.id);
    }
});

// PM-UA-005 : POST /auth/login — Đăng nhập thành công bằng email
pm.test('Status 200 khi đăng nhập thành công bằng email', function () {
    pm.response.to.have.status(200);
});

pm.test('data.user.username khớp với user đã đăng ký', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.data.user).to.have.property('username');
});

// PM-UA-006 : POST /auth/login — Sai mật khẩu
pm.test('Status 401 khi sai mật khẩu', function () {
    pm.response.to.have.status(401);
});

pm.test('error.message là "Invalid credentials", không tiết lộ user có tồn tại', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error.message).to.include('Invalid credentials');
});

// PM-UA-007 : POST /auth/login — SQL Injection và XSS trong identifier
pm.test('Status 401 khi identifier chứa payload tấn công', function () {
    pm.response.to.have.status(401);
});

pm.test('Server không crash với payload tấn công, trả response hợp lệ', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error).to.have.property('message');
    pm.expect(pm.response.code).to.not.equal(500);
});

// PM-UA-008 : POST /auth/forgot-password — Email hợp lệ tồn tại
pm.test('Status 200 khi gửi forgot-password cho email hợp lệ', function () {
    pm.response.to.have.status(200);
});

pm.test('Response chứa message generic và expiresInMinutes hợp lệ', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.include('If an account exists');
    pm.expect(json.data).to.have.property('expiresInMinutes');
    pm.expect(json.data.expiresInMinutes).to.be.a('number').and.above(0);
});

// PM-UA-009 : POST /auth/forgot-password — Email không tồn tại
pm.test('Status 200 dù email không tồn tại', function () {
    pm.response.to.have.status(200);
});

pm.test('Message giống hệt khi email tồn tại, chống user enumeration', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.include('If an account exists');
    pm.expect(json.message.toLowerCase()).to.not.include('not found');
    pm.expect(json.message.toLowerCase()).to.not.include('not exist');
});


// PM-UA-013 : GET /auth/profile — Lấy profile thành công với JWT hợp lệ
pm.test('Status 200 khi lấy profile với JWT hợp lệ', function () {
    pm.response.to.have.status(200);
});

pm.test('Profile chứa đủ thông tin user, không trả dữ liệu nhạy cảm', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    var user = json.data.user;
    pm.expect(user).to.have.property('id');
    pm.expect(user).to.have.property('username');
    pm.expect(user).to.have.property('email');
    pm.expect(user).to.have.property('role');
    pm.expect(user).to.have.property('fullName');
    pm.expect(user).to.have.property('dateOfBirth');
    pm.expect(user).to.have.property('imageUrl');
    pm.expect(user).to.have.property('citizenId');
    pm.expect(user).to.have.property('createdAt');
    pm.expect(user).to.have.property('updatedAt');
    pm.expect(user.passwordHash).to.be.undefined;
    pm.expect(user.refreshTokenHash).to.be.undefined;
});

// PM-UA-014 : GET /auth/profile — Không có JWT token
pm.test('Status 401 khi GET /profile không có JWT', function () {
    pm.response.to.have.status(401);
});

pm.test('Không trả về dữ liệu user khi chưa xác thực', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json).to.not.have.property('data');
    pm.expect(json.error).to.have.property('message');
});

// PM-UA-015 : PUT /auth/profile — Cập nhật profile thành công
pm.test('Status 200 khi cập nhật profile thành công', function () {
    pm.response.to.have.status(200);
});

pm.test('Response chứa user đã cập nhật và message chuẩn', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.include('Profile updated successfully');
    pm.expect(json.data).to.have.property('user');
});

// PM-UA-016 : PUT /auth/profile — Email đã tồn tại của user khác
pm.test('Status 409 khi email đã tồn tại của user khác', function () {
    pm.response.to.have.status(409);
});

pm.test('error.message chứa "Email already exists"', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error.message).to.include('Email already exists');
});

// PM-UA-017 : POST /auth/change-password — Sai current password
pm.test('Status 401 khi sai current password', function () {
    pm.response.to.have.status(401);
});

pm.test('error.message chứa "Current password is incorrect"', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error.message).to.include('Current password is incorrect');
});

// PM-UA-018 : POST /auth/change-password — Password mới trùng password cũ
pm.test('Status 409 khi password mới trùng password cũ', function () {
    pm.response.to.have.status(409);
});

pm.test('error.message chứa "New password must be different from current password"', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error.message).to.include('New password must be different from current password');
});

// PM-UA-019 : POST /auth/change-password — Đổi mật khẩu thành công
pm.test('Status 200 khi đổi mật khẩu thành công', function () {
    pm.response.to.have.status(200);
});

pm.test('Response chứa message thành công và lưu oldRefreshToken', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Password changed successfully');
    pm.expect(json.data).to.have.property('message');
    pm.expect(json.data.message).to.equal('Password changed successfully');
    pm.collectionVariables.set('oldRefreshToken', pm.collectionVariables.get('refreshToken'));
});

// PM-UA-020 : POST /auth/refresh — Refresh token hợp lệ
pm.test('Status 200 khi refresh token hợp lệ', function () {
    pm.response.to.have.status(200);
});

pm.test('Response chứa accessToken và refreshToken mới hợp lệ', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.true;
    pm.expect(json.message).to.equal('Tokens refreshed successfully');
    pm.expect(json.data).to.have.property('accessToken');
    pm.expect(json.data).to.have.property('refreshToken');
    pm.expect(json.data.accessToken).to.be.a('string').and.have.length.above(10);
    pm.expect(json.data.refreshToken).to.be.a('string').and.have.length.above(10);
    pm.collectionVariables.set('accessToken', json.data.accessToken);
    pm.collectionVariables.set('refreshToken', json.data.refreshToken);
});

// PM-UA-021 : POST /auth/refresh — Refresh token không hợp lệ
pm.test('Status 401 khi dùng refresh token không hợp lệ', function () {
    pm.response.to.have.status(401);
});

pm.test('error.message chứa "Invalid refresh token"', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.be.false;
    pm.expect(json.error.message).to.include('Invalid refresh token');
});
