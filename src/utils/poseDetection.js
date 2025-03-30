// src/utils/poseDetection.js
// Utility functions for pose detection and analysis
import * as poseDetection from '@tensorflow-models/pose-detection';

/**
 * Calculate angle between three points (in degrees)
 * @param {Object} a - First point with x,y coordinates & score
 * @param {Object} b - Middle point (vertex) with x,y coordinates & score
 * @param {Object} c - Third point with x,y coordinates & score
 * @param {Number} minConfidence - Minimum score for points to be considered valid
 * @returns {Number|null} Angle in degrees or null if points are invalid/low confidence
 */
export function calculateAngle(a, b, c, minConfidence = 0.3) { // Added minConfidence param
    if (!a || !b || !c ||
        typeof a.x !== 'number' || typeof a.y !== 'number' || typeof a.score !== 'number' ||
        typeof b.x !== 'number' || typeof b.y !== 'number' || typeof b.score !== 'number' ||
        typeof c.x !== 'number' || typeof c.y !== 'number' || typeof c.score !== 'number') {
      // Check if points exist and have necessary properties first
      // console.warn(`calculateAngle skipped: One or more points are missing or malformed.`);
      return null;
    }

    if (a.score < minConfidence || b.score < minConfidence || c.score < minConfidence) { // Check confidence
      // console.warn(`calculateAngle skipped due to low confidence: ${a.name}(${a?.score?.toFixed(2)}), ${b.name}(${b?.score?.toFixed(2)}), ${c.name}(${c?.score?.toFixed(2)})`);
      return null;
    }

    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);

    if (angle > 180.0) {
      angle = 360 - angle;
    }
    // Optional: Log calculated angle
    // console.log(`Angle ${a.name}-${b.name}-${c.name}: ${angle.toFixed(1)}`);
    return angle;
  }

/**
 * Draw pose keypoints and skeleton on canvas
 * @param {Object} pose - Pose object from TensorFlow.js
 * @param {HTMLVideoElement} video - Video element
 * @param {Number} videoWidth - Width of the video
 * @param {Number} videoHeight - Height of the video
 * @param {HTMLCanvasElement} canvas - Canvas element to draw on
 * @param {Object} options - Additional options like colors, sizes
 */
export function drawPoseCanvas(pose, video, videoWidth, videoHeight, canvas, options = {}) {
  const ctx = canvas.getContext('2d');

  // Default options
  const defaults = {
    keypointRadius: 5,
    keypointColor: 'aqua',
    skeletonColor: 'lime',
    skeletonLineWidth: 2,
    keypointThreshold: 0.3, // Minimum confidence for keypoint display
    showVideo: false,       // Whether to draw the video frame
    mirrorImage: true       // Whether to mirror the image horizontally (set based on video feed)
  };

  const config = { ...defaults, ...options };

  // Set canvas dimensions
  canvas.width = videoWidth;
  canvas.height = videoHeight;

  // Clear previous drawings
  ctx.clearRect(0, 0, videoWidth, videoHeight);

  // Optional: Draw video frame
    // Note: Drawing video is usually handled by the <video> element itself.
    // This might be used if you want effects applied directly on the canvas.
  if (config.showVideo) {
    ctx.save();
    if (config.mirrorImage) {
      // Mirror the canvas drawing context if the video element itself isn't mirrored
      ctx.translate(videoWidth, 0);
      ctx.scale(-1, 1);
       // Draw the video frame - ensure video is playing and loaded
       try {
         ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
       } catch (e) {
           console.error("Error drawing video to canvas:", e)
       }
    } else {
       try {
           ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
       } catch (e) {
           console.error("Error drawing video to canvas:", e)
       }
    }
    ctx.restore(); // Restore context to prevent mirroring subsequent drawings
  }


  if (!pose || !pose.keypoints) {
    // console.log("drawPoseCanvas: No pose data to draw.");
    return;
  }

  const keypoints = pose.keypoints;

  // Draw Keypoints
  keypoints.forEach(keypoint => {
    if (keypoint.score && keypoint.score > config.keypointThreshold) { // Check score exists
      ctx.beginPath();
      ctx.arc(keypoint.x, keypoint.y, config.keypointRadius, 0, 2 * Math.PI);
      ctx.fillStyle = config.keypointColor;
      ctx.fill();
    }
  });

  // Draw Skeleton using TensorFlow's adjacentPairs utility
  const adjacentKeyPoints = poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet);
  adjacentKeyPoints.forEach(([i, j]) => {
    const kp1 = keypoints[i];
    const kp2 = keypoints[j];

    // Check both keypoints exist and meet the threshold
    if (kp1 && kp2 && kp1.score && kp2.score && kp1.score > config.keypointThreshold && kp2.score > config.keypointThreshold) {
      ctx.beginPath();
      ctx.moveTo(kp1.x, kp1.y);
      ctx.lineTo(kp2.x, kp2.y);
      ctx.lineWidth = config.skeletonLineWidth;
      ctx.strokeStyle = config.skeletonColor;
      ctx.stroke();
    }
  });
}

/**
 * Get feedback for exercise form based on detected pose
 * @param {String} exerciseName - Name of the exercise
 * @param {Object} pose - Detected pose object
 * @param {String} currentStage - Current exercise stage (e.g., 'up', 'down')
 * @returns {Object} Feedback object with messages and form score
 */
export function analyzeExerciseForm(exerciseName, pose, currentStage) {
    if (!pose || !pose.keypoints) {
      // console.log("analyzeExerciseForm skipped: No pose data.");
      return { messages: ["Position not detected clearly"], score: 0, isGoodForm: false };
    }

    // Get keypoints as easy-to-use objects, checking for existence
    const keypoints = pose.keypoints.reduce((acc, kp) => {
        if (kp && kp.name) { // Ensure keypoint and name exist
            acc[kp.name] = kp;
        }
        return acc;
    }, {});

    // Check if essential body parts are present before proceeding
    const essentialKeypoints = ['left_shoulder', 'right_shoulder', 'left_hip', 'right_hip'];
    const hasEssential = essentialKeypoints.every(name => keypoints[name] && keypoints[name].score > 0.1); // Lower threshold for just presence check

    if (!hasEssential) {
        // console.log("analyzeExerciseForm skipped: Essential keypoints missing.");
        return { messages: ["Ensure your upper body and hips are visible"], score: 0, isGoodForm: false };
    }

    let feedback = { messages: [], score: 0, isGoodForm: false };

    try {
        switch (exerciseName?.toLowerCase()) { // Use optional chaining for safety
            case 'bicep curl':
                feedback = analyzeBicepCurlForm(keypoints, currentStage);
                break;

            case 'squat':
                feedback = analyzeSquatForm(keypoints, currentStage);
                break;

            case 'push up':
                feedback = analyzePushUpForm(keypoints, currentStage);
                break;

            case 'plank':
                feedback = analyzePlankForm(keypoints);
                break;

            default:
                // console.log(`analyzeExerciseForm: No specific analysis for ${exerciseName}`);
                feedback.messages.push("Form analysis not available for this exercise");
        }
    } catch (error) {
        console.error(`Error during form analysis for ${exerciseName}:`, error);
        feedback.messages.push("An error occurred during form analysis.");
        feedback.score = 0; // Penalize score on error
    }

    return feedback;
}

// --- Helper to get average angle ---
function getAverageAngle(kp1a, kp1b, kp1c, kp2a, kp2b, kp2c, minConfidence = 0.3) {
    const angle1 = calculateAngle(kp1a, kp1b, kp1c, minConfidence);
    const angle2 = calculateAngle(kp2a, kp2b, kp2c, minConfidence);

    if (angle1 !== null && angle2 !== null) {
        return (angle1 + angle2) / 2;
    } else if (angle1 !== null) {
        return angle1;
    } else if (angle2 !== null) {
        return angle2;
    } else {
        return null; // Neither angle could be calculated
    }
}

// --- Helper to get average Y position ---
function getAverageY(kp1, kp2, minConfidence = 0.1) {
    const y1 = kp1?.score > minConfidence ? kp1.y : null;
    const y2 = kp2?.score > minConfidence ? kp2.y : null;

    if (y1 !== null && y2 !== null) {
        return (y1 + y2) / 2;
    } else if (y1 !== null) {
        return y1;
    } else if (y2 !== null) {
        return y2;
    } else {
        return null;
    }
}

// --- Helper to get average X position ---
function getAverageX(kp1, kp2, minConfidence = 0.1) {
    const x1 = kp1?.score > minConfidence ? kp1.x : null;
    const x2 = kp2?.score > minConfidence ? kp2.x : null;

    if (x1 !== null && x2 !== null) {
        return (x1 + x2) / 2;
    } else if (x1 !== null) {
        return x1;
    } else if (x2 !== null) {
        return x2;
    } else {
        return null;
    }
}


/**
 * Analyze bicep curl form
 */
function analyzeBicepCurlForm(keypoints, currentStage) {
    const feedback = { messages: [], score: 10, isGoodForm: false }; // Start with full score
    let issuesFound = false;
    const minConfidence = 0.4; // Slightly higher confidence for form analysis

    // Required keypoints for analysis
    const required = ['left_shoulder', 'left_elbow', 'left_wrist', 'right_shoulder', 'right_elbow', 'right_wrist'];
    if (required.some(name => !keypoints[name] || keypoints[name].score < minConfidence)) {
        feedback.messages.push("Ensure arms and shoulders are clearly visible");
        return { ...feedback, score: 0 }; // Can't analyze form
    }

    const leftElbowAngle = calculateAngle(keypoints.left_shoulder, keypoints.left_elbow, keypoints.left_wrist, minConfidence);
    const rightElbowAngle = calculateAngle(keypoints.right_shoulder, keypoints.right_elbow, keypoints.right_wrist, minConfidence);
    const elbowAngle = getAverageAngle(
        keypoints.left_shoulder, keypoints.left_elbow, keypoints.left_wrist,
        keypoints.right_shoulder, keypoints.right_elbow, keypoints.right_wrist,
        minConfidence
    );

    if (elbowAngle === null) {
        feedback.messages.push("Cannot determine elbow angle accurately");
        return { ...feedback, score: Math.max(0, feedback.score - 4) };
    }

    // Analyze elbow position (check excessive horizontal movement)
    const leftElbowX = keypoints.left_elbow.x;
    const leftShoulderX = keypoints.left_shoulder.x;
    const rightElbowX = keypoints.right_elbow.x;
    const rightShoulderX = keypoints.right_shoulder.x;
    // Estimate body width for relative threshold (simplistic)
    const shoulderWidth = Math.abs(leftShoulderX - rightShoulderX);
    const movementThreshold = shoulderWidth * 0.15; // Allow elbow movement ~15% of shoulder width

    if (Math.abs(leftElbowX - leftShoulderX) > movementThreshold || Math.abs(rightElbowX - rightShoulderX) > movementThreshold) {
        feedback.messages.push("Keep elbows stable, avoid swinging");
        feedback.score -= 3;
        issuesFound = true;
    }

    // Stage-specific feedback
    if (currentStage === 'down') {
        if (elbowAngle < 150) { // Arms should be nearly straight
            feedback.messages.push("Extend arms fully at the bottom");
            feedback.score -= 2;
            issuesFound = true;
        }
    } else if (currentStage === 'up') {
        if (elbowAngle > 70) { // Check if curl is high enough
            feedback.messages.push("Curl higher towards shoulders");
            feedback.score -= 2;
            issuesFound = true;
        }
    }

    // Check shoulder stability (Y difference)
    const shoulderYDiff = Math.abs(keypoints.left_shoulder.y - keypoints.right_shoulder.y);
    const maxShoulderYDiff = shoulderWidth * 0.1; // Allow 10% height diff relative to width
    if (shoulderYDiff > maxShoulderYDiff) {
        feedback.messages.push("Keep shoulders level and stable");
        feedback.score -= 2;
        issuesFound = true;
    }

    feedback.score = Math.max(0, feedback.score); // Ensure score doesn't go below 0
    if (!issuesFound && feedback.messages.length === 0) {
        feedback.messages.push("Good form!");
        feedback.isGoodForm = true;
    } else if (!issuesFound) {
         // Had minor confidence issues but no specific form errors
         feedback.isGoodForm = true; // Still consider good if no deductions
    }


    return feedback;
}

/**
 * Analyze squat form
 */
function analyzeSquatForm(keypoints, currentStage) {
    const feedback = { messages: [], score: 10, isGoodForm: false };
    let issuesFound = false;
    const minConfidence = 0.4;

    // Required keypoints
    const required = ['left_hip', 'left_knee', 'left_ankle', 'right_hip', 'right_knee', 'right_ankle', 'left_shoulder', 'right_shoulder'];
    if (required.some(name => !keypoints[name] || keypoints[name].score < minConfidence)) {
        feedback.messages.push("Ensure legs, hips, and shoulders are clearly visible");
        return { ...feedback, score: 0 };
    }

    const kneeAngle = getAverageAngle(
        keypoints.left_hip, keypoints.left_knee, keypoints.left_ankle,
        keypoints.right_hip, keypoints.right_knee, keypoints.right_ankle,
        minConfidence
    );
    const hipY = getAverageY(keypoints.left_hip, keypoints.right_hip, minConfidence);
    const kneeY = getAverageY(keypoints.left_knee, keypoints.right_knee, minConfidence);
    const shoulderY = getAverageY(keypoints.left_shoulder, keypoints.right_shoulder, minConfidence);

    if (kneeAngle === null || hipY === null || kneeY === null || shoulderY === null) {
        feedback.messages.push("Cannot determine joint positions accurately");
        return { ...feedback, score: Math.max(0, feedback.score - 4) };
    }

    // Check for excessive knee forward travel (simplistic check: knee X relative to ankle X)
    const leftKneeX = keypoints.left_knee.x;
    const leftAnkleX = keypoints.left_ankle.x;
    const rightKneeX = keypoints.right_knee.x;
    const rightAnkleX = keypoints.right_ankle.x;
    const kneeTravelThreshold = 30; // Pixels - may need adjustment based on camera angle/distance

    if (Math.abs(leftKneeX - leftAnkleX) > kneeTravelThreshold || Math.abs(rightKneeX - rightAnkleX) > kneeTravelThreshold) {
        // Note: This is perspective dependent. A side view is best.
        // console.warn("Potential knee valgus/varus or excessive forward travel detected (perspective dependent).");
        // feedback.messages.push("Keep knees aligned over ankles"); // Less assertive feedback due to perspective issues
        // feedback.score -= 1; // Minor penalty
        // issuesFound = true;
    }

    // Stage-specific feedback
    if (currentStage === 'down') {
        if (kneeAngle > 110) { // Check depth based on angle
            feedback.messages.push("Try to squat deeper if comfortable");
            feedback.score -= 2;
            issuesFound = true;
        }
        // Check depth based on hip/knee position (more reliable than angle alone)
        if (hipY < kneeY - 10) { // Hips significantly below knees
             if (!issuesFound) feedback.messages.push("Good depth!"); // Add positive feedback only if no issues yet
        } else if (hipY < kneeY + 10) { // Hips approx level with knees (parallel)
             if (!issuesFound) feedback.messages.push("Aim for hips slightly below knees if possible");
        } else { // Hips clearly above knees
            feedback.messages.push("Squat lower, hips below knees");
            feedback.score -= 3;
            issuesFound = true;
        }

    } else if (currentStage === 'up') {
        if (kneeAngle < 165) { // Check for full extension
            feedback.messages.push("Stand fully upright at the top");
            feedback.score -= 2;
            issuesFound = true;
        }
    }

    // Check back posture (chest up) - Angle between shoulder-hip line and vertical
    const hipX = getAverageX(keypoints.left_hip, keypoints.right_hip, minConfidence);
    const shoulderX = getAverageX(keypoints.left_shoulder, keypoints.right_shoulder, minConfidence);

    if (hipX !== null && shoulderX !== null) {
         // arctan(opposite/adjacent) -> arctan( (hipY-shoulderY) / (hipX-shoulderX) )
         // A simpler proxy: if shoulders are significantly forward of hips in X
         const leanThreshold = 50; // Pixels difference between shoulder X and hip X
         if (Math.abs(shoulderX - hipX) > leanThreshold) { // crude check for excessive forward lean
             // This is very dependent on camera angle (side view ideal)
             // console.warn("Potential excessive forward lean detected (perspective dependent)");
            // feedback.messages.push("Keep chest up, avoid leaning too far forward");
            // feedback.score -= 2;
            // issuesFound = true;
         }
    }


    feedback.score = Math.max(0, feedback.score);
    if (!issuesFound && feedback.messages.length === 0) {
        feedback.messages.push("Good form!");
        feedback.isGoodForm = true;
    } else if (!issuesFound) {
        feedback.isGoodForm = true;
    }

    return feedback;
}

/**
 * Analyze push-up form
 */
function analyzePushUpForm(keypoints, currentStage) {
    const feedback = { messages: [], score: 10, isGoodForm: false };
    let issuesFound = false;
    const minConfidence = 0.4;

    // Required keypoints
    const required = ['left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist', 'left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle'];
    if (required.some(name => !keypoints[name] || keypoints[name].score < minConfidence)) {
        feedback.messages.push("Ensure full body is clearly visible (side view preferred)");
        return { ...feedback, score: 0 };
    }

    const elbowAngle = getAverageAngle(
        keypoints.left_shoulder, keypoints.left_elbow, keypoints.left_wrist,
        keypoints.right_shoulder, keypoints.right_elbow, keypoints.right_wrist,
        minConfidence
    );
    const shoulderY = getAverageY(keypoints.left_shoulder, keypoints.right_shoulder, minConfidence);
    const hipY = getAverageY(keypoints.left_hip, keypoints.right_hip, minConfidence);
    const ankleY = getAverageY(keypoints.left_ankle, keypoints.right_ankle, minConfidence); // Use ankle for alignment check

    if (elbowAngle === null || shoulderY === null || hipY === null || ankleY === null) {
        feedback.messages.push("Cannot determine joint positions accurately");
        return { ...feedback, score: Math.max(0, feedback.score - 4) };
    }

    // Check body alignment (straight line from shoulder to ankle)
    // Check if hipY deviates significantly from the line between shoulderY and ankleY
    const idealHipY = shoulderY + (ankleY - shoulderY) * ((keypoints.left_hip.x + keypoints.right_hip.x) / 2 - (keypoints.left_shoulder.x + keypoints.right_shoulder.x) / 2) / ((keypoints.left_ankle.x + keypoints.right_ankle.x) / 2 - (keypoints.left_shoulder.x + keypoints.right_shoulder.x) / 2); // Simplified linear interpolation for Y based on X - crude!
    const bodyLineThreshold = 35; // Pixel deviation allowed

    // A simpler check: is hip significantly above or below the midpoint Y?
    const midPointY = (shoulderY + ankleY) / 2;
    const hipDeviation = Math.abs(hipY - midPointY);

    if (hipDeviation > bodyLineThreshold) { // Check deviation relative to midpoint
        if (hipY > midPointY + bodyLineThreshold / 2) { // Hip significantly lower than midpoint (sagging)
            feedback.messages.push("Engage core, keep hips from sagging");
            feedback.score -= 3;
        } else if (hipY < midPointY - bodyLineThreshold/2) { // Hip significantly higher than midpoint (piked)
             feedback.messages.push("Lower hips, maintain straight body line");
             feedback.score -= 3;
        }
         issuesFound = true;
    }


    // Stage-specific feedback
    if (currentStage === 'down') {
        if (elbowAngle > 100) { // Check depth
            feedback.messages.push("Lower chest closer to the floor");
            feedback.score -= 2;
            issuesFound = true;
        } else if (elbowAngle < 70) {
             if (!issuesFound) feedback.messages.push("Great depth!");
        }
    } else if (currentStage === 'up') {
        if (elbowAngle < 160) { // Check for full extension
            feedback.messages.push("Extend arms fully at the top");
            feedback.score -= 2;
            issuesFound = true;
        }
    }

    // Check elbow flare (simplistic X distance check - needs side view)
    const leftElbowX = keypoints.left_elbow.x;
    const leftShoulderX = keypoints.left_shoulder.x;
    const rightElbowX = keypoints.right_elbow.x;
    const rightShoulderX = keypoints.right_shoulder.x;
    const flareThreshold = 20; // Pixels

    // This check is unreliable without a consistent side view
    // if (Math.abs(leftElbowX - leftShoulderX) > flareThreshold || Math.abs(rightElbowX - rightShoulderX) > flareThreshold) {
    //   feedback.messages.push("Keep elbows tucked closer to body (avoid flaring)");
    //   feedback.score -= 1; // Minor penalty as it's view-dependent
    //   issuesFound = true;
    // }

    feedback.score = Math.max(0, feedback.score);
    if (!issuesFound && feedback.messages.length === 0) {
        feedback.messages.push("Good form!");
        feedback.isGoodForm = true;
    } else if (!issuesFound) {
        feedback.isGoodForm = true;
    }

    return feedback;
}

/**
 * Analyze plank form
 */
function analyzePlankForm(keypoints) {
    const feedback = { messages: [], score: 10, isGoodForm: false };
    let issuesFound = false;
    const minConfidence = 0.4;

    // Required keypoints
    const required = ['left_shoulder', 'right_shoulder', 'left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle'];
    if (required.some(name => !keypoints[name] || keypoints[name].score < minConfidence)) {
        feedback.messages.push("Ensure full body is clearly visible (side view ideal)");
        return { ...feedback, score: 0 };
    }

    const shoulderY = getAverageY(keypoints.left_shoulder, keypoints.right_shoulder, minConfidence);
    const hipY = getAverageY(keypoints.left_hip, keypoints.right_hip, minConfidence);
    const ankleY = getAverageY(keypoints.left_ankle, keypoints.right_ankle, minConfidence);

    if (shoulderY === null || hipY === null || ankleY === null) {
        feedback.messages.push("Cannot determine body alignment accurately");
        return { ...feedback, score: Math.max(0, feedback.score - 5) }; // Higher penalty for plank
    }

    // Check body alignment (hip deviation from shoulder-ankle line)
    const midPointY = (shoulderY + ankleY) / 2; // Midpoint between shoulder and ankle Y
    const bodyLineThreshold = 30; // Pixel deviation allowed for hips from midpoint
    const hipDeviation = Math.abs(hipY - midPointY);

     if (hipDeviation > bodyLineThreshold) {
        if (hipY > midPointY + bodyLineThreshold / 2) {
            feedback.messages.push("Hips sagging - engage core, lift hips");
            feedback.score -= 4; // Penalize sagging more
        } else if (hipY < midPointY - bodyLineThreshold / 2) {
             feedback.messages.push("Hips too high - lower towards body line");
             feedback.score -= 3;
        }
         issuesFound = true;
    }

    // Check neck alignment (optional, requires nose/ear)
    if (keypoints.nose && keypoints.left_ear && keypoints.right_ear) {
        const noseY = keypoints.nose.y;
        const earY = getAverageY(keypoints.left_ear, keypoints.right_ear, 0.2); // Lower confidence ok for ears
        const neckAlignmentThreshold = 20; // Pixels

        if (earY !== null) {
            if (noseY < earY - neckAlignmentThreshold) { // Head tilted back / looking up
                feedback.messages.push("Keep neck neutral, look slightly down/forward");
                feedback.score -= 2;
                issuesFound = true;
            } else if (noseY > earY + neckAlignmentThreshold) { // Chin tucked excessively
                 feedback.messages.push("Avoid tucking chin excessively");
                 feedback.score -= 1;
                 issuesFound = true;
            }
        }
    }

    feedback.score = Math.max(0, feedback.score);
    if (!issuesFound && feedback.messages.length === 0) {
        feedback.messages.push("Great plank form!");
        feedback.isGoodForm = true;
    } else if (!issuesFound) {
        feedback.isGoodForm = true;
    }

    return feedback;
}

/**
 * Detect rep based on pose keypoints and exercise type
 * @param {String} exerciseName - Name of exercise
 * @param {Object} pose - Detected pose object
 * @param {String} currentStage - Current stage of exercise (e.g. 'up', 'down')
 * @returns {Object} Object with new stage and whether a rep was completed
 */
export function detectRep(exerciseName, pose, currentStage) {
    if (!pose || !pose.keypoints) {
      console.log("detectRep skipped: No pose data.");
      return { stage: currentStage, isRepCompleted: false };
    }

    // Get keypoints as easy-to-use objects
    const keypoints = pose.keypoints.reduce((acc, kp) => {
        if (kp && kp.name) {
            acc[kp.name] = kp;
        }
        return acc;
    }, {});

    // --- DEBUG LOG ---
    // console.log(`detectRep called for: ${exerciseName}, Current Stage: ${currentStage}`);

    try {
        switch (exerciseName?.toLowerCase()) {
            case 'bicep curl':
                return detectBicepCurlRep(keypoints, currentStage);

            case 'squat':
                return detectSquatRep(keypoints, currentStage);

            case 'push up':
                return detectPushUpRep(keypoints, currentStage);

            default:
                console.log(`detectRep: No specific rep detection logic for ${exerciseName}`);
                return { stage: currentStage, isRepCompleted: false };
        }
    } catch (error) {
        console.error(`Error during rep detection for ${exerciseName}:`, error);
        return { stage: currentStage, isRepCompleted: false }; // Return safely on error
    }
}

/**
 * Detect bicep curl rep (using average angle)
 */
function detectBicepCurlRep(keypoints, currentStage) {
    const minConfidence = 0.3; // Confidence needed for rep counting points
    const elbowAngle = getAverageAngle(
        keypoints.left_shoulder, keypoints.left_elbow, keypoints.left_wrist,
        keypoints.right_shoulder, keypoints.right_elbow, keypoints.right_wrist,
        minConfidence
    );

    // --- DEBUG LOG ---
    // console.log(`Bicep Curl Rep Check - Stage: ${currentStage}, Avg Elbow Angle: ${elbowAngle?.toFixed(1)}`);

    if (elbowAngle === null) {
      // console.log("Bicep Curl: Angle calculation failed (low confidence points?).");
      return { stage: currentStage, isRepCompleted: false }; // Not enough data
    }

    // --- Tunable Thresholds ---
    const DOWN_THRESHOLD = 150; // Angle considered 'down' (arm extended)
    const UP_THRESHOLD = 65;   // Angle considered 'up' (arm flexed) - adjusted slightly

    // --- State Transition Logic ---
    if (elbowAngle > DOWN_THRESHOLD && currentStage === 'up') {
      // console.log(`Bicep Curl: Transitioning to 'down' (Angle ${elbowAngle.toFixed(1)} > ${DOWN_THRESHOLD})`);
      return { stage: 'down', isRepCompleted: false }; // Transitioned to down state
    } else if (elbowAngle < UP_THRESHOLD && currentStage === 'down') {
      console.log(`Bicep Curl: REP DETECTED! Transitioning to 'up' (Angle ${elbowAngle.toFixed(1)} < ${UP_THRESHOLD})`);
      return { stage: 'up', isRepCompleted: true }; // Completed a rep on the way up
    }

    // No state change
    return { stage: currentStage, isRepCompleted: false };
}

/**
 * Detect squat rep (using average knee angle and hip position)
 */
function detectSquatRep(keypoints, currentStage) {
    const minConfidence = 0.3;
    const kneeAngle = getAverageAngle(
        keypoints.left_hip, keypoints.left_knee, keypoints.left_ankle,
        keypoints.right_hip, keypoints.right_knee, keypoints.right_ankle,
        minConfidence
    );
    const hipY = getAverageY(keypoints.left_hip, keypoints.right_hip, minConfidence);
    const kneeY = getAverageY(keypoints.left_knee, keypoints.right_knee, minConfidence);

    // --- DEBUG LOG ---
    // console.log(`Squat Rep Check - Stage: ${currentStage}, Avg Knee Angle: ${kneeAngle?.toFixed(1)}, HipY: ${hipY?.toFixed(0)}, KneeY: ${kneeY?.toFixed(0)}`);

    if (kneeAngle === null || hipY === null || kneeY === null) {
        // console.log("Squat: Angle or position calculation failed.");
        return { stage: currentStage, isRepCompleted: false };
    }

    // --- Tunable Thresholds ---
    const STAND_THRESHOLD_ANGLE = 165; // Angle considered 'standing' - adjusted slightly
    const SQUAT_THRESHOLD_ANGLE = 110; // Angle considered 'squatting' - adjusted slightly
    const DEPTH_THRESHOLD_PIXELS = 0; // Hip must be at least level or slightly below knee (Y increases downwards)

    // --- State Transition Logic ---
    // Rep counts when going from 'up' (standing) to 'down' (squatted deep enough)
    if (kneeAngle < SQUAT_THRESHOLD_ANGLE && hipY > (kneeY + DEPTH_THRESHOLD_PIXELS) && currentStage === 'up') {
        // Reached sufficient squat depth from standing position
        console.log(`Squat: REP DETECTED! Transitioning to 'down' (Angle ${kneeAngle.toFixed(1)} < ${SQUAT_THRESHOLD_ANGLE}, HipY ${hipY.toFixed(0)} > KneeY ${kneeY.toFixed(0)})`);
        return { stage: 'down', isRepCompleted: true }; // Rep completed upon reaching depth
    } else if (kneeAngle > STAND_THRESHOLD_ANGLE && currentStage === 'down') {
        // Standing back up after being down
         // console.log(`Squat: Transitioning to 'up' (Angle ${kneeAngle.toFixed(1)} > ${STAND_THRESHOLD_ANGLE})`);
        return { stage: 'up', isRepCompleted: false }; // Transition back to up state
    }

    // No state change
    return { stage: currentStage, isRepCompleted: false };
}


/**
 * Detect push-up rep (using average elbow angle)
 */
function detectPushUpRep(keypoints, currentStage) {
    const minConfidence = 0.3;
    const elbowAngle = getAverageAngle(
        keypoints.left_shoulder, keypoints.left_elbow, keypoints.left_wrist,
        keypoints.right_shoulder, keypoints.right_elbow, keypoints.right_wrist,
        minConfidence
    );

    // --- DEBUG LOG ---
    // console.log(`Push Up Rep Check - Stage: ${currentStage}, Avg Elbow Angle: ${elbowAngle?.toFixed(1)}`);

    if (elbowAngle === null) {
       // console.log("Push Up: Angle calculation failed.");
       return { stage: currentStage, isRepCompleted: false };
    }

    // --- Tunable Thresholds ---
    const UP_THRESHOLD_ANGLE = 155; // Angle considered 'up' (arms extended)
    const DOWN_THRESHOLD_ANGLE = 95;  // Angle considered 'down' (arms bent)

    // --- State Transition Logic ---
    // Rep counts when going from 'down' (chest near floor) back 'up' (arms extended)
    if (elbowAngle > UP_THRESHOLD_ANGLE && currentStage === 'down') {
        // Arms extended after being down
        console.log(`Push Up: REP DETECTED! Transitioning to 'up' (Angle ${elbowAngle.toFixed(1)} > ${UP_THRESHOLD_ANGLE})`);
        return { stage: 'up', isRepCompleted: true }; // Rep completed on the way up
    } else if (elbowAngle < DOWN_THRESHOLD_ANGLE && currentStage === 'up') {
        // Reached bottom of push-up
        // console.log(`Push Up: Transitioning to 'down' (Angle ${elbowAngle.toFixed(1)} < ${DOWN_THRESHOLD_ANGLE})`);
        return { stage: 'down', isRepCompleted: false }; // Reached down position
    }

    // No state change
    return { stage: currentStage, isRepCompleted: false };
}