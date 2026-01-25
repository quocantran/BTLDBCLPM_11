declare module 'face-api.js' {
  export interface Box {
    x: number
    y: number
    width: number
    height: number
  }

  export interface FaceDetection {
    score: number
    box: Box
  }

  export interface FaceExpressions {
    neutral: number
    happy: number
    sad: number
    angry: number
    fearful: number
    disgusted: number
    surprised: number
  }

  export interface FaceLandmarks68 {
    positions: Point[]
    shift(x: number, y: number): FaceLandmarks68
  }

  export interface Point {
    x: number
    y: number
  }

  export interface WithFaceDescriptor<T> {
    descriptor: Float32Array
    detection: FaceDetection
  }

  export interface WithFaceLandmarks<T> {
    landmarks: FaceLandmarks68
    unshiftedLandmarks: FaceLandmarks68
    alignedRect: FaceDetection
    detection: FaceDetection
  }

  export interface WithFaceExpressions<T> {
    expressions: FaceExpressions
    detection: FaceDetection
  }

  // Options classes
  export class SsdMobilenetv1Options {
    constructor(options?: { minConfidence?: number; maxResults?: number })
  }

  export class TinyFaceDetectorOptions {
    constructor(options?: { inputSize?: number; scoreThreshold?: number })
  }

  // Neural network models
  export const nets: {
    ssdMobilenetv1: {
      loadFromUri(uri: string): Promise<void>
      loadFromDisk(path: string): Promise<void>
    }
    tinyFaceDetector: {
      loadFromUri(uri: string): Promise<void>
      loadFromDisk(path: string): Promise<void>
    }
    faceLandmark68Net: {
      loadFromUri(uri: string): Promise<void>
      loadFromDisk(path: string): Promise<void>
    }
    faceLandmark68TinyNet: {
      loadFromUri(uri: string): Promise<void>
      loadFromDisk(path: string): Promise<void>
    }
    faceRecognitionNet: {
      loadFromUri(uri: string): Promise<void>
      loadFromDisk(path: string): Promise<void>
    }
    faceExpressionNet: {
      loadFromUri(uri: string): Promise<void>
      loadFromDisk(path: string): Promise<void>
    }
  }

  type DetectionInput = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement

  // Detection functions
  export function detectSingleFace(
    input: DetectionInput,
    options?: SsdMobilenetv1Options | TinyFaceDetectorOptions
  ): {
    withFaceLandmarks(): {
      withFaceDescriptor(): Promise<
        (WithFaceDescriptor<FaceDetection> & WithFaceLandmarks<FaceDetection>) | undefined
      >
    }
  }

  export function detectAllFaces(
    input: DetectionInput,
    options?: SsdMobilenetv1Options | TinyFaceDetectorOptions
  ): {
    withFaceLandmarks(): {
      withFaceDescriptors(): Promise<
        (WithFaceDescriptor<FaceDetection> & WithFaceLandmarks<FaceDetection>)[]
      >
    }
  }

  // Utility functions
  export function euclideanDistance(arr1: number[] | Float32Array, arr2: number[] | Float32Array): number
  export function loadFaceLandmarkModel(uri: string): Promise<void>
  export function loadFaceRecognitionModel(uri: string): Promise<void>
  export function loadSsdMobilenetv1Model(uri: string): Promise<void>
}
