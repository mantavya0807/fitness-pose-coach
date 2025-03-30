// src/components/nutrition/FoodCamera.js
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, Check, X, Loader, ChevronDown, Trash, Edit } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import foodRecognitionService from '../../services/foodRecognitionService';

const FoodCamera = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // State
  const [cameraActive, setCameraActive] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [photoData, setPhotoData] = useState(null);
  const [fileSelected, setFileSelected] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedMealType, setSelectedMealType] = useState('breakfast');
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [recognitionError, setRecognitionError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editableFoods, setEditableFoods] = useState([]);
  
  // Start camera when component mounts
  useEffect(() => {
    if (isOpen) {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [isOpen]);
  
  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Use rear camera on mobile if available
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error('Error starting camera:', error);
    }
  };
  
  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };
  
  // Take photo
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the current video frame to the canvas
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to data URL (base64 encoded image)
    const imageDataUrl = canvas.toDataURL('image/jpeg');
    setPhotoData(imageDataUrl);
    setHasPhoto(true);
    setFileSelected(false);
    setSelectedFile(null);
    
    // Stop the camera after taking photo
    stopCamera();
  };
  
  // Discard photo and restart camera
  const discardPhoto = () => {
    setHasPhoto(false);
    setPhotoData(null);
    setRecognitionResult(null);
    setRecognitionError(null);
    setEditMode(false);
    setEditableFoods([]);
    startCamera();
  };
  
  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setSelectedFile(file);
    setFileSelected(true);
    setHasPhoto(false);
    setPhotoData(null);
    stopCamera();
    
    // Create a preview of the uploaded image
    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoData(event.target.result);
    };
    reader.readAsDataURL(file);
  };
  
  // Discard selected file
  const discardFile = () => {
    setFileSelected(false);
    setSelectedFile(null);
    setPhotoData(null);
    setRecognitionResult(null);
    setRecognitionError(null);
    setEditMode(false);
    setEditableFoods([]);
    startCamera();
  };
  
  // Convert data URL to Blob
  const dataURLtoBlob = (dataURL) => {
    const parts = dataURL.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    
    return new Blob([uInt8Array], { type: contentType });
  };
  
  // Process photo through recognition service
  const processPhoto = async () => {
    if (!user) {
      setRecognitionError('You must be logged in to use this feature');
      return;
    }
    
    setIsRecognizing(true);
    setRecognitionError(null);
    
    try {
      let imageFile;
      
      if (hasPhoto) {
        // Convert canvas image to file
        const blob = dataURLtoBlob(photoData);
        imageFile = new File([blob], "food-photo.jpg", { type: 'image/jpeg' });
      } else if (fileSelected && selectedFile) {
        imageFile = selectedFile;
      } else {
        throw new Error('No image selected');
      }
      
      // Process the image through the recognition service
      const result = await foodRecognitionService.recognizeFoodFromImage(
        await foodRecognitionService.uploadFoodImage(imageFile, user.id)
      );
      
      setRecognitionResult(result);
      
      // Enable edit mode with recognized food items
      if (result && result.success && result.foods && result.foods.length > 0) {
        setEditableFoods(result.foods.map(food => ({
          ...food,
          servings: 1, // Default serving
          included: true // Include by default
        })));
        setEditMode(true);
      } else {
        setRecognitionError('No foods detected in the image. Try another photo.');
      }
    } catch (error) {
      console.error('Error recognizing food:', error);
      setRecognitionError(error.message || 'Failed to process the image. Please try again.');
    } finally {
      setIsRecognizing(false);
    }
  };
  
  // Save recognized foods to meal
  const saveRecognizedFoods = async () => {
    if (!user || !recognitionResult) return;
    
    setIsRecognizing(true);
    
    try {
      // Filter only included foods
      const foodsToSave = editableFoods
        .filter(food => food.included)
        .map(food => ({
          ...food,
          calories: food.calories * food.servings,
          protein: food.protein * food.servings,
          carbs: food.carbs * food.servings,
          fat: food.fat * food.servings
        }));
      
      if (foodsToSave.length === 0) {
        throw new Error('No foods selected to add');
      }
      
      // Log recognition result
      const logResult = await foodRecognitionService.saveFoodRecognitionLog(
        photoData, // Or the URL if already uploaded
        { ...recognitionResult, foods: foodsToSave },
        user.id
      );
      
      // Add to meal
      const mealResult = await foodRecognitionService.addRecognizedFoodsToMeal(
        foodsToSave,
        selectedMealType,
        user.id
      );
      
      const finalResult = {
        success: true,
        logId: logResult.id,
        recognitionResult: { ...recognitionResult, foods: foodsToSave },
        mealResult
      };
      
      // Small delay before closing to let the user see the success message
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(finalResult);
        }
        onClose();
        // Navigate to meal details or nutrition dashboard
        navigate('/nutrition');
      }, 1500);
    } catch (error) {
      console.error('Error saving recognized foods:', error);
      setRecognitionError(error.message || 'Failed to save foods. Please try again.');
    } finally {
      setIsRecognizing(false);
    }
  };
  
  // Update serving size for a food item
  const updateServingSize = (index, newServings) => {
    setEditableFoods(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        servings: Math.max(0.25, Math.min(10, newServings)) // Limit between 0.25 and 10
      };
      return updated;
    });
  };
  
  // Toggle food inclusion
  const toggleFoodInclusion = (index) => {
    setEditableFoods(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        included: !updated[index].included
      };
      return updated;
    });
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {editMode ? "Edit Recognized Foods" : "Food Recognition"}
          </h3>
          <button 
            onClick={onClose}
            disabled={isRecognizing}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Main Content */}
        <div className="p-4 flex-1 overflow-auto">
          {!editMode && (
            <>
              {/* Camera View / Photo Preview */}
              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4 relative">
                {/* Camera Stream */}
                {cameraActive && !hasPhoto && !fileSelected && (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Hidden Canvas for Photo Capture */}
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Photo Preview */}
                {(hasPhoto || fileSelected) && photoData && !recognitionResult && (
                  <img 
                    src={photoData} 
                    alt="Food" 
                    className="w-full h-full object-contain" 
                  />
                )}
                
                {/* Recognition Error */}
                {recognitionError && (
                  <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-white p-4">
                    <X size={64} className="text-red-500 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Recognition Failed</h3>
                    <p className="text-center">{recognitionError}</p>
                  </div>
                )}
                
                {/* Loading State */}
                {isRecognizing && (
                  <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-white p-4">
                    <Loader size={64} className="text-blue-500 animate-spin mb-4" />
                    <h3 className="text-xl font-bold mb-2">Analyzing Food...</h3>
                    <p className="text-center">This will just take a moment</p>
                  </div>
                )}
              </div>
              
              {/* Meal Type Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Add to which meal?
                </label>
                <div className="relative">
                  <select
                    value={selectedMealType}
                    onChange={(e) => setSelectedMealType(e.target.value)}
                    className="block w-full px-4 py-2 pr-8 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 appearance-none"
                    disabled={isRecognizing}
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <ChevronDown size={16} className="text-gray-400" />
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-wrap justify-center gap-3">
                {/* Camera Controls */}
                {!hasPhoto && !fileSelected && !recognitionResult ? (
                  <>
                    <button
                      onClick={takePhoto}
                      disabled={!cameraActive || isRecognizing}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Camera size={18} />
                      <span>Take Photo</span>
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isRecognizing}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Upload size={18} />
                      <span>Upload Image</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </>
                ) : null}
                
                {/* Photo Review Controls */}
                {(hasPhoto || fileSelected) && !recognitionResult && !isRecognizing ? (
                  <>
                    <button
                      onClick={processPhoto}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                    >
                      <Check size={18} />
                      <span>Recognize Food</span>
                    </button>
                    <button
                      onClick={hasPhoto ? discardPhoto : discardFile}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"
                    >
                      <X size={18} />
                      <span>Discard</span>
                    </button>
                  </>
                ) : null}
                
                {/* After Error */}
                {recognitionError && (
                  <button
                    onClick={() => {
                      setRecognitionError(null);
                      discardPhoto();
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Try Again
                  </button>
                )}
              </div>
            </>
          )}
          
          {/* Edit Mode - Show recognized foods with editable servings */}
          {editMode && editableFoods.length > 0 && (
            <>
              <div className="mb-4">
                <h3 className="font-medium text-gray-700 mb-2">Recognized Foods</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Adjust servings or remove foods before adding to your {selectedMealType}.
                </p>
                
                {/* Food items list */}
                <div className="space-y-3">
                  {editableFoods.map((food, index) => (
                    <div 
                      key={index} 
                      className={`p-3 border rounded-lg flex items-center transition ${
                        food.included ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-100 opacity-60'
                      }`}
                    >
                      {/* Inclusion checkbox */}
                      <div className="mr-3">
                        <input
                          type="checkbox"
                          checked={food.included}
                          onChange={() => toggleFoodInclusion(index)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                      
                      {/* Food info */}
                      <div className="flex-1">
                        <div className="font-medium">{food.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          <span className="inline-block mr-2">Protein: {(food.protein * food.servings).toFixed(1)}g</span>
                          <span className="inline-block mr-2">Carbs: {(food.carbs * food.servings).toFixed(1)}g</span>
                          <span className="inline-block">Fat: {(food.fat * food.servings).toFixed(1)}g</span>
                        </div>
                      </div>
                      
                      {/* Serving controls */}
                      <div className="flex items-center space-x-1 ml-2">
                        <button
                          onClick={() => updateServingSize(index, food.servings - 0.25)}
                          disabled={food.servings <= 0.25 || !food.included}
                          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                        >
                          -
                        </button>
                        <div className="w-14 text-center">
                          <div className="font-medium">{food.servings}</div>
                          <div className="text-xs text-gray-500">servings</div>
                        </div>
                        <button
                          onClick={() => updateServingSize(index, food.servings + 0.25)}
                          disabled={food.servings >= 10 || !food.included}
                          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                      
                      {/* Calories */}
                      <div className="ml-3 text-right min-w-20">
                        <div className="font-medium">{Math.round(food.calories * food.servings)}</div>
                        <div className="text-xs text-gray-500">calories</div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Total calories */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">Total Calories:</span>
                    <span className="font-bold text-xl">
                      {Math.round(
                        editableFoods
                          .filter(food => food.included)
                          .reduce((sum, food) => sum + (food.calories * food.servings), 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => {
                    setEditMode(false);
                    setRecognitionResult(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100"
                >
                  Back
                </button>
                <button
                  onClick={saveRecognizedFoods}
                  disabled={
                    isRecognizing || 
                    editableFoods.filter(food => food.included).length === 0
                  }
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isRecognizing ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      <span>Add to {selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)}</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
        
        {/* Instructions */}
        {!editMode && !recognitionResult && !recognitionError && !isRecognizing && (
          <div className="p-4 bg-gray-50 border-t">
            <p className="text-xs text-gray-600">
              <strong>Tips for best results:</strong> Take photos in good lighting, with the food clearly visible and centered in the frame. Try to avoid shadows and glare.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FoodCamera;