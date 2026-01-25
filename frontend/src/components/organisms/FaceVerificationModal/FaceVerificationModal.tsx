'use client';

import { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import * as faceapi from 'face-api.js';
import { useAuth } from '@/stores/auth';
import { useFaceApi } from '@/hooks/useFaceApi';

interface FaceVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const FaceVerificationModal = ({
  isOpen,
  onClose,
  onSuccess,
}: FaceVerificationModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Không cần canvasRef để vẽ ảnh nữa vì face-api đọc trực tiếp từ video
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const { user } = useAuth();
  const { modelsLoaded } = useFaceApi();

  // Effect để Bật/Tắt webcam
  useEffect(() => {
    let currentStream: MediaStream | null = null;

    const startStream = async () => {
      setError(null);
      setIsSuccess(false);
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 480, height: 360 }, // Kích thước vừa phải để tối ưu hiệu năng
        });
        currentStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('Error accessing webcam:', err);
        setError(
          'Could not access webcam. Please check permissions and try again.'
        );
      }
    };

    const stopStream = () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
      setStream(null);
    };

    if (isOpen) {
      startStream();
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen]);

  // Hàm xử lý xác thực Local bằng face-api.js
  const handleVerifyFace = async () => {
    if (!videoRef.current || !user?.imageUrl) {
      setError('System is not ready or profile image is missing.');
      return;
    }

    if (!modelsLoaded) {
      setError('AI Models are still loading... Please wait a moment.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // 1. Phát hiện khuôn mặt từ WEBCAM
      // Sử dụng SsdMobilenetv1 cho độ chính xác cao
      const webcamDetection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!webcamDetection) {
        throw new Error('No face detected in camera. Please adjust your position.');
      }

      // 2. Phát hiện khuôn mặt từ ẢNH PROFILE
      // Cần tạo HTMLImageElement và set crossOrigin để tránh lỗi CORS với Cloudinary
      const profileImg = new Image();
      profileImg.crossOrigin = 'anonymous';
      profileImg.src = user.imageUrl;

      // Đợi ảnh load xong
      await new Promise((resolve, reject) => {
        profileImg.onload = resolve;
        profileImg.onerror = () => reject(new Error('Failed to load profile image.'));
      });

      const profileDetection = await faceapi
        .detectSingleFace(profileImg, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!profileDetection) {
        // Trường hợp hiếm vì mình đã validate lúc upload, nhưng vẫn cần check
        throw new Error(
          'Could not detect face in your profile picture. Please update your profile.'
        );
      }

      // 3. SO SÁNH 2 KHUÔN MẶT (Euclidean Distance)
      const distance = faceapi.euclideanDistance(
        webcamDetection.descriptor,
        profileDetection.descriptor
      );

      console.log('Face Match Distance:', distance); // Log để debug (thấp hơn là giống hơn)

      // Ngưỡng (Threshold): Thường là 0.6. 
      // Với bài thi cần bảo mật cao, có thể set 0.5 hoặc 0.45
      const THRESHOLD = 0.5;

      if (distance < THRESHOLD) {
        // --- THÀNH CÔNG ---
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          onClose();
          onSuccess(); // Chuyển trang
        }, 1500); // Đợi 1.5s để user thấy thông báo success
      } else {
        // --- THẤT BẠI ---
        throw new Error('Face verification failed. You do not match the profile picture.');
      }

    } catch (err: any) {
      console.error('Verification Error:', err);
      setError(err.message || 'Verification process failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        role="dialog"
        aria-modal="true"
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all ${
          isOpen
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg m-4 transform">
          <div className="p-8">
            <div className="flex items-start justify-between">
              <h2 className="text-2xl font-bold text-[var(--dark-text)]">
                Face Verification (AI)
              </h2>
              <button
                onClick={onClose}
                className="text-[var(--medium-text)] hover:text-[var(--dark-text)] p-1 rounded-full hover:bg-gray-100"
                disabled={isVerifying}
              >
                <Icon
                  name="close"
                  className="text-[var(--medium-text)]"
                  size="medium"
                />
              </button>
            </div>
            <p className="mt-2 text-base text-[var(--medium-text)]">
              Please position your face in the center of the camera and press verify.
            </p>

            {/* Video Feed */}
            <div className="mt-6 w-full aspect-video bg-gray-200 rounded-md overflow-hidden border border-gray-300 relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Hiển thị trạng thái loading model trên video nếu chưa load xong */}
              {!modelsLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                  Loading AI Models...
                </div>
              )}
            </div>

            {/* Hiển thị thông báo thành công */}
            {isSuccess && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Icon
                    name="check"
                    className="text-green-600"
                    size="medium"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    Verification Successful!
                  </p>
                  <p className="text-xs text-green-600">
                    Redirecting to exam...
                  </p>
                </div>
              </div>
            )}

            {/* Hiển thị lỗi */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Icon
                    name="failed"
                    className="text-red-600"
                    size="medium"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800">
                    Verification Failed
                  </p>
                  <p className="text-xs text-red-600 mt-1">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="flex-shrink-0 text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-100 transition-colors"
                >
                  <Icon name="close" className="text-red-400" size="medium" />
                </button>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="bg-gray-50 px-8 py-4 flex justify-end gap-3 rounded-b-lg">
            <button
              onClick={onClose}
              className="btn-secondary px-6 py-2 text-sm font-semibold rounded-md shadow-sm"
              disabled={isVerifying || isSuccess}
            >
              Cancel
            </button>
            <button
              onClick={handleVerifyFace}
              className="btn-primary px-6 py-2 text-sm font-semibold rounded-md shadow-sm disabled:opacity-50"
              disabled={isVerifying || !stream || isSuccess || !modelsLoaded}
            >
              {isVerifying ? 'Verifying...' : 'Verify My Face'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};