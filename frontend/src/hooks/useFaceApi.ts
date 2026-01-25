import { useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';

export const useFaceApi = () => {
  const [modelsLoaded, setModelsLoaded] = useState(false);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models'; // Đường dẫn tới thư mục public/models

      try {
        await Promise.all([
          // Model nhận diện khuôn mặt (nhẹ và nhanh)
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          // Model nhận diện khuôn mặt chính xác cao hơn (nếu cần)
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          // Model nhận diện 68 điểm trên khuôn mặt (mắt, mũi, miệng...)
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          // Model trích xuất đặc trưng khuôn mặt (để so sánh)
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
        console.log('FaceAPI models loaded successfully');
      } catch (error) {
        console.error('Error loading FaceAPI models:', error);
      }
    };

    loadModels();
  }, []);

  return { modelsLoaded };
};