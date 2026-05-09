import { renderHook, waitFor } from '@testing-library/react';
import * as faceapi from 'face-api.js';
import { useFaceApi } from '@/hooks/useFaceApi';

jest.mock('face-api.js', () => ({
  nets: {
    tinyFaceDetector: { loadFromUri: jest.fn() },
    ssdMobilenetv1: { loadFromUri: jest.fn() },
    faceLandmark68Net: { loadFromUri: jest.fn() },
    faceRecognitionNet: { loadFromUri: jest.fn() },
  },
}));

describe('TestUseFaceApi — useFaceApi hook', () => {
  beforeEach(() => jest.clearAllMocks());

  it('VF-001 — should_initialize_with_modelsLoaded_false', () => {
    // VF-001: Hook khởi tạo với modelsLoaded = false.
    // Mô tả: Khi hook render lần đầu, AI models chưa load xong.
    // Expected: modelsLoaded = false ban đầu.
    (faceapi.nets.tinyFaceDetector.loadFromUri as jest.Mock).mockReturnValue(new Promise(() => {}));
    (faceapi.nets.ssdMobilenetv1.loadFromUri as jest.Mock).mockReturnValue(new Promise(() => {}));
    (faceapi.nets.faceLandmark68Net.loadFromUri as jest.Mock).mockReturnValue(new Promise(() => {}));
    (faceapi.nets.faceRecognitionNet.loadFromUri as jest.Mock).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useFaceApi());

    expect(result.current.modelsLoaded).toBe(false);
  });

  it('VF-002 — should_set_modelsLoaded_true_when_all_models_load_successfully', async () => {
    // VF-002: Tất cả models load thành công → modelsLoaded = true.
    // Mô tả: Promise.all resolve → setModelsLoaded(true).
    // Expected: modelsLoaded = true sau khi load xong.
    (faceapi.nets.tinyFaceDetector.loadFromUri as jest.Mock).mockResolvedValue(undefined);
    (faceapi.nets.ssdMobilenetv1.loadFromUri as jest.Mock).mockResolvedValue(undefined);
    (faceapi.nets.faceLandmark68Net.loadFromUri as jest.Mock).mockResolvedValue(undefined);
    (faceapi.nets.faceRecognitionNet.loadFromUri as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useFaceApi());

    await waitFor(() => {
      expect(result.current.modelsLoaded).toBe(true);
    });
  });

  it('VF-003 — should_keep_modelsLoaded_false_when_model_loading_fails', async () => {
    // VF-003: Load models thất bại → modelsLoaded vẫn = false.
    // Mô tả: Một trong các model reject → catch block, không setModelsLoaded(true).
    // Expected: modelsLoaded = false.
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    (faceapi.nets.tinyFaceDetector.loadFromUri as jest.Mock).mockRejectedValue(new Error('Network error'));
    (faceapi.nets.ssdMobilenetv1.loadFromUri as jest.Mock).mockResolvedValue(undefined);
    (faceapi.nets.faceLandmark68Net.loadFromUri as jest.Mock).mockResolvedValue(undefined);
    (faceapi.nets.faceRecognitionNet.loadFromUri as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useFaceApi());

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error loading FaceAPI models:', expect.any(Error));
    });
    expect(result.current.modelsLoaded).toBe(false);
    consoleSpy.mockRestore();
  });
});
