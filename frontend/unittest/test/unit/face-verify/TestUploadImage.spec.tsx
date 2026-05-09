import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import * as faceapi from 'face-api.js';

// ==================== MOCKS ====================

let mockModelsLoaded = true;
const mockSetUser = jest.fn();

jest.mock('@/stores/auth', () => ({
  useAuth: () => ({ setUser: mockSetUser }),
}));

jest.mock('@/hooks/useFaceApi', () => ({
  useFaceApi: () => ({ modelsLoaded: mockModelsLoaded }),
}));

const mockUpdateProfile = jest.fn();
jest.mock('@/services', () => ({
  updateProfile: (...args: any[]) => mockUpdateProfile(...args),
}));

const mockDetectAllFaces = jest.fn();
jest.mock('face-api.js', () => ({
  detectAllFaces: (...args: any[]) => mockDetectAllFaces(...args),
  SsdMobilenetv1Options: jest.fn(),
  nets: {
    tinyFaceDetector: { loadFromUri: jest.fn() },
    ssdMobilenetv1: { loadFromUri: jest.fn() },
    faceLandmark68Net: { loadFromUri: jest.fn() },
    faceRecognitionNet: { loadFromUri: jest.fn() },
  },
}));

// Mock antd
const mockMessageApiError = jest.fn();
const mockMessageApiWarning = jest.fn();
const mockMessageApiSuccess = jest.fn();
const mockMessageGlobalSuccess = jest.fn();
const mockMessageGlobalError = jest.fn();
const mockMessageGlobalWarning = jest.fn();

jest.mock('antd', () => {
  const React = require('react');
  return {
    Modal: ({ open, children, onCancel, title, footer }: any) => {
      if (!open) return null;
      return React.createElement('div', { 'data-testid': 'modal', role: 'dialog' },
        React.createElement('div', { 'data-testid': 'modal-title' }, title),
        children,
        footer
      );
    },
    Button: ({ children, onClick, disabled, loading, type, size, ...rest }: any) =>
      React.createElement('button', {
        onClick: disabled || loading ? undefined : onClick,
        disabled: disabled || loading,
        ...rest
      }, children),
    message: {
      success: (...args: any[]) => mockMessageGlobalSuccess(...args),
      error: (...args: any[]) => mockMessageGlobalError(...args),
      warning: (...args: any[]) => mockMessageGlobalWarning(...args),
      useMessage: () => [
        { error: mockMessageApiError, warning: mockMessageApiWarning, success: mockMessageApiSuccess },
        React.createElement('div', { key: 'ctx' }),
      ],
    },
    Image: ({ src, alt }: any) => React.createElement('img', { src, alt }),
  };
});

// Capture onChange callback từ component UploadImage
let capturedUploadOnChange: Function | null = null;

jest.mock('@/components/molecules', () => {
  const React = require('react');
  return {
    ImageUploadArea: ({ uploadProps }: any) => {
      capturedUploadOnChange = uploadProps?.onChange || null;
      return React.createElement('div', { 'data-testid': 'upload-area' },
        React.createElement('button', {
          'data-testid': 'mock-select-file',
        }, 'Select File')
      );
    },
  };
});

jest.mock('./upload-image.css', () => ({}), { virtual: true });

// Mock FileReader vì jsdom không hỗ trợ readAsDataURL
const mockFileReaderInstance = {
  readAsDataURL: jest.fn(),
  result: 'data:image/jpeg;base64,/9j/fake',
  onload: null as any,
  onerror: null as any,
};
global.FileReader = jest.fn(() => {
  const instance = { ...mockFileReaderInstance };
  instance.readAsDataURL = jest.fn(() => {
    Promise.resolve().then(() => { if (instance.onload) instance.onload(); });
  });
  return instance;
}) as any;

// Helper: tạo detection chain cho detectAllFaces
const createDetectAllChain = (results: any[]) => ({
  withFaceLandmarks: () => ({
    withFaceDescriptors: () => Promise.resolve(results),
  }),
});

// Helper: simulate file selection qua capturedUploadOnChange
const simulateFileSelect = (overrides: any = {}) => {
  const mockFile = {
    uid: 'test-uid-1',
    name: 'photo.jpg',
    originFileObj: new File(['fake'], 'photo.jpg', { type: 'image/jpeg' }),
    type: 'image/jpeg',
    size: 100 * 1024,
    ...overrides,
  };
  if (capturedUploadOnChange) {
    capturedUploadOnChange({ fileList: [mockFile] });
  }
  return mockFile;
};

// Dynamic import
let UploadImage: any;

beforeAll(async () => {
  const mod = await import('@/app/(privateLayout)/profile/UploadImage');
  UploadImage = mod.default;
});

describe('TestUploadImage — Avatar upload with face validation', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onUploadSuccess: jest.fn(),
    currentImageUrl: 'https://cloudinary.com/current.jpg',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockModelsLoaded = true;
    capturedUploadOnChange = null;
    global.fetch = jest.fn() as any;

    // Mock document.createElement cho 'img' — auto-fire onload
    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'img') {
        const originalSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
        Object.defineProperty(el, 'src', {
          set(val: string) {
            originalSrcDescriptor?.set?.call(el, val);
            setTimeout(() => { if ((el as any).onload) (el as any).onload(); }, 10);
          },
          get() { return originalSrcDescriptor?.get?.call(el) || ''; },
        });
        Object.defineProperty(el, 'width', { value: 300, writable: true });
      }
      return el;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ==================== RENDER ====================

  it('VF-026 — should_render_upload_modal_when_open', () => {
    // VF-026: Modal hiển thị khi isOpen=true.
    // Mô tả: Render UploadImage với isOpen=true.
    // Expected: Modal render thành công với title "Upload Avatar".
    render(<UploadImage {...defaultProps} />);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Upload Avatar')).toBeInTheDocument();
  });

  it('VF-027 — should_not_render_modal_when_closed', () => {
    // VF-027: Modal không hiển thị khi isOpen=false.
    // Mô tả: Render UploadImage với isOpen=false.
    // Expected: Modal không render.
    render(<UploadImage {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  // ==================== BUTTON STATE ====================

  it('VF-028 — should_disable_upload_button_when_models_not_loaded', () => {
    // VF-028: Models chưa load → Upload button disabled.
    // Mô tả: modelsLoaded=false → disabled={!modelsLoaded || fileList.length===0}.
    // Expected: Button Upload bị disabled.
    mockModelsLoaded = false;
    render(<UploadImage {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    const uploadBtn = buttons.find(b => b.textContent?.includes('Upload'));
    expect(uploadBtn).toBeDefined();
    expect(uploadBtn?.disabled).toBe(true);
  });

  it('VF-029 — should_disable_upload_button_when_no_file_selected', () => {
    // VF-029: Chưa chọn file → Upload button disabled.
    // Mô tả: fileList.length === 0 → disabled.
    // Expected: Upload button bị disabled.
    render(<UploadImage {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    const uploadBtn = buttons.find(b => b.textContent?.includes('Upload'));
    expect(uploadBtn?.disabled).toBe(true);
  });

  it('VF-030 — should_disable_upload_button_when_both_no_file_and_models_loading', () => {
    // VF-030: Chưa chọn file VÀ models chưa load → disabled.
    // Mô tả: disabled={fileList.length === 0 || !modelsLoaded}.
    // Expected: Button disabled.
    mockModelsLoaded = false;
    render(<UploadImage {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    const uploadBtn = buttons.find(b => b.textContent?.includes('Upload'));
    expect(uploadBtn?.disabled).toBe(true);
  });

  // ==================== FACE VALIDATION ====================

  it('VF-031 — should_reject_when_no_face_detected_in_uploaded_image', async () => {
    // VF-031: Ảnh upload không có khuôn mặt → reject.
    // Mô tả: detectAllFaces trả mảng rỗng → "No face detected...".
    // Expected: messageApi.error gọi với thông báo không phát hiện mặt.
    jest.spyOn(console, 'log').mockImplementation();
    mockDetectAllFaces.mockReturnValue(createDetectAllChain([]));

    render(<UploadImage {...defaultProps} />);
    await act(async () => { simulateFileSelect(); });

    const uploadBtn = screen.getByText('Upload');
    await act(async () => { fireEvent.click(uploadBtn); });

    await waitFor(() => {
      expect(mockMessageApiError).toHaveBeenCalledWith(
        'No face detected. Please use a clear portrait photo.'
      );
    });
  });

  it('VF-032 — should_reject_when_multiple_faces_in_uploaded_image', async () => {
    // VF-032: Ảnh upload có nhiều mặt → reject.
    // Mô tả: detectAllFaces trả 2 detection results → "Multiple faces detected...".
    // Expected: messageApi.error gọi với thông báo nhiều mặt.
    jest.spyOn(console, 'log').mockImplementation();
    const face1 = { detection: { score: 0.9, box: { x: 0, y: 0, width: 100, height: 100 } } };
    const face2 = { detection: { score: 0.9, box: { x: 200, y: 0, width: 100, height: 100 } } };
    mockDetectAllFaces.mockReturnValue(createDetectAllChain([face1, face2]));

    render(<UploadImage {...defaultProps} />);
    await act(async () => { simulateFileSelect(); });

    const uploadBtn = screen.getByText('Upload');
    await act(async () => { fireEvent.click(uploadBtn); });

    await waitFor(() => {
      expect(mockMessageApiError).toHaveBeenCalledWith(
        'Multiple faces detected. Please use a photo with only yourself.'
      );
    });
  });

  it('VF-033 — should_reject_when_face_detection_score_below_threshold', async () => {
    // VF-033: Detection score < 0.8 → reject.
    // Mô tả: Face detection score = 0.5 → "Face is not clear enough...".
    // Expected: messageApi.error gọi với thông báo ảnh không rõ.
    jest.spyOn(console, 'log').mockImplementation();
    const lowScoreFace = { detection: { score: 0.5, box: { x: 50, y: 0, width: 200, height: 200 } } };
    mockDetectAllFaces.mockReturnValue(createDetectAllChain([lowScoreFace]));

    render(<UploadImage {...defaultProps} />);
    await act(async () => { simulateFileSelect(); });

    const uploadBtn = screen.getByText('Upload');
    await act(async () => { fireEvent.click(uploadBtn); });

    await waitFor(() => {
      expect(mockMessageApiError).toHaveBeenCalledWith(
        'Face is not clear enough. Please improve lighting or focus.'
      );
    });
  });

  it('VF-034 — should_handle_face_validation_exception_gracefully', async () => {
    // VF-034: Face validation throw exception → catch block.
    // Mô tả: detectAllFaces throw Error → "Error analyzing image...".
    // Expected: messageApi.error gọi với thông báo lỗi phân tích ảnh.
    jest.spyOn(console, 'error').mockImplementation();
    mockDetectAllFaces.mockImplementation(() => { throw new Error('Canvas error'); });

    render(<UploadImage {...defaultProps} />);
    await act(async () => { simulateFileSelect(); });

    const uploadBtn = screen.getByText('Upload');
    await act(async () => { fireEvent.click(uploadBtn); });

    await waitFor(() => {
      expect(mockMessageApiError).toHaveBeenCalledWith(
        'Error analyzing image. Please try another photo.'
      );
    });
  });

  // ==================== CANCEL & UI ====================

  it('VF-035 — should_call_onClose_on_cancel', () => {
    // VF-035: Click Cancel → gọi onClose, reset fileList.
    // Mô tả: handleCancel → setFileList([]) + onClose().
    // Expected: onClose callback được gọi.
    render(<UploadImage {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('VF-036 — should_show_upload_area_component', () => {
    // VF-036: ImageUploadArea component hiển thị bên trong modal.
    // Mô tả: Kiểm tra upload area render đúng.
    // Expected: upload-area data-testid hiển thị.
    render(<UploadImage {...defaultProps} />);
    expect(screen.getByTestId('upload-area')).toBeInTheDocument();
  });
});
