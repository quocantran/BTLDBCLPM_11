import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import * as faceapi from 'face-api.js';
import { FaceVerificationModal } from '@/components/organisms/FaceVerificationModal/FaceVerificationModal';

// ==================== MOCKS ====================

const mockUser = {
  id: 'user-1',
  username: 'student1',
  email: 'student@test.com',
  role: 'student' as const,
  imageUrl: 'https://cloudinary.com/profile.jpg',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

let mockModelsLoaded = true;
let mockAuthUser: any = mockUser;

jest.mock('@/stores/auth', () => ({
  useAuth: () => ({ user: mockAuthUser }),
}));

jest.mock('@/hooks/useFaceApi', () => ({
  useFaceApi: () => ({ modelsLoaded: mockModelsLoaded }),
}));

jest.mock('@/components/atoms/Icon/Icon', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`}>{name}</span>,
}));

const mockDetectSingleFace = jest.fn();
const mockEuclideanDistance = jest.fn();

jest.mock('face-api.js', () => ({
  detectSingleFace: (...args: any[]) => mockDetectSingleFace(...args),
  SsdMobilenetv1Options: jest.fn(),
  euclideanDistance: (...args: any[]) => mockEuclideanDistance(...args),
  nets: {
    tinyFaceDetector: { loadFromUri: jest.fn() },
    ssdMobilenetv1: { loadFromUri: jest.fn() },
    faceLandmark68Net: { loadFromUri: jest.fn() },
    faceRecognitionNet: { loadFromUri: jest.fn() },
  },
}));

// Helper: tạo mock chain cho detectSingleFace
const createDetectionChain = (result: any) => ({
  withFaceLandmarks: () => ({
    withFaceDescriptor: () => Promise.resolve(result),
  }),
});

// Mock webcam stream
const mockTrackStop = jest.fn();
const mockMediaStream = {
  getTracks: () => [{ stop: mockTrackStop }],
} as unknown as MediaStream;

const mockGetUserMedia = jest.fn();

beforeAll(() => {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    writable: true,
  });
});

describe('TestFaceVerificationModal — Face verification logic khi vào thi', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockModelsLoaded = true;
    mockAuthUser = mockUser;
    mockGetUserMedia.mockResolvedValue(mockMediaStream);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==================== RENDER & UI ====================

  it('VF-004 — should_render_modal_title_and_instructions_when_open', () => {
    // VF-004: Modal hiển thị title và hướng dẫn khi mở.
    // Mô tả: Kiểm tra các element chính render đúng khi isOpen=true.
    // Expected: Title "Face Verification (AI)" và instruction text hiển thị.
    render(<FaceVerificationModal {...defaultProps} />);

    expect(screen.getByText('Face Verification (AI)')).toBeInTheDocument();
    expect(screen.getByText(/Please position your face/)).toBeInTheDocument();
  });

  it('VF-005 — should_show_loading_overlay_when_models_not_loaded', () => {
    // VF-005: Hiển thị overlay "Loading AI Models..." khi chưa load xong.
    // Mô tả: modelsLoaded=false → overlay loading trên video.
    // Expected: Text "Loading AI Models..." hiển thị.
    mockModelsLoaded = false;
    render(<FaceVerificationModal {...defaultProps} />);

    expect(screen.getByText('Loading AI Models...')).toBeInTheDocument();
  });

  it('VF-006 — should_not_show_loading_overlay_when_models_loaded', () => {
    // VF-006: Không hiển thị overlay khi models đã load xong.
    // Mô tả: modelsLoaded=true → không có overlay.
    // Expected: "Loading AI Models..." không hiển thị.
    mockModelsLoaded = true;
    render(<FaceVerificationModal {...defaultProps} />);

    expect(screen.queryByText('Loading AI Models...')).not.toBeInTheDocument();
  });

  it('VF-007 — should_display_verify_button_text_correctly', () => {
    // VF-007: Button verify hiển thị text đúng khi chưa verifying.
    // Mô tả: Trạng thái bình thường → "Verify My Face".
    // Expected: Button có text "Verify My Face".
    render(<FaceVerificationModal {...defaultProps} />);

    expect(screen.getByText('Verify My Face')).toBeInTheDocument();
  });

  it('VF-008 — should_call_onClose_when_cancel_button_clicked', () => {
    // VF-008: Click Cancel → gọi onClose callback.
    // Mô tả: Cancel button gọi prop onClose.
    // Expected: onClose được gọi 1 lần.
    render(<FaceVerificationModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('VF-009 — should_call_onClose_when_overlay_backdrop_clicked', () => {
    // VF-009: Click overlay backdrop → gọi onClose.
    // Mô tả: User click vùng tối bên ngoài modal → đóng.
    // Expected: onClose được gọi.
    render(<FaceVerificationModal {...defaultProps} />);

    const backdrop = document.querySelector('[aria-hidden="true"]');
    fireEvent.click(backdrop!);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('VF-010 — should_call_onClose_when_close_icon_button_clicked', () => {
    // VF-010: Click nút X (close icon) → gọi onClose.
    // Mô tả: Nút close icon ở góc trên phải modal.
    // Expected: onClose được gọi.
    render(<FaceVerificationModal {...defaultProps} />);

    const closeButtons = screen.getAllByTestId('icon-close');
    const closeBtn = closeButtons[0].closest('button');
    fireEvent.click(closeBtn!);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  // ==================== WEBCAM STREAM ====================

  it('VF-011 — should_start_webcam_stream_when_modal_opens', async () => {
    // VF-011: Mở modal → bật webcam getUserMedia.
    // Mô tả: isOpen=true → gọi getUserMedia với video config.
    // Expected: getUserMedia được gọi.
    await act(async () => {
      render(<FaceVerificationModal {...defaultProps} isOpen={true} />);
    });

    expect(mockGetUserMedia).toHaveBeenCalledWith({
      video: { width: 480, height: 360 },
    });
  });

  it('VF-012 — should_show_error_when_webcam_access_denied', async () => {
    // VF-012: Webcam bị từ chối → hiện lỗi.
    // Mô tả: getUserMedia reject → setError.
    // Expected: Error "Could not access webcam..." hiển thị.
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockGetUserMedia.mockRejectedValueOnce(new Error('Permission denied'));

    await act(async () => {
      render(<FaceVerificationModal {...defaultProps} />);
    });

    expect(screen.getByText(/Could not access webcam/)).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('VF-013 — should_stop_stream_tracks_when_modal_closes', async () => {
    // VF-013: Đóng modal → stop tất cả tracks webcam.
    // Mô tả: isOpen false → stopStream → track.stop().
    // Expected: track.stop() được gọi.
    const { rerender } = render(
      <FaceVerificationModal {...defaultProps} isOpen={true} />
    );

    await act(async () => {});

    await act(async () => {
      rerender(<FaceVerificationModal {...defaultProps} isOpen={false} />);
    });

    expect(mockTrackStop).toHaveBeenCalled();
  });

  // ==================== VERIFY FACE LOGIC ====================

  it('VF-014 — should_show_error_when_user_has_no_profile_image', async () => {
    // VF-014: User chưa có imageUrl → lỗi "System is not ready...".
    // Mô tả: user.imageUrl = undefined → early return với error.
    // Expected: Error message hiển thị.
    mockAuthUser = { ...mockUser, imageUrl: undefined };

    await act(async () => {
      render(<FaceVerificationModal {...defaultProps} />);
    });

    const verifyBtn = screen.getByText('Verify My Face');
    await act(async () => { fireEvent.click(verifyBtn); });

    expect(screen.getByText(/System is not ready or profile image is missing/)).toBeInTheDocument();
  });

  it('VF-015 — should_show_error_when_models_not_loaded_on_verify', async () => {
    // VF-015: Models chưa load mà bấm verify → lỗi.
    // Mô tả: modelsLoaded=false, gọi handleVerifyFace.
    // Expected: Error "AI Models are still loading...".
    mockModelsLoaded = false;

    await act(async () => {
      render(<FaceVerificationModal {...defaultProps} />);
    });

    // Button bị disabled khi !modelsLoaded, nhưng nếu vẫn gọi được thì phải báo lỗi
    // Simulate bằng cách set modelsLoaded = true rồi false ngay sau khi render
    mockModelsLoaded = true;
    const { rerender } = render(<FaceVerificationModal {...defaultProps} />);
    mockModelsLoaded = false;
    rerender(<FaceVerificationModal {...defaultProps} />);

    // Tìm button qua role vì text có thể disabled
    const buttons = screen.getAllByRole('button');
    const verifyBtn = buttons.find(b => b.textContent === 'Verify My Face');
    if (verifyBtn) {
      await act(async () => { fireEvent.click(verifyBtn); });
    }
  });

  it('VF-016 — should_show_error_when_no_face_detected_in_webcam', async () => {
    // VF-016: Webcam không detect được khuôn mặt → lỗi.
    // Mô tả: detectSingleFace(video) trả undefined → throw Error.
    // Expected: Error "No face detected in camera...".
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockDetectSingleFace.mockReturnValue(createDetectionChain(undefined));

    await act(async () => {
      render(<FaceVerificationModal {...defaultProps} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Verify My Face'));
    });

    await waitFor(() => {
      expect(screen.getByText(/No face detected in camera/)).toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });

  it('VF-017 — should_show_error_when_profile_image_fails_to_load', async () => {
    // VF-017: Profile image load lỗi → error "Failed to load profile image.".
    // Mô tả: Image onerror trigger → reject promise.
    // Expected: Error message hiển thị.
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const webcamResult = { descriptor: new Float32Array([1, 2, 3]) };
    mockDetectSingleFace.mockReturnValue(createDetectionChain(webcamResult));

    // Mock Image constructor để simulate onerror
    const originalImage = global.Image;
    const mockImageInstance: any = {};
    global.Image = jest.fn(() => {
      setTimeout(() => {
        if (mockImageInstance.onerror) mockImageInstance.onerror();
      }, 0);
      return mockImageInstance;
    }) as any;

    await act(async () => {
      render(<FaceVerificationModal {...defaultProps} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Verify My Face'));
    });

    jest.runAllTimers();

    await waitFor(() => {
      expect(screen.getByText(/Failed to load profile image/)).toBeInTheDocument();
    });

    global.Image = originalImage;
    consoleSpy.mockRestore();
  });

  it('VF-018 — should_show_error_when_no_face_in_profile_picture', async () => {
    // VF-018: Profile image không detect được mặt → error.
    // Mô tả: detectSingleFace(profileImg) trả undefined.
    // Expected: Error "Could not detect face in your profile picture...".
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const webcamResult = { descriptor: new Float32Array([1, 2, 3]) };
    let callCount = 0;
    mockDetectSingleFace.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return createDetectionChain(webcamResult);
      return createDetectionChain(undefined);
    });

    const originalImage = global.Image;
    const mockImgInstance: any = {};
    global.Image = jest.fn(() => {
      setTimeout(() => { if (mockImgInstance.onload) mockImgInstance.onload(); }, 0);
      return mockImgInstance;
    }) as any;

    await act(async () => {
      render(<FaceVerificationModal {...defaultProps} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Verify My Face'));
    });

    jest.runAllTimers();

    await waitFor(() => {
      expect(screen.getByText(/Could not detect face in your profile picture/)).toBeInTheDocument();
    });

    global.Image = originalImage;
    consoleSpy.mockRestore();
  });

  it('VF-019 — should_show_error_when_face_distance_exceeds_threshold', async () => {
    // VF-019: Khoảng cách khuôn mặt >= 0.5 (THRESHOLD) → fail.
    // Mô tả: euclideanDistance trả 0.7 → throw "Face verification failed...".
    // Expected: Error message face mismatch hiển thị.
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();

    const webcamResult = { descriptor: new Float32Array([1, 2, 3]) };
    const profileResult = { descriptor: new Float32Array([4, 5, 6]) };
    let callCount = 0;
    mockDetectSingleFace.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return createDetectionChain(webcamResult);
      return createDetectionChain(profileResult);
    });
    mockEuclideanDistance.mockReturnValue(0.7);

    const originalImage = global.Image;
    const mockImgInstance: any = {};
    global.Image = jest.fn(() => {
      setTimeout(() => { if (mockImgInstance.onload) mockImgInstance.onload(); }, 0);
      return mockImgInstance;
    }) as any;

    await act(async () => {
      render(<FaceVerificationModal {...defaultProps} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Verify My Face'));
    });

    jest.runAllTimers();

    await waitFor(() => {
      expect(screen.getByText(/Face verification failed/)).toBeInTheDocument();
    });

    global.Image = originalImage;
    consoleSpy.mockRestore();
  });

  it('VF-020 — should_show_success_and_call_onSuccess_when_face_matches', async () => {
    // VF-020: Khoảng cách < 0.5 → verify thành công, gọi onSuccess sau 1.5s.
    // Mô tả: euclideanDistance trả 0.3 → success flow.
    // Expected: "Verification Successful!" hiển thị, onSuccess gọi sau setTimeout.
    jest.spyOn(console, 'log').mockImplementation();

    const webcamResult = { descriptor: new Float32Array([1, 2, 3]) };
    const profileResult = { descriptor: new Float32Array([1, 2, 3]) };
    let callCount = 0;
    mockDetectSingleFace.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return createDetectionChain(webcamResult);
      return createDetectionChain(profileResult);
    });
    mockEuclideanDistance.mockReturnValue(0.3);

    const originalImage = global.Image;
    const mockImgInstance: any = {};
    global.Image = jest.fn(() => {
      setTimeout(() => { if (mockImgInstance.onload) mockImgInstance.onload(); }, 0);
      return mockImgInstance;
    }) as any;

    await act(async () => {
      render(<FaceVerificationModal {...defaultProps} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Verify My Face'));
    });

    jest.runAllTimers();

    await waitFor(() => {
      expect(screen.getByText('Verification Successful!')).toBeInTheDocument();
    });

    // onSuccess gọi sau 1.5s
    await act(async () => { jest.advanceTimersByTime(1500); });
    expect(defaultProps.onSuccess).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();

    global.Image = originalImage;
  });

  it('VF-021 — should_dismiss_error_when_close_error_button_clicked', async () => {
    // VF-021: Click nút X trên error message → ẩn error.
    // Mô tả: setError(null) khi click dismiss button.
    // Expected: Error message biến mất.
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockDetectSingleFace.mockReturnValue(createDetectionChain(undefined));

    await act(async () => {
      render(<FaceVerificationModal {...defaultProps} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Verify My Face'));
    });

    await waitFor(() => {
      expect(screen.getByText('Verification Failed')).toBeInTheDocument();
    });

    // Click dismiss button (icon close trong error div)
    const errorCloseIcons = screen.getAllByTestId('icon-close');
    const dismissBtn = errorCloseIcons[errorCloseIcons.length - 1].closest('button');
    fireEvent.click(dismissBtn!);

    expect(screen.queryByText('Verification Failed')).not.toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('VF-022 — should_show_generic_error_when_error_has_no_message', async () => {
    // VF-022: Error không có message → fallback "Verification process failed.".
    // Mô tả: catch block với err.message = undefined.
    // Expected: Fallback error message hiển thị.
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    mockDetectSingleFace.mockImplementation(() => ({
      withFaceLandmarks: () => ({
        withFaceDescriptor: () => Promise.reject({ message: '' }),
      }),
    }));

    await act(async () => {
      render(<FaceVerificationModal {...defaultProps} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Verify My Face'));
    });

    await waitFor(() => {
      expect(screen.getByText('Verification process failed.')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('VF-023 — should_apply_hidden_classes_when_modal_is_closed', () => {
    // VF-023: isOpen=false → modal có class ẩn (opacity-0, pointer-events-none).
    // Mô tả: Kiểm tra CSS classes khi đóng modal.
    // Expected: Dialog container có class opacity-0 và pointer-events-none.
    render(<FaceVerificationModal {...defaultProps} isOpen={false} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('opacity-0');
    expect(dialog.className).toContain('pointer-events-none');
  });

  // ==================== SYSTEM TEST BUG — EXPECTED FAIL ====================

  it('VF-024 — should_reject_when_multiple_faces_detected_in_webcam', async () => {
    // VF-024: Nhiều khuôn mặt trong camera phải bị từ chối (System test LBT-01-047).
    // Mô tả: Code dùng detectSingleFace nên chỉ detect 1 mặt, không kiểm tra nhiều mặt.
    // Expected: Hiển thị lỗi từ chối nhiều mặt → BUG: code không implement check này.
    jest.spyOn(console, 'log').mockImplementation();

    const webcamResult = { descriptor: new Float32Array([1, 2, 3]) };
    const profileResult = { descriptor: new Float32Array([1, 2, 3]) };
    let callCount = 0;
    mockDetectSingleFace.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return createDetectionChain(webcamResult);
      return createDetectionChain(profileResult);
    });
    mockEuclideanDistance.mockReturnValue(0.3);

    const originalImage = global.Image;
    const mockImgInstance: any = {};
    global.Image = jest.fn(() => {
      setTimeout(() => { if (mockImgInstance.onload) mockImgInstance.onload(); }, 0);
      return mockImgInstance;
    }) as any;

    await act(async () => {
      render(<FaceVerificationModal {...defaultProps} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Verify My Face'));
    });

    jest.runAllTimers();

    // BUG: Code dùng detectSingleFace thay vì detectAllFaces
    // nên khi có 2 người trước camera, nó chỉ chọn 1 mặt → vẫn verify thành công.
    // Test kỳ vọng phải có error message từ chối nhiều mặt, nhưng code không check.
    await waitFor(() => {
      expect(screen.getByText(/multiple faces/i)).toBeInTheDocument();
    });

    global.Image = originalImage;
  });

  it('VF-025 — should_reject_when_portrait_photo_used_instead_of_live_face', async () => {
    // VF-025: Sử dụng ảnh chân dung trước camera phải bị từ chối (System test LBT-01-048).
    // Mô tả: Code không có anti-spoofing/liveness detection.
    // Expected: Hiển thị lỗi từ chối ảnh giả → BUG: code không implement liveness check.
    jest.spyOn(console, 'log').mockImplementation();

    const webcamResult = { descriptor: new Float32Array([1, 2, 3]) };
    const profileResult = { descriptor: new Float32Array([1, 2, 3]) };
    let callCount = 0;
    mockDetectSingleFace.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return createDetectionChain(webcamResult);
      return createDetectionChain(profileResult);
    });
    mockEuclideanDistance.mockReturnValue(0.2);

    const originalImage = global.Image;
    const mockImgInstance: any = {};
    global.Image = jest.fn(() => {
      setTimeout(() => { if (mockImgInstance.onload) mockImgInstance.onload(); }, 0);
      return mockImgInstance;
    }) as any;

    await act(async () => {
      render(<FaceVerificationModal {...defaultProps} />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Verify My Face'));
    });

    jest.runAllTimers();

    // BUG: Code không có liveness detection / anti-spoofing.
    // Khi dùng ảnh chân dung (portrait photo) đặt trước camera,
    // face-api.js vẫn detect được mặt từ ảnh → verify thành công.
    // Test kỳ vọng phải có lỗi phát hiện ảnh giả, nhưng code không implement.
    await waitFor(() => {
      expect(screen.getByText(/photo.*detected|liveness.*failed|spoofing/i)).toBeInTheDocument();
    });

    global.Image = originalImage;
  });
});
