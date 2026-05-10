// PM-CV-001 : Verify certificate by certificateId thành công
pm.test('Status 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Trả về success=true và message đúng', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.eql(true);
    pm.expect(json.message).to.eql('Certificate verification completed');
    pm.expect(json.data).to.have.property('valid');
    pm.expect(json.data).to.have.property('message');
    pm.expect(json.data).to.have.property('certificate');
    pm.expect(json.data).to.have.property('blockchainVerification');
});

pm.test('Lưu certificateId và tokenId', function () {
    var json = pm.response.json();
    if (json.data && json.data.certificate) {
        pm.collectionVariables.set('cvCertificateId', json.data.certificate.id || '');
        pm.collectionVariables.set('cvTokenId', json.data.certificate.tokenId || '');
    }
});

// PM-CV-002 : Verify certificate by certificateId sai format
pm.test('Status 400 khi certificateId không hợp lệ', function () {
    pm.response.to.have.status(400);
});

pm.test('Message lỗi Invalid certificate ID', function () {
    var json = pm.response.json();
    var msg = Array.isArray(json.message) ? json.message.join(' | ') : json.message;
    pm.expect(msg).to.include('Invalid certificate ID');
});

// PM-CV-003 : Verify certificate by tokenId thành công
pm.test('Status 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Trả về dữ liệu xác thực theo token', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.eql(true);
    pm.expect(json.message).to.eql('Certificate verification completed');
    pm.expect(json.data).to.have.property('valid');
    pm.expect(json.data).to.have.property('message');
    pm.expect(json.data).to.have.property('certificate');
    pm.expect(json.data).to.have.property('blockchainVerification');
});

// PM-CV-004 : Verify tokenId rỗng/whitespace
pm.test('Status 400 khi tokenId rỗng hoặc whitespace', function () {
    pm.response.to.have.status(400);
});

pm.test('Message lỗi tokenId is required', function () {
    var json = pm.response.json();
    var msg = Array.isArray(json.message) ? json.message.join(' | ') : json.message;
    pm.expect(msg).to.include('tokenId is required');
});

// PM-CV-005 : Lookup certificates thành công theo filter
pm.test('Status 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Trả về danh sách items và total hợp lệ', function () {
    var json = pm.response.json();
    pm.expect(json.success).to.eql(true);
    pm.expect(json.message).to.eql('Certificates lookup completed');
    pm.expect(json.data.items).to.be.an('array');
    pm.expect(json.data.total).to.eql(json.data.items.length);
});

// PM-CV-006 : Lookup certificates không truyền filter
pm.test('Status 400 khi thiếu toàn bộ filter', function () {
    pm.response.to.have.status(400);
});

pm.test('Message lỗi yêu cầu ít nhất một filter', function () {
    var json = pm.response.json();
    var msg = Array.isArray(json.message) ? json.message.join(' | ') : json.message;
    pm.expect(msg).to.include('At least one filter');
});
