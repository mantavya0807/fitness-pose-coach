// src/pages/CameraViewPage.js
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import useAuthStore from '../store/authStore';

// Import the rep counter directly with default import
import detectExerciseRep from '../utils/repCounter';

// Fetch exercise details
const fetchExerciseData = async (exerciseId) => {
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('*, exercise_details(*)')
      .eq('id', exerciseId)
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching exercise:", error);
    return { id: exerciseId, name: 'Exercise', type: 'strength' };
  }
};

const CameraViewPage = () => {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const user = useAuthStore((state) => state.user);
  const repStateRef = useRef({
    state: 'down',  // Start with a valid state
    repCount: 0,
    debug: '',
    confidence: 0,
    previousState: 'down',
    formFeedback: '',
    formScore: 0,
    holdTime: 0
  });
  // Debug state
  const [debugInfo, setDebugInfo] = useState('No debug info yet');
  
  // TensorFlow and pose detector refs
  const tfRef = useRef(null);
  const poseDetectionRef = useRef(null);
  const detectorRef = useRef(null);
  const processingRef = useRef(false);
  const detectionLoopActive = useRef(false);
  
  // State
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [repCount, setRepCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [detectionQuality, setDetectionQuality] = useState('medium');
  const [currentPose, setCurrentPose] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAIEnabled, setIsAIEnabled] = useState(true);
  const [exerciseState, setExerciseState] = useState('');
  const [feedback, setFeedback] = useState('');
  const [workoutSaved, setWorkoutSaved] = useState(false);
  const [formFeedback, setFormFeedback] = useState('');
  const [formScore, setFormScore] = useState(0);
  const [holdTime, setHoldTime] = useState(0);
  const [isTimedExercise, setIsTimedExercise] = useState(false);
  
  // Rep counter state
  const [repCounterState, setRepCounterState] = useState({
    state: '',
    repCount: 0,
    debug: '',
    confidence: 0,
    formFeedback: '',
    formScore: 0,
    holdTime: 0
  });
  
  // Fetch exercise data
  const { data: exercise, isLoading, error } = useQuery({
    queryKey: ['exercise', exerciseId],
    queryFn: () => fetchExerciseData(exerciseId),
    enabled: !!exerciseId,
  });

  // Load TensorFlow and PoseDetection libraries dynamically
  const loadLibraries = async () => {
    try {
      setIsLibraryLoading(true);
      setErrorMessage('');
      setDebugInfo('Loading TensorFlow.js libraries...');
      
      // Import libraries
      const tf = await import('@tensorflow/tfjs-core');
      setDebugInfo('TensorFlow core loaded, loading WebGL backend...');
      await import('@tensorflow/tfjs-backend-webgl');
      setDebugInfo('WebGL backend loaded, loading pose detection...');
      const poseDetection = await import('@tensorflow-models/pose-detection');
      setDebugInfo('Pose detection model loaded!');
      
      tfRef.current = tf;
      poseDetectionRef.current = poseDetection;
      
      // Initialize TensorFlow.js
      setDebugInfo('Initializing TensorFlow.js...');
      await tf.ready();
      setDebugInfo(`TensorFlow ready with backend: ${tf.getBackend()}`);
      
      // Initialize the detector
      await initializeDetector();
      
      setIsLibraryLoading(false);
    } catch (error) {
      console.error('Error loading libraries:', error);
      setErrorMessage(`Failed to load libraries: ${error.message}`);
      setDebugInfo(`Library loading error: ${error.message}`);
      setIsLibraryLoading(false);
      setIsAIEnabled(false);
    }
  };
  
  // Initialize pose detector with current quality setting - CHANGED TO MOVENET
  const initializeDetector = async () => {
    if (!poseDetectionRef.current) {
      setErrorMessage('Pose detection library not loaded');
      setDebugInfo('Pose detection library not loaded');
      return;
    }
    
    try {
      setDebugInfo('Initializing pose detector...');
      
      if (detectorRef.current) {
        detectorRef.current.dispose();
      }
      
      // Using MoveNet instead of BlazePose for better reliability
      const modelName = poseDetectionRef.current.SupportedModels.MoveNet;
      
      // Configure model based on detection quality
      let modelConfig = {
        modelType: detectionQuality === 'high' ? 
                   poseDetectionRef.current.movenet.modelType.MULTIPOSE_LIGHTNING : 
                   poseDetectionRef.current.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: true,
        multiPoseMaxDimension: 256,
        enableTracking: true,
        trackerType: poseDetectionRef.current.TrackerType.BoundingBox
      };
      
      setDebugInfo(`Creating MoveNet detector with quality: ${detectionQuality}...`);
      
      // Create MoveNet detector
      detectorRef.current = await poseDetectionRef.current.createDetector(
        modelName,
        modelConfig
      );
      
      setDebugInfo('Pose detector initialized successfully!');
    } catch (error) {
      console.error('Error initializing detector:', error);
      setErrorMessage(`Failed to initialize detector: ${error.message}`);
      setDebugInfo(`Detector initialization error: ${error.message}`);
      setIsAIEnabled(false);
    }
  };
  
  // Setup camera
  const setupCamera = useCallback(async () => {
    try {
      setDebugInfo('Setting up camera...');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported in this browser');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setIsCameraReady(true);
          setDebugInfo('Camera is ready');
        };
      }
    } catch (error) {
      console.error('Error setting up camera:', error);
      setErrorMessage(`Camera access error: ${error.message}`);
      setDebugInfo(`Camera setup error: ${error.message}`);
    }
  }, []);
  
  // Initialize everything on component mount
  useEffect(() => {
    setupCamera();
    
    return () => {
      // Cleanup
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
      
      if (detectorRef.current) {
        detectorRef.current.dispose();
      }
      
      detectionLoopActive.current = false;
    };
  }, [setupCamera]);
  
  // Update detector when quality changes
  useEffect(() => {
    if (poseDetectionRef.current) {
      initializeDetector();
    }
  }, [detectionQuality]);

  // Handle workout timer
  useEffect(() => {
    let interval = null;
    
    if (isWorkoutActive) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWorkoutActive]);

  // Check if this is a timed exercise when the exercise data loads
  useEffect(() => {
    if (exercise) {
      const isPlank = exercise.name?.toLowerCase().includes('plank');
      setIsTimedExercise(isPlank);
      
      // Initialize the proper state based on exercise type
      if (isPlank) {
        setExerciseState('waiting');
      } else if (exercise.name?.toLowerCase().includes('squat')) {
        setExerciseState('up');
      } else {
        setExerciseState('down');
      }
    }
  }, [exercise]);
  
  // Updated draw skeleton function - more robust for MoveNet
  const drawSkeleton = useCallback((pose, canvas) => {
    if (!canvas || !pose || !showSkeleton) return;
    
    try {
      const ctx = canvas.getContext('2d');
      const videoWidth = videoRef.current?.videoWidth || 640;
      const videoHeight = videoRef.current?.videoHeight || 480;
      
      // Set canvas size to match video
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (!pose.keypoints || pose.keypoints.length === 0) {
        setDebugInfo('Pose detected but no keypoints found');
        return;
      }
      
      // Draw keypoints
      pose.keypoints.forEach(keypoint => {
        // Only draw keypoints with reasonable confidence
        if (keypoint.score > 0.3) {
          ctx.beginPath();
          ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = 'aqua';
          ctx.fill();
        }
      });
      
      // Define skeleton connections manually if needed
      const connections = [
        ['nose', 'left_eye'], ['nose', 'right_eye'],
        ['left_eye', 'left_ear'], ['right_eye', 'right_ear'],
        ['left_shoulder', 'right_shoulder'],
        ['left_shoulder', 'left_elbow'], ['right_shoulder', 'right_elbow'],
        ['left_elbow', 'left_wrist'], ['right_elbow', 'right_wrist'],
        ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
        ['left_hip', 'right_hip'],
        ['left_hip', 'left_knee'], ['right_hip', 'right_knee'],
        ['left_knee', 'left_ankle'], ['right_knee', 'right_ankle']
      ];
      
      // Create keypoint lookup
      const keypointLookup = {};
      pose.keypoints.forEach(kp => {
        keypointLookup[kp.name] = kp;
      });
      
      // Draw skeleton connections
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'lime';
      
      connections.forEach(([p1Name, p2Name]) => {
        const p1 = keypointLookup[p1Name];
        const p2 = keypointLookup[p2Name];
        
        if (p1 && p2 && p1.score > 0.3 && p2.score > 0.3) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      });
    } catch (err) {
      console.error('Error drawing skeleton:', err);
      setDebugInfo(`Error drawing skeleton: ${err.message}`);
    }
  }, [showSkeleton]);
  
  // Process pose for rep counting
  const processPose = useCallback((pose) => {
    if (!pose || !pose.keypoints || !exercise) return;
    
    try {
      const currentState = repStateRef.current;
      const beforeCount = currentState.repCount || 0;
      const beforeState = currentState.state || 'down';
      
      const newState = detectExerciseRep(pose, exercise.name, currentState);
      
      if (beforeState !== newState.state) {
        console.log(`🔄 STATE TRANSITION: ${beforeState} → ${newState.state}`);
      }
      
      console.log(`STATE TRACKING: ${JSON.stringify({
        oldState: beforeState,
        newState: newState.state,
        previousState: newState.previousState,
        beforeCount: beforeCount,
        afterCount: newState.repCount,
        diff: newState.repCount - beforeCount
      })}`);
      
      if (newState.repCount > beforeCount) {
        console.log(`🔥 REP COUNTED! From ${beforeCount} to ${newState.repCount}`);
        setRepCount(newState.repCount);
        setFeedback(`Great job! Rep ${newState.repCount} completed!`);
      }
      
      if (isTimedExercise && newState.holdTime) {
        setHoldTime(newState.holdTime);
        
        if (Math.floor(newState.holdTime) % 5 === 0 &&
            Math.floor(newState.holdTime) !== Math.floor(currentState.holdTime || 0)) {
          setFeedback(`Great job! Holding for ${Math.floor(newState.holdTime)} seconds!`);
        }
      }
      
      if (newState.formFeedback && newState.formFeedback !== currentState.formFeedback) {
        setFormFeedback(newState.formFeedback);
      }
      
      if (newState.formScore) {
        setFormScore(newState.formScore);
      }
      
      setExerciseState(newState.state);
      setDebugInfo(newState.debug);
      
      repStateRef.current = newState;
      setRepCounterState(newState);
      
    } catch (error) {
      console.error('Error processing pose:', error);
      setDebugInfo(`Error in pose processing: ${error.message}`);
    }
  }, [exercise, isTimedExercise]);

  // Start pose detection - completely revised detection loop
  const startDetection = useCallback(() => {
    if (!detectorRef.current || !videoRef.current || !isAIEnabled) {
      setDebugInfo('Cannot start detection: missing detector, video, or AI disabled');
      return;
    }
    
    let interval = 150;
    if (detectionQuality === 'low') {
      interval = 250;
    } else if (detectionQuality === 'high') {
      interval = 100;
    }
    
    detectionLoopActive.current = true;
    setDebugInfo('Starting detection loop');
    
    const detectPose = async () => {
      if (!detectionLoopActive.current) {
        setDebugInfo('Detection loop stopped');
        return;
      }
      
      if (processingRef.current || 
          !videoRef.current || 
          videoRef.current.readyState !== 4) {
        setTimeout(detectPose, interval);
        return;
      }
      
      processingRef.current = true;
      
      try {
        const poses = await detectorRef.current.estimatePoses(videoRef.current, {
          flipHorizontal: false
        });
        
        if (poses && poses.length > 0) {
          setCurrentPose(poses[0]);
          
          if (poses[0].keypoints && !poses[0].keypoints[0].name) {
            const keypointNames = [
              'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
              'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
              'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
              'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
            ];
            
            poses[0].keypoints = poses[0].keypoints.map((kp, i) => ({
              ...kp,
              name: keypointNames[i] || `keypoint_${i}`
            }));
          }
          
          drawSkeleton(poses[0], canvasRef.current);
          processPose(poses[0]);
          
          setDebugInfo(`Pose detected with ${poses[0].keypoints.length} keypoints`);
        } else {
          setDebugInfo('No poses detected in this frame');
        }
      } catch (error) {
        console.error('Error during pose detection:', error);
        setDebugInfo(`Detection error: ${error.message}`);
      } finally {
        processingRef.current = false;
        
        if (detectionLoopActive.current) {
          setTimeout(detectPose, interval);
        }
      }
    };
    
    detectPose();
    
  }, [drawSkeleton, processPose, isAIEnabled, detectionQuality]);
  
  // Start workout
  const startWorkout = async () => {
    setRepCount(0);
    setElapsedTime(0);
    setErrorMessage('');
    setWorkoutSaved(false);
    setHoldTime(0);
    setFormFeedback('');
    setFormScore(0);
    setDebugInfo('Starting workout...');
    
    const isPlank = exercise?.name?.toLowerCase().includes('plank');
    const isSquat = exercise?.name?.toLowerCase().includes('squat');
    
    const initialState = {
      state: isPlank ? 'waiting' : isSquat ? 'up' : 'down',
      repCount: 0,
      debug: '',
      confidence: 0,
      previousState: isPlank ? 'waiting' : isSquat ? 'up' : 'down',
      formFeedback: '',
      formScore: 0,
      holdTime: 0
    };
    
    repStateRef.current = initialState;
    setRepCounterState(initialState);
    
    setExerciseState(isPlank ? 'waiting' : isSquat ? 'up' : 'down');
    
    if (isAIEnabled) {
      if (!tfRef.current || !poseDetectionRef.current || !detectorRef.current) {
        setDebugInfo('Libraries not loaded, loading now...');
        await loadLibraries();
      } else {
        setDebugInfo('Libraries already loaded');   
      }
    }
    
    setIsWorkoutActive(true);
    setFeedback('Workout started! Perform your exercise with good form');
    
    if (isAIEnabled && detectorRef.current) {
      setDebugInfo('Starting pose detection...');
      startDetection();
    } else {
      setDebugInfo('AI disabled or detector not ready, using manual mode');
    }
  };
  
  // Stop workout and save results
  const stopWorkout = async () => {
    setIsWorkoutActive(false);
    detectionLoopActive.current = false;
    setDebugInfo('Workout stopped, detection loop deactivated');
    
    if (user && exercise && (repCount > 0 || holdTime > 3) && !workoutSaved) {
      setFeedback('Saving workout...');
      setDebugInfo('Saving workout to database...');
      
      try {
        let estimatedCalories = 0;
        
        if (isTimedExercise) {
          estimatedCalories = Math.round((holdTime / 60) * 4);
        } else {
          const caloriesPerRep = exercise.exercise_details?.calories_per_rep || 0.3;
          estimatedCalories = Math.round(repCount * caloriesPerRep);
        }
        
        const { data: workout, error: workoutError } = await supabase
          .from('workouts')
          .insert({
            user_id: user.id,
            date: new Date().toISOString(),
            duration_seconds: elapsedTime,
            calories_burned: estimatedCalories,
            notes: isTimedExercise ? 
              `${exercise.name} - ${holdTime.toFixed(1)} seconds` : 
              `${exercise.name} - ${repCount} reps`
          })
          .select()
          .single();
          
        if (workoutError) throw workoutError;
        
        if (workout) {
          const { error: exerciseError } = await supabase
            .from('workout_exercises')
            .insert({
              workout_id: workout.id,
              exercise_id: exercise.id,
              sets: 1,
              reps: isTimedExercise ? null : repCount,
              time_seconds: isTimedExercise ? Math.round(holdTime) : null,
              form_score: formScore / 100,
              feedback: formFeedback
            });
            
          if (exerciseError) throw exerciseError;
          
          console.log('Workout saved successfully:', workout);
          setDebugInfo(`Workout saved with ID: ${workout.id}`);
          setWorkoutSaved(true);
          setFeedback('Workout completed and saved!');
        }
      } catch (error) {
        console.error('Error saving workout:', error);
        setErrorMessage('Failed to save workout data: ' + error.message);
        setDebugInfo(`Error saving workout: ${error.message}`);
        setFeedback('Workout completed but failed to save.');
      }
    } else {
      setFeedback(workoutSaved ? 'Workout already saved!' : 'Workout completed!');
    }
  };
  
  // Manually add a rep (backup method)
  const addRep = () => {
    const currentState = repStateRef.current;
    const newCount = currentState.repCount + 1;
    
    repStateRef.current = {
      ...currentState,
      repCount: newCount
    };
    
    setRepCount(newCount);
    setRepCounterState(prevState => ({
      ...prevState,
      repCount: newCount
    }));
    
    setFeedback(`Rep ${newCount} recorded!`);
    setDebugInfo(`Manually added rep: ${newCount}`);
  };
  
  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Loading and error states
  if (isLoading) {
    return <div className="text-center p-8">Loading exercise...</div>;
  }
  
  if (error) {
    return <div className="text-center p-8 text-red-500">Error: {error.message}</div>;
  }
  
  return (
    <div className="flex flex-col items-center p-4 space-y-4">
      <h1 className="text-3xl font-bold mb-2">{exercise?.name || 'Exercise'}</h1>
      
      {/* Main display area */}
      <div className="relative w-full max-w-2xl aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
        {/* Video feed */}
        <video
          ref={videoRef}
          className="absolute top-0 left-0 w-full h-full object-cover transform scaleX(-1)"
          playsInline 
          muted
        />
        
        {/* Canvas overlay */}
        <canvas
          ref={canvasRef}
          className={`absolute top-0 left-0 w-full h-full transform scaleX(-1) z-10 ${showSkeleton ? '' : 'hidden'}`}
        />
        
        {/* Loading overlay */}
        {!isCameraReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-30">
            <p className="text-white text-xl">Initializing camera...</p>
          </div>
        )}
        
        {/* Library loading overlay */}
        {isLibraryLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-30">
            <div className="text-center">
              <div className="inline-block w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-white">Loading detection library...</p>
              <p className="text-white text-xs mt-2">{debugInfo}</p>
            </div>
          </div>
        )}
        
        {/* Controls */}
        <div className="absolute top-2 right-2 z-20">
          {!isWorkoutActive ? (
            isCameraReady && (
              <button
                onClick={startWorkout}
                disabled={isLibraryLoading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow transition disabled:opacity-50"
              >
                Start Workout
              </button>
            )
          ) : (
            <button
              onClick={stopWorkout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow transition"
            >
              Finish Workout
            </button>
          )}
        </div>
        
        {/* Timer */}
        <div className="absolute top-2 left-2 z-20 bg-gray-800 bg-opacity-75 text-white px-3 py-1 rounded">
          <p className="text-xl font-mono">{formatTime(elapsedTime)}</p>
        </div>
        
        {/* Feedback area */}
        <div className="absolute bottom-2 left-2 right-2 z-20 bg-black bg-opacity-60 px-3 py-2 rounded">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-white font-medium">{feedback || "Ready to start"}</p>
              
              {formFeedback && (
                <p className={`text-sm ${
                  formScore > 80 ? 'text-green-300' : 
                  formScore > 60 ? 'text-yellow-300' : 
                  'text-red-300'
                }`}>
                  {formFeedback}
                </p>
              )}
              
              <p className="text-sm text-gray-300">
                {isTimedExercise ? (
                  `Hold time: ${holdTime.toFixed(1)}s ${exerciseState === 'holding' ? '✓' : ''}`
                ) : (
                  `State: ${exerciseState} | Reps: ${repCount}`
                )}
                {formScore > 0 && ` | Form: ${formScore.toFixed(0)}/100`}
              </p>
            </div>
            
            {isWorkoutActive && (
              <button 
                onClick={addRep}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold"
              >
                +
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Error message */}
      {errorMessage && (
        <div className="w-full max-w-2xl bg-red-50 border border-red-200 p-3 rounded-lg text-red-700">
          <p>{errorMessage}</p>
        </div>
      )}
      
      {/* Debug info */}
      <div className="w-full max-w-2xl bg-gray-50 p-2 rounded-lg text-xs font-mono text-gray-600 border border-gray-200">
        <details>
          <summary className="font-bold">Debug Info (click to toggle)</summary>
          <p className="mt-1">{debugInfo}</p>
          {repCounterState.debug && (
            <p className="mt-1 text-blue-600">{repCounterState.debug}</p>
          )}
        </details>
      </div>
      
      {/* Settings panel - only shown before workout starts */}
      {!isWorkoutActive && (
        <div className="w-full max-w-2xl bg-white p-4 rounded-lg shadow-md">
          <h3 className="font-semibold text-lg mb-3">Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* AI Mode toggle */}
            <div className="flex items-center justify-between">
              <label htmlFor="ai-mode" className="font-medium text-gray-700">AI Tracking</label>
              <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full">
                <input 
                  type="checkbox"
                  id="ai-mode"
                  checked={isAIEnabled}
                  onChange={() => setIsAIEnabled(!isAIEnabled)}
                  className="sr-only"
                />
                <span 
                  className={`absolute inset-0 rounded-full transition duration-200 ease-in-out ${
                    isAIEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                ></span>
                <span 
                  className={`absolute h-5 w-5 top-0.5 transition duration-200 ease-in-out rounded-full bg-white ${
                    isAIEnabled ? 'right-0.5' : 'left-0.5'
                  }`}
                ></span>
              </div>
            </div>
            
            {/* Skeleton toggle */}
            <div className="flex items-center justify-between">
              <label htmlFor="skeleton-mode" className="font-medium text-gray-700">Show Skeleton</label>
              <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full">
                <input 
                  type="checkbox"
                  id="skeleton-mode"
                  checked={showSkeleton}
                  onChange={() => setShowSkeleton(!showSkeleton)}
                  className="sr-only"
                />
                <span 
                  className={`absolute inset-0 rounded-full transition duration-200 ease-in-out ${
                    showSkeleton ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                ></span>
                <span 
                  className={`absolute h-5 w-5 top-0.5 transition duration-200 ease-in-out rounded-full bg-white ${
                    showSkeleton ? 'right-0.5' : 'left-0.5'
                  }`}
                ></span>
              </div>
            </div>
            
            {/* Detection quality select */}
            <div className="col-span-1 md:col-span-2">
              <label htmlFor="quality-select" className="block font-medium text-gray-700 mb-1">
                Detection Quality (lower = better performance)
              </label>
              <select
                id="quality-select"
                value={detectionQuality}
                onChange={(e) => setDetectionQuality(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low (Better Performance)</option>
                <option value="medium">Medium (Balanced)</option>
                <option value="high">High (Better Accuracy)</option>
              </select>
            </div>
          </div>
          
          {/* Force reload libraries button */}
          <div className="mt-4">
            <button
              onClick={loadLibraries}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded"
            >
              Reload Model Libraries
            </button>
          </div>
        </div>
      )}
      
      {/* Exercise instructions */}
      {!isWorkoutActive && (
        <div className="w-full max-w-2xl bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">How to perform:</h3>
          <p>{exercise?.exercise_details?.instructions || 
              "Position yourself in front of the camera where your body is clearly visible. Follow proper form during the exercise."}</p>
              
          <div className="mt-4 text-sm text-blue-700">
            <p><strong>Tips:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Make sure you're fully visible in the camera frame</li>
              <li>If AI tracking isn't working well, you can use the + button to count reps manually</li>
              <li>Good lighting helps the AI see you better</li>
              <li>Try to position yourself so the camera can see your full body</li>
            </ul>
          </div>
        </div>
      )}
      
      {/* Workout summary (shown after completion) */}
      {!isWorkoutActive && (repCount > 0 || holdTime > 3) && (
        <div className="w-full max-w-2xl bg-white p-6 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-semibold mb-3">Workout Summary</h2>
          
          {isTimedExercise ? (
            <p className="text-lg">You held {exercise?.name} for <span className="font-bold text-blue-600">{holdTime.toFixed(1)} seconds</span></p>
          ) : (
            <p className="text-lg">You completed <span className="font-bold text-blue-600">{repCount} reps</span> of {exercise?.name}</p>
          )}
          
          <p className="text-lg">Total time: <span className="font-medium">{formatTime(elapsedTime)}</span></p>
          
          <p className="text-lg">Calories burned: <span className="font-medium">
            {isTimedExercise ? 
              `~${Math.round((holdTime / 60) * 4)}` : 
              `~${Math.round(repCount * (exercise?.exercise_details?.calories_per_rep || 5))}`
            }
          </span></p>
          
          {formScore > 0 && (
            <p className="text-lg">Form quality: 
              <span className={`font-medium ml-2 ${
                formScore > 80 ? 'text-green-600' : 
                formScore > 60 ? 'text-yellow-600' : 
                'text-red-600'
              }`}>
                {formScore > 80 ? 'Excellent' : 
                 formScore > 60 ? 'Good' : 
                 'Needs improvement'} ({formScore.toFixed(0)}/100)
              </span>
            </p>
          )}
          
          <div className="mt-6 flex justify-center space-x-4">
            <button
              onClick={() => navigate('/history')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow transition"
            >
              View History
            </button>
            
            <button
              onClick={startWorkout}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow transition"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraViewPage;