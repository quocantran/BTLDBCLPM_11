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
    pm.expect(json).to.have.property('email')
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
// PM_AM_009 : Kiểm tra lấy ra user thành công
pm.test('Status 200', function () {
    pm.response.to.have.status(200);
});

// Kiểm tra response
pm.test('Response có status 200 và có data', function () {
    var json = pm.response.json();
    pm.expect(json.statusCode).to.eql(200);
    pm.expect(json.data).to.not.be.null;
});

// Kiểm tra response hợp lệ
pm.test('Data chứa thông tin user hợp lệ', function () {
    var json = pm.response.json();
    var user = Array.isArray(json.data) ? json.data[0] : json.data;
    pm.expect(user).to.have.property('username');
    pm.expect(user).to.have.property('email');
    pm.collectionVariables.set('testUserId', user.id);
});

// PM_AM_010 : Kiểm tra lấy user với username không hợp lệ
pm.test('Status 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Trả về status 404 trong body khi không tìm thấy', function () {
    var json = pm.response.json();
    pm.expect(json.statusCode).to.eql(404);
    pm.expect(json.message).to.include('không tìm thấy');
});

// PM_AM_011 : Kiểm tra lấy ra user với username rỗng
pm.test('Status 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Response có status 200 và có data', function () {
    var json = pm.response.json();
    pm.expect(json.statusCode).to.eql(200);
    pm.expect(json.data).to.not.be.null;
});

pm.test('Data chứa thông tin user hợp lệ', function () {
    var json = pm.response.json();
    var user = Array.isArray(json.data) ? json.data[0] : json.data;
    pm.expect(user).to.have.property('username');
    pm.expect(user).to.have.property('email');
    pm.collectionVariables.set('testUserId', user.id);
});

// PM_AM_012 : Kiểm tra username tồn tại
pm.test('Status 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Trả về true khi username đã tồn tại', function () {
    var result = pm.response.json();
    pm.expect(result).to.be.a('boolean');
    pm.expect(result).to.eql(true);
});

// PM_AM_013 : Kiểm tra username không tồn tại
pm.test('Status 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Trả về false khi username chưa tồn tại', function () {
    var result = pm.response.json();
    pm.expect(result).to.be.a('boolean');
    pm.expect(result).to.eql(false);
});

// PM_AM_014 : Kiểm tra email hợp lệ
pm.test('Status 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Trả về true khi email đã tồn tại', function () {
    var result = pm.response.json();
    pm.expect(result).to.be.a('boolean');
    pm.expect(result).to.eql(true);
});

// PM_AM_015 : Kiểm tra email không hợp lệ
pm.test('Status 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Trả về false khi email chưa tồn tại', function () {
    var result = pm.response.json();
    pm.expect(result).to.be.a('boolean');
    pm.expect(result).to.eql(false);
});

// PM_AM_016 : Update email thành công
pm.test('Status 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Đổi email thành công', function () {
    var json = pm.response.json();
    pm.expect(json.statusCode).to.eql(200);
    pm.expect(json.message).to.include('successfully');
});

pm.test('Trả về email mới trong data', function () {
    var json = pm.response.json();
    pm.expect(json.data).to.include('newemail');
});

// PM_AM_017 : Update email với password sai
pm.test('Status 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Trả về lỗi 417 khi sai mật khẩu', function () {
    var json = pm.response.json();
    pm.expect(json.statusCode).to.eql(417);
    pm.expect(json.message).to.include('wrong');
});

// PM_AM_018 : Update password thành công
pm.test('Status 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Đổi mật khẩu thành công', function () {
    var json = pm.response.json();
    pm.expect(json.statusCode).to.eql(200);
    pm.expect(json.message).to.include('successfully');
});

// PM_AM_019 : Update password với mật khẩu hiện tại sai
pm.test('Status 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Trả về lỗi 400 khi sai mật khẩu hiện tại', function () {
    var json = pm.response.json();
    pm.expect(json.statusCode).to.eql(400);
    pm.expect(json.message).to.include('Wrong password');
});

// PM_AM_020 : Update password với password trùng với password hiện tại
pm.test('Status 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Trả về lỗi 409 khi mật khẩu mới trùng cũ', function () {
    var json = pm.response.json();
    pm.expect(json.statusCode).to.eql(409);
    pm.expect(json.message).to.include('old password');
});

// PM_AM_021 : Lấy danh sách user mà có phân trang
pm.test('Status 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Response có cấu trúc phân trang', function () {
    var json = pm.response.json();

    pm.expect(json).to.have.property('data');
    pm.expect(json).to.have.property('paginationDetails');

    pm.expect(json.data).to.be.an('array');

    pm.expect(json.paginationDetails).to.have.property('totalCount');
    pm.expect(json.paginationDetails).to.have.property('totalPage');
    pm.expect(json.paginationDetails).to.have.property('pageCount');
    pm.expect(json.paginationDetails).to.have.property('pageNumber');
});

pm.test('Kích thước trang không vượt quá 10', function () {
    var json = pm.response.json();

    pm.expect(json.data.length).to.be.at.most(10);
});

// PM_AM_022 : Lấy ra user mà không có token
pm.test('Bị từ chối khi không có token admin', function () {
    pm.expect(pm.response.code).to.be.oneOf([401, 403]);
});

// PM_AM_023 : Tìm kiếm user theo email hoặc username
pm.test('Status 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Kết quả tìm kiếm là mảng', function () {
    var json = pm.response.json();
    pm.expect(json.data).to.be.an('array');
});

pm.test('Kết quả khớp với từ khóa tìm kiếm', function () {
    var json = pm.response.json();
    var keyword = pm.collectionVariables.get('testUsername').toLowerCase();
    json.data.forEach(function (user) {
        var match = (user.username && user.username.toLowerCase().includes(keyword)) ||
            (user.email && user.email.toLowerCase().includes(keyword));
        pm.expect(match).to.be.true;
    });
});

// PM_AM_024 : Tạo mới user thành công
pm.test('Status 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Tạo user thành công', function () {
    var json = pm.response.json();
    pm.expect(json.statusCode).to.eql(200);
    pm.expect(json.message).to.include('successfully');
});

pm.test('Lưu ID user mới để dùng cho các test sau', function () {
    var json = pm.response.json();
    if (json.data && json.data.id) {
        pm.collectionVariables.set('testUserId', json.data.id);
        console.log('Đã lưu testUserId:', json.data.id);
    }
});

// PM_AM_025 : Tạo user với username đã tồn tại
pm.test('Status 400', function () {
    pm.response.to.have.status(400);
});

pm.test('Trả về lỗi 409 username trùng', function () {
    var json = pm.response.json();
    pm.expect(json.statusCode).to.eql(409);
    pm.expect(json.message).to.include('Tên đăng nhập');
});

// PM_AM_026 : Tạo user với email đã tồn tại
pm.test('Status 400', function () {
    pm.response.to.have.status(400);
});

pm.test('Trả về lỗi 409 email trùng', function () {
    var json = pm.response.json();
    pm.expect(json.statusCode).to.eql(409);
    pm.expect(json.message).to.include('Email');
});

// PM_AM_027 : Cập nhật user
pm.test('Status 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Cập nhật thành công', function () {
    var json = pm.response.json();
    pm.expect(json.statusCode).to.eql(200);
    pm.expect(json.message).to.include('thành công');
});

pm.test('Dữ liệu trả về đã được cập nhật', function () {
    var json = pm.response.json();
    pm.expect(json.data).to.not.be.null;
    pm.expect(json.data.profile.firstName).to.eql('Updated');
});

// PM_AM_028 : Xóa mềm user
pm.test('Status 204 No Content', function () {
    pm.response.to.have.status(204);
});

pm.test('Response body rỗng', function () {
    pm.expect(pm.response.text()).to.be.empty;
});

// PM_AM_029 : Khôi phục user
pm.test('Status 204 No Content', function () {
    pm.response.to.have.status(204);
});

pm.test('Response body rỗng (khôi phục thành công)', function () {
    pm.expect(pm.response.text()).to.be.empty;
});

// PM_AM_030 : Xuất thông tin user sang file csv
pm.test('Status 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Content-Type là text/csv', function () {
    pm.expect(pm.response.headers.get('Content-Type')).to.include('text/csv');
});

pm.test('Header Content-Disposition đúng định dạng', function () {
    var cd = pm.response.headers.get('Content-Disposition');
    pm.expect(cd).to.include('attachment');
    pm.expect(cd).to.include('users.csv');
});

pm.test('File CSV không rỗng', function () {
    pm.expect(pm.response.text().length).to.be.above(0);
});

pm.test('CSV có header row', function () {
    var lines = pm.response.text().split('\n');
    pm.expect(lines.length).to.be.above(0);
});