// src/utils/repCounter.js
// Enhanced rep counter with support for all 30 exercises

/**
 * Enhanced rep counter with detailed analysis for all exercises
 * @param {Object} pose - The pose object from TensorFlow
 * @param {String} exerciseName - Name of the exercise
 * @param {Object} currentState - Current state
 * @returns {Object} New state object with updated rep count and form feedback
 */
const detectExerciseRep = (pose, exerciseName, currentState) => {
    // Guard against missing pose data
    if (!pose || !pose.keypoints || pose.keypoints.length === 0) {
      return {
        state: currentState.state || 'waiting',
        repCount: currentState.repCount || 0,
        debug: 'No pose detected',
        confidence: 0,
        previousState: currentState.state || 'waiting',
        formFeedback: '', // Form quality feedback
        formScore: 0      // Form quality score (0-100)
      };
    }
  
    // Convert keypoints array to an object for easier access
    const keypoints = {};
    pose.keypoints.forEach(kp => {
      keypoints[kp.name] = {
        x: kp.x,
        y: kp.y,
        score: kp.score || 0
      };
    });
    
    // Normalize exercise name for matching
    const lowerName = exerciseName?.toLowerCase() || '';
    
    // Core exercises (already implemented)
    if (lowerName.includes('bicep') || lowerName.includes('curl')) {
      return detectBicepCurl(keypoints, currentState);
    } else if (lowerName.includes('squat')) {
      return detectSquat(keypoints, currentState);
    } else if (lowerName.includes('push')) {
      return detectPushUp(keypoints, currentState);
    } else if (lowerName.includes('plank')) {
      return detectPlank(keypoints, currentState);
    } else if (lowerName.includes('jump') || lowerName.includes('jack')) {
      return detectJumpingJacks(keypoints, currentState);
    }
    
    // Extended exercise detection based on movement patterns
    
    // Squat-like exercises (track knee angle)
    else if (lowerName.includes('lunge')) {
      return detectLunge(keypoints, currentState);
    } else if (lowerName.includes('calf raise')) {
      return detectCalfRaise(keypoints, currentState);
    } 
    
    // Arm/shoulder exercises (track arm angles)
    else if (lowerName.includes('overhead press')) {
      return detectOverheadPress(keypoints, currentState);
    } else if (lowerName.includes('lateral raise')) {
      return detectLateralRaise(keypoints, currentState);
    } else if (lowerName.includes('front raise')) {
      return detectFrontRaise(keypoints, currentState);
    } else if (lowerName.includes('tricep') || lowerName.includes('dip')) {
      return detectTricepDip(keypoints, currentState);
    } else if (lowerName.includes('bench press')) {
      return detectBenchPress(keypoints, currentState);
    }
    
    // Back exercises
    else if (lowerName.includes('row')) {
      return detectBentOverRow(keypoints, currentState);
    } else if (lowerName.includes('deadlift')) {
      return detectDeadlift(keypoints, currentState);
    }
    
    // Core exercises
    else if (lowerName.includes('glute bridge')) {
      return detectGluteBridge(keypoints, currentState);
    } else if (lowerName.includes('russian twist')) {
      return detectRussianTwist(keypoints, currentState);
    } else if (lowerName.includes('leg raise')) {
      return detectLegRaise(keypoints, currentState);
    } else if (lowerName.includes('bicycle') || lowerName.includes('crunch')) {
      return detectBicycleCrunch(keypoints, currentState);
    } else if (lowerName.includes('superman')) {
      return detectSuperman(keypoints, currentState);
    } else if (lowerName.includes('bird dog')) {
      return detectBirdDog(keypoints, currentState);
    }
    
    // Cardio exercises
    else if (lowerName.includes('burpee')) {
      return detectBurpee(keypoints, currentState);
    } else if (lowerName.includes('mountain climber')) {
      return detectMountainClimber(keypoints, currentState);
    } else if (lowerName.includes('high knee')) {
      return detectHighKnee(keypoints, currentState);
    } else if (lowerName.includes('butt kick')) {
      return detectButtKick(keypoints, currentState);
    }
    
    // Flexibility/hold exercises
    else if (lowerName.includes('cat-cow') || lowerName.includes('cat cow')) {
      return detectCatCow(keypoints, currentState);
    } else if (lowerName.includes('child') && lowerName.includes('pose')) {
      return detectChildsPose(keypoints, currentState);
    } else if (lowerName.includes('cobra')) {
      return detectCobraStretch(keypoints, currentState);
    } else if (lowerName.includes('hamstring') && lowerName.includes('stretch')) {
      return detectHamstringStretch(keypoints, currentState);
    }
    
    // Default to squat detection if exercise is not recognized
    else {
      console.warn(`Exercise '${exerciseName}' not specifically implemented. Using squat detection as fallback.`);
      return detectSquat(keypoints, currentState);
    }
  };
  
  /**
   * Calculate angle between three points in degrees
   * @param {Object} a - First point {x, y}
   * @param {Object} b - Middle point (vertex) {x, y}
   * @param {Object} c - Third point {x, y}
   * @returns {Number} Angle in degrees
   */
  const calculateAngle = (a, b, c) => {
    if (!a || !b || !c) return null;
    
    try {
      // Convert to radians
      const angleRadians = Math.atan2(c.y - b.y, c.x - b.x) - 
                           Math.atan2(a.y - b.y, a.x - b.x);
      
      // Convert to degrees (0-180)
      let angleDegrees = Math.abs(angleRadians * 180 / Math.PI);
      if (angleDegrees > 180) {
        angleDegrees = 360 - angleDegrees;
      }
      
      return angleDegrees;
    } catch (error) {
      console.error("Error calculating angle:", error);
      return null;
    }
  };
  
  /**
   * Get average confidence score for a set of keypoints
   * @param {Array} keypointNames - Array of keypoint names to check
   * @param {Object} keypoints - Object containing all keypoints
   * @returns {Number} Average confidence (0-1)
   */
  const getConfidence = (keypointNames, keypoints) => {
    if (!keypointNames || !keypoints) return 0;
    
    let totalConfidence = 0;
    let validPoints = 0;
    
    keypointNames.forEach(name => {
      if (keypoints[name] && keypoints[name].score) {
        totalConfidence += keypoints[name].score;
        validPoints++;
      }
    });
    
    if (validPoints === 0) return 0;
    return totalConfidence / validPoints;
  };
  
  /**
   * Enhanced bicep curl detection with form analysis
   */
  const detectBicepCurl = (keypoints, currentState) => {
    // Get previous state
    const prevState = currentState.state || 'down';
    const prevCount = currentState.repCount || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: 0
    };
  
    // Check arm visibility and get best arm
    const leftArmPoints = ['left_shoulder', 'left_elbow', 'left_wrist'];
    const rightArmPoints = ['right_shoulder', 'right_elbow', 'right_wrist'];
    
    const leftConfidence = getConfidence(leftArmPoints, keypoints);
    const rightConfidence = getConfidence(rightArmPoints, keypoints);
    
    let side = 'none';
    if (leftConfidence > 0.5 && leftConfidence >= rightConfidence) {
      side = 'left';
      newState.confidence = leftConfidence;
    } else if (rightConfidence > 0.5) {
      side = 'right';
      newState.confidence = rightConfidence;
    } else {
      newState.debug = 'Arms not clearly visible';
      newState.formFeedback = 'Please position yourself so your arms are visible';
      return newState;
    }
    
    // Get relevant arm keypoints
    const shoulder = keypoints[`${side}_shoulder`];
    const elbow = keypoints[`${side}_elbow`];
    const wrist = keypoints[`${side}_wrist`];
    
    // Calculate elbow angle - the key metric for bicep curls
    const elbowAngle = calculateAngle(shoulder, elbow, wrist);
    
    // Determine form quality
    let formScore = 0;
    let formFeedback = '';
    
    // Check elbow position (should stay close to body)
    const torsoPoints = side === 'left' ? 
      [keypoints.left_shoulder, keypoints.left_hip] : 
      [keypoints.right_shoulder, keypoints.right_hip];
      
    if (torsoPoints[0] && torsoPoints[1] && elbow) {
      // Calculate horizontal distance from elbow to torso line
      const shoulderX = torsoPoints[0].x;
      const hipX = torsoPoints[1].x;
      const elbowX = elbow.x;
      
      // Simplified check - elbow should be close to shoulder X position
      const elbowDeviation = Math.abs(elbowX - shoulderX);
      const deviationThreshold = 40; // pixels
      
      if (elbowDeviation > deviationThreshold) {
        formFeedback = 'Keep your elbow closer to your body';
        formScore = Math.max(0, 70 - (elbowDeviation - deviationThreshold));
      } else {
        formFeedback = 'Good form, elbow position is stable';
        formScore = 90;
      }
    }
    
    // Determine state based on elbow angle
    if (elbowAngle) {
      // UP: arm is bent (small angle)
      // DOWN: arm is straight (large angle)
      if (elbowAngle < 60) {
        newState.state = 'up';
        
        // Add form feedback specific to UP position
        if (elbowAngle < 30) {
          formFeedback = 'Excellent curl depth!';
          formScore = Math.max(formScore, 95);
        }
      } else if (elbowAngle > 150) {
        newState.state = 'down';
        
        // Add form feedback specific to DOWN position
        if (elbowAngle > 170) {
          formFeedback = 'Good arm extension!';
          formScore = Math.max(formScore, 95);
        }
      }
      // else keep previous state (transition zone)
      
      // Count rep when transitioning from UP to DOWN
      if (prevState === 'up' && newState.state === 'down') {
        newState.repCount = prevCount + 1;
        console.log(`✓ BICEP CURL REP! Angle: ${elbowAngle.toFixed(0)}°, Count: ${newState.repCount}`);
      }
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `Bicep Curl | Arm: ${side}, Angle: ${elbowAngle ? elbowAngle.toFixed(0) : 'N/A'}°, State: ${newState.state}, Score: ${formScore.toFixed(0)}`;
    
    return newState;
  };
  
  /**
   * Enhanced squat detection with form analysis
   */
  const detectSquat = (keypoints, currentState) => {
    // Get previous state
    const prevState = currentState.state || 'up';
    const prevCount = currentState.repCount || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: 0
    };
  
    // Check visibility of key points for squat
    const leftLegPoints = ['left_hip', 'left_knee', 'left_ankle'];
    const rightLegPoints = ['right_hip', 'right_knee', 'right_ankle'];
    
    const leftConfidence = getConfidence(leftLegPoints, keypoints);
    const rightConfidence = getConfidence(rightLegPoints, keypoints);
    
    let side = 'none';
    if (leftConfidence > 0.5 && leftConfidence >= rightConfidence) {
      side = 'left';
      newState.confidence = leftConfidence;
    } else if (rightConfidence > 0.5) {
      side = 'right';
      newState.confidence = rightConfidence;
    } else {
      newState.debug = 'Legs not clearly visible';
      newState.formFeedback = 'Please position yourself so your legs are visible';
      return newState;
    }
    
    // Get relevant leg keypoints
    const hip = keypoints[`${side}_hip`];
    const knee = keypoints[`${side}_knee`];
    const ankle = keypoints[`${side}_ankle`];
    
    // Calculate knee angle - primary metric for squat depth
    const kneeAngle = calculateAngle(hip, knee, ankle);
    
    // Determine state based on knee angle and hip position
    if (kneeAngle) {
      // Check if hips are lower than knees (for depth)
      const hipY = hip.y;
      const kneeY = knee.y;
      const hipToKneeY = hipY - kneeY;
      
      // Form quality assessment
      let formScore = 0;
      let formFeedback = '';
      
      // Check knee alignment (knees should be over ankles, not too far forward)
      const kneeX = knee.x;
      const ankleX = ankle.x;
      const kneeOverToes = Math.abs(kneeX - ankleX);
      
      if (kneeOverToes > 50) {
        formFeedback = 'Keep knees aligned with ankles';
        formScore = Math.max(0, 70 - (kneeOverToes - 50) / 2);
      } else {
        formFeedback = 'Good knee alignment';
        formScore = 90;
      }
      
      // Determine squat state based on knee angle
      if (kneeAngle < 120) {
        newState.state = 'down';
        
        // Assess squat depth
        if (kneeAngle < 90) {
          formFeedback = 'Excellent squat depth!';
          formScore = Math.max(formScore, 95);
        } else if (hipToKneeY > -10) { // Hip is close to knee level or below
          formFeedback = 'Good squat depth!';
          formScore = Math.max(formScore, 90);
        }
      } else if (kneeAngle > 160) {
        newState.state = 'up';
        
        // Check if fully extended at top
        if (kneeAngle > 170) {
          formFeedback = 'Good full extension!';
          formScore = Math.max(formScore, 95);
        }
      }
      // else keep previous state (transition zone)
      
      // Count rep when transitioning from DOWN to UP (completing the squat)
      if (prevState === 'down' && newState.state === 'up') {
        newState.repCount = prevCount + 1;
        console.log(`✓ SQUAT REP! Angle: ${kneeAngle.toFixed(0)}°, Count: ${newState.repCount}`);
      }
      
      // Save form information
      newState.formFeedback = formFeedback;
      newState.formScore = formScore;
      
      // Detailed debug info
      newState.debug = `Squat | Leg: ${side}, Knee Angle: ${kneeAngle.toFixed(0)}°, Hip-Knee: ${hipToKneeY.toFixed(0)}px, State: ${newState.state}, Score: ${formScore.toFixed(0)}`;
    }
    
    return newState;
  };
  
  /**
   * Enhanced push-up detection with form analysis
   */
  const detectPushUp = (keypoints, currentState) => {
    // Get previous state
    const prevState = currentState.state || 'up';
    const prevCount = currentState.repCount || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: 0
    };
  
    // Check visibility of key points for push-ups
    const requiredPoints = [
      'left_shoulder', 'right_shoulder', 
      'left_elbow', 'right_elbow',
      'left_wrist', 'right_wrist',
      'left_hip', 'right_hip'
    ];
    
    // Calculate overall confidence
    newState.confidence = getConfidence(requiredPoints, keypoints);
    
    if (newState.confidence < 0.4) {
      newState.debug = 'Body not clearly visible';
      newState.formFeedback = 'Please position camera to see your full upper body';
      return newState;
    }
    
    // Track shoulder height (main indicator for push-up state)
    const leftShoulder = keypoints['left_shoulder'];
    const rightShoulder = keypoints['right_shoulder'];
    const leftElbow = keypoints['left_elbow'];
    const rightElbow = keypoints['right_elbow'];
    const leftWrist = keypoints['left_wrist'];
    const rightWrist = keypoints['right_wrist'];
    const leftHip = keypoints['left_hip'];
    const rightHip = keypoints['right_hip'];
    
    // Average shoulder position
    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    
    // Get or set initial position as baseline
    const initialY = currentState.initialY || avgShoulderY;
    newState.initialY = initialY;
    
    // Calculate elbow angles to analyze form
    const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    
    // Average elbow angle
    const elbowAngle = (leftElbowAngle && rightElbowAngle) ? 
                     (leftElbowAngle + rightElbowAngle) / 2 : 
                     (leftElbowAngle || rightElbowAngle);
    
    // Form quality assessment
    let formScore = 0;
    let formFeedback = '';
    
    // Check body alignment (hips shouldn't sag or pike)
    if (leftShoulder && leftHip && leftShoulder.score > 0.5 && leftHip.score > 0.5) {
      // Check if body forms a straight line
      const shoulderToHipY = Math.abs(leftShoulder.y - leftHip.y);
      const idealDistance = 100; // approximate pixel distance for straight body
      const deviation = Math.abs(shoulderToHipY - idealDistance);
      
      if (deviation > 30) {
        if (shoulderToHipY < idealDistance - 30) {
          formFeedback = 'Keep your hips from piking up';
        } else {
          formFeedback = 'Keep your body in a straight line';
        }
        formScore = Math.max(0, 80 - deviation / 2);
      } else {
        formFeedback = 'Good body alignment';
        formScore = 90;
      }
    }
    
    // Determine state based on shoulder height and elbow angle
    const heightDiff = avgShoulderY - initialY;
    
    if (heightDiff > 25) { // Shoulders are lower - DOWN position
      newState.state = 'down';
      
      // Assess push-up depth with elbow angle
      if (elbowAngle && elbowAngle < 90) {
        formFeedback = 'Excellent push-up depth!';
        formScore = Math.max(formScore, 95);
      }
    } else if (heightDiff < 10) { // Shoulders are higher - UP position
      newState.state = 'up';
      
      // Check if arms fully extended at top
      if (elbowAngle && elbowAngle > 160) {
        formFeedback = 'Good arm extension!';
        formScore = Math.max(formScore, 95);
      }
    }
    
    // Count rep when transitioning from DOWN to UP
    if (prevState === 'down' && newState.state === 'up') {
      newState.repCount = prevCount + 1;
      console.log(`✓ PUSH-UP REP! Height diff: ${heightDiff.toFixed(0)}, Count: ${newState.repCount}`);
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `Push-up | Height: ${heightDiff.toFixed(0)}px, Elbow: ${elbowAngle?.toFixed(0) || 'N/A'}°, State: ${newState.state}, Score: ${formScore.toFixed(0)}`;
    
    return newState;
  };
  
  /**
   * Plank detection (timed exercise)
   */
  const detectPlank = (keypoints, currentState) => {
    // Get previous state and info
    const prevState = currentState.state || 'waiting';
    const prevCount = currentState.repCount || 0; // Not used for planks
    const prevHoldTime = currentState.holdTime || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount, // Keep this for consistency
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: prevHoldTime, // Track hold time for plank
      lastUpdateTime: currentState.lastUpdateTime || Date.now()
    };
  
    // Check visibility of key points for plank
    const requiredPoints = [
      'left_shoulder', 'right_shoulder', 
      'left_elbow', 'right_elbow',
      'left_hip', 'right_hip',
      'left_knee', 'right_knee',
      'left_ankle', 'right_ankle'
    ];
    
    // Calculate overall confidence
    newState.confidence = getConfidence(requiredPoints, keypoints);
    
    if (newState.confidence < 0.4) {
      newState.debug = 'Body not clearly visible';
      newState.formFeedback = 'Please position camera to see your full body';
      return newState;
    }
    
    // Get key points for plank assessment
    const shoulder = keypoints['left_shoulder'] || keypoints['right_shoulder'];
    const elbow = keypoints['left_elbow'] || keypoints['right_elbow'];
    const hip = keypoints['left_hip'] || keypoints['right_hip'];
    const knee = keypoints['left_knee'] || keypoints['right_knee'];
    const ankle = keypoints['left_ankle'] || keypoints['right_ankle'];
    
    // Form quality assessment
    let formScore = 0;
    let formFeedback = '';
    let isValidPlank = false;
    
    if (shoulder && elbow && hip && knee && ankle) {
      // Validate plank position - body should form a straight line
      
      // Check if elbow is bent around 90 degrees (forearm plank)
      const elbowAngle = calculateAngle(shoulder, elbow, keypoints['left_wrist'] || keypoints['right_wrist']);
      const isElbowCorrect = elbowAngle && elbowAngle < 120;
      
      // Check if body is straight (aligned shoulders, hips, knees, ankles)
      const bodyPoints = [shoulder, hip, knee, ankle];
      const yValues = bodyPoints.map(p => p.y);
      
      // Calculate how straight the body is
      const maxDeviation = Math.max(...yValues) - Math.min(...yValues);
      const isBodyStraight = maxDeviation < 30;
      
      // Hips shouldn't sag or pike
      const hipHeight = hip.y;
      const shoulderKneeMidpoint = (shoulder.y + knee.y) / 2;
      const hipDeviation = Math.abs(hipHeight - shoulderKneeMidpoint);
      const areHipsAligned = hipDeviation < 20;
      
      // Determine if in plank position
      isValidPlank = isElbowCorrect && isBodyStraight && areHipsAligned;
      
      if (isValidPlank) {
        formScore = 100 - (hipDeviation + maxDeviation/3);
        formScore = Math.max(60, Math.min(95, formScore));
        
        if (formScore > 85) {
          formFeedback = 'Excellent plank form!';
        } else if (formScore > 70) {
          formFeedback = 'Good plank position';
        } else {
          formFeedback = 'Try to keep your body in a straight line';
        }
      } else {
        // Form correction feedback
        if (!isElbowCorrect) {
          formFeedback = 'Position your elbows under your shoulders';
          formScore = 40;
        } else if (!isBodyStraight) {
          formFeedback = 'Try to form a straight line with your body';
          formScore = 50;
        } else if (!areHipsAligned) {
          formFeedback = 'Keep your hips in line with shoulders and knees';
          formScore = 60;
        }
      }
    }
    
    // Determine plank state - we use 'holding' for valid plank
    if (isValidPlank) {
      // Update hold time since we're in a valid plank
      const now = Date.now();
      const timeDiffMs = now - (newState.lastUpdateTime || now);
      
      // Update time only if reasonable (handles large gaps in detection)
      if (timeDiffMs > 0 && timeDiffMs < 500) {
        newState.holdTime = prevHoldTime + (timeDiffMs / 1000); // Convert ms to seconds
      }
      
      newState.lastUpdateTime = now;
      newState.state = 'holding';
    } else {
      // Not in plank position
      newState.state = 'invalid';
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `Plank | State: ${newState.state}, Hold: ${newState.holdTime.toFixed(1)}s, Score: ${formScore.toFixed(0)}, ${formFeedback}`;
    
    return newState;
  };
  
  /**
   * Jumping Jacks detection
   */
  const detectJumpingJacks = (keypoints, currentState) => {
    // Get previous state
    const prevState = currentState.state || 'arms_down';
    const prevCount = currentState.repCount || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: 0
    };
  
    // Check visibility of key points for jumping jacks
    const requiredPoints = [
      'left_shoulder', 'right_shoulder', 
      'left_elbow', 'right_elbow',
      'left_wrist', 'right_wrist',
      'left_hip', 'right_hip',
      'left_knee', 'right_knee',
      'left_ankle', 'right_ankle'
    ];
    
    // Calculate overall confidence
    newState.confidence = getConfidence(requiredPoints, keypoints);
    
    if (newState.confidence < 0.4) {
      newState.debug = 'Body not clearly visible';
      newState.formFeedback = 'Please position camera to see your full body';
      return newState;
    }
    
    // For jumping jacks, we track:
    // 1. Arm position (up/down)
    // 2. Leg position (together/apart)
    const leftWrist = keypoints['left_wrist'];
    const rightWrist = keypoints['right_wrist'];
    const leftShoulder = keypoints['left_shoulder'];
    const rightShoulder = keypoints['right_shoulder'];
    const leftAnkle = keypoints['left_ankle'];
    const rightAnkle = keypoints['right_ankle'];
    const leftHip = keypoints['left_hip'];
    const rightHip = keypoints['right_hip'];
    const leftElbow = keypoints['left_elbow'];
    const rightElbow = keypoints['right_elbow'];
    
    // Check arm position
    let armsUp = false;
    if (leftWrist && rightWrist && leftShoulder && rightShoulder) {
      // Arms are up if wrists are above shoulders
      const leftArmUp = leftWrist.y < leftShoulder.y - 30;
      const rightArmUp = rightWrist.y < rightShoulder.y - 30;
      armsUp = leftArmUp && rightArmUp;
    }
    
    // Check leg position
    let legsApart = false;
    if (leftAnkle && rightAnkle) {
      // Legs are apart if ankles have significant horizontal separation
      const ankleDistance = Math.abs(leftAnkle.x - rightAnkle.x);
      legsApart = ankleDistance > 50;
    }
    
    // Form quality assessment
    let formScore = 0;
    let formFeedback = '';
    
    // Check arm & leg synchronization
    const isCoordinated = (armsUp && legsApart) || (!armsUp && !legsApart);
    
    if (isCoordinated) {
      formScore = 90;
      formFeedback = 'Good coordination!';
    } else {
      formScore = 60;
      formFeedback = 'Try to coordinate arms and legs';
    }
    
    // Check arm extension
    if (armsUp) {
      // Check if arms are fully extended
      const leftArmAngle = calculateAngle(
        leftShoulder,
        leftElbow,
        leftWrist
      );
      
      const rightArmAngle = calculateAngle(
        rightShoulder,
        rightElbow,
        rightWrist
      );
      
      const avgArmAngle = (leftArmAngle && rightArmAngle) ? 
                          (leftArmAngle + rightArmAngle) / 2 : 
                          (leftArmAngle || rightArmAngle);
      
      if (avgArmAngle && avgArmAngle > 150) {
        formScore = Math.max(formScore, 95);
        formFeedback = 'Excellent arm extension!';
      }
    }
    
    // Determine jumping jack state
    if (armsUp && legsApart) {
      newState.state = 'arms_up';
    } else if (!armsUp && !legsApart) {
      newState.state = 'arms_down';
    }
    // else keep previous state to avoid oscillation
    
    // Count rep when completing a full jumping jack cycle
    // A complete rep: arms_down -> arms_up -> arms_down
    if (prevState === 'arms_up' && newState.state === 'arms_down') {
      newState.repCount = prevCount + 1;
      console.log(`✓ JUMPING JACK REP! Count: ${newState.repCount}`);
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `Jumping Jack | Arms: ${armsUp ? 'Up' : 'Down'}, Legs: ${legsApart ? 'Apart' : 'Together'}, State: ${newState.state}, Score: ${formScore.toFixed(0)}`;
    
    return newState;
  };
  
  /**
   * Lunge detection (similar to squat but tracking front knee)
   */
  const detectLunge = (keypoints, currentState) => {
    // Get previous state
    const prevState = currentState.state || 'up';
    const prevCount = currentState.repCount || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: 0
    };
  
    // Check visibility of key points for lunge
    const leftLegPoints = ['left_hip', 'left_knee', 'left_ankle'];
    const rightLegPoints = ['right_hip', 'right_knee', 'right_ankle'];
    
    const leftConfidence = getConfidence(leftLegPoints, keypoints);
    const rightConfidence = getConfidence(rightLegPoints, keypoints);
    
    // Use the most visible leg for tracking
    let side = 'none';
    if (leftConfidence > 0.5 && leftConfidence >= rightConfidence) {
      side = 'left';
      newState.confidence = leftConfidence;
    } else if (rightConfidence > 0.5) {
      side = 'right';
      newState.confidence = rightConfidence;
    } else {
      newState.debug = 'Legs not clearly visible';
      newState.formFeedback = 'Please position yourself so your legs are visible';
      return newState;
    }
    
    // Get relevant leg keypoints
    const hip = keypoints[`${side}_hip`];
    const knee = keypoints[`${side}_knee`];
    const ankle = keypoints[`${side}_ankle`];
    
    // Calculate knee angle - primary metric for lunge depth
    const kneeAngle = calculateAngle(hip, knee, ankle);
    
    // Form quality assessment
    let formScore = 0;
    let formFeedback = '';
    
    // For lunges, check front knee alignment (should stay over ankle, not past toes)
    if (knee && ankle) {
      const kneeX = knee.x;
      const ankleX = ankle.x;
      const kneeOverToes = Math.abs(kneeX - ankleX);
      
      if (kneeOverToes > 40) {
        formFeedback = 'Keep front knee aligned over ankle';
        formScore = Math.max(0, 70 - kneeOverToes / 2);
      } else {
        formFeedback = 'Good knee alignment';
        formScore = 90;
      }
    }
    
    // Determine lunge state based on knee angle
    if (kneeAngle) {
      if (kneeAngle < 110) { // Deep lunge
        newState.state = 'down';
        
        // Assess lunge depth
        if (kneeAngle < 90) {
          formFeedback = 'Great lunge depth!';
          formScore = Math.max(formScore, 95);
        }
      } else if (kneeAngle > 160) { // Standing position
        newState.state = 'up';
        
        if (kneeAngle > 170) {
          formFeedback = 'Good extension!';
          formScore = Math.max(formScore, 90);
        }
      }
      
      // Count rep when transitioning from DOWN to UP (completing the lunge)
      if (prevState === 'down' && newState.state === 'up') {
        newState.repCount = prevCount + 1;
        console.log(`✓ LUNGE REP! Angle: ${kneeAngle.toFixed(0)}°, Count: ${newState.repCount}`);
      }
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `Lunge | Leg: ${side}, Knee Angle: ${kneeAngle?.toFixed(0) || 'N/A'}°, State: ${newState.state}, Score: ${formScore.toFixed(0)}`;
    
    return newState;
  };
  
  /**
   * Calf Raise detection (tracks ankle height)
   */
  const detectCalfRaise = (keypoints, currentState) => {
    // Get previous state
    const prevState = currentState.state || 'down';
    const prevCount = currentState.repCount || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: 0
    };
  
    // Check visibility of key points
    const leftLegPoints = ['left_knee', 'left_ankle'];
    const rightLegPoints = ['right_knee', 'right_ankle'];
    
    const leftConfidence = getConfidence(leftLegPoints, keypoints);
    const rightConfidence = getConfidence(rightLegPoints, keypoints);
    
    // Use the most visible leg for tracking
    let side = 'none';
    if (leftConfidence > 0.5 && leftConfidence >= rightConfidence) {
      side = 'left';
      newState.confidence = leftConfidence;
    } else if (rightConfidence > 0.5) {
      side = 'right';
      newState.confidence = rightConfidence;
    } else {
      newState.debug = 'Ankles not clearly visible';
      newState.formFeedback = 'Please position camera to see your legs and feet';
      return newState;
    }
    
    // Get key points for tracking
    const knee = keypoints[`${side}_knee`];
    const ankle = keypoints[`${side}_ankle`];
    
    // Calculate baseline position if not already set
    if (!currentState.baselineY) {
      newState.baselineY = ankle.y;
      newState.debug = 'Setting baseline position';
      return newState;
    }
    
    // Preserve the baseline
    newState.baselineY = currentState.baselineY;
    
    // Calculate ankle rise height
    const ankleRise = newState.baselineY - ankle.y;
    
    // Form quality assessment
    let formScore = 0;
    let formFeedback = '';
    
    // Basic form check - knees should remain straight
    const ankleKneeVertical = Math.abs(ankle.x - knee.x);
    
    if (ankleKneeVertical > 30) {
      formFeedback = 'Keep your legs straight';
      formScore = 70;
    } else {
      formFeedback = 'Good alignment';
      formScore = 90;
    }
    
    // Determine state based on ankle height
    if (ankleRise > 20) { // Heels raised
      newState.state = 'up';
      
      // Additional form feedback for good rise
      if (ankleRise > 40) {
        formFeedback = 'Great height on calf raise!';
        formScore = 95;
      }
    } else { // Heels down
      newState.state = 'down';
    }
    
    // Count rep when transitioning from UP to DOWN
    if (prevState === 'up' && newState.state === 'down') {
      newState.repCount = prevCount + 1;
      console.log(`✓ CALF RAISE REP! Height: ${ankleRise.toFixed(0)}px, Count: ${newState.repCount}`);
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `Calf Raise | Rise: ${ankleRise.toFixed(0)}px, State: ${newState.state}, Score: ${formScore.toFixed(0)}`;
    
    return newState;
  };
  
  /**
   * Overhead Press detection (tracks wrist height relative to shoulders)
   */
  const detectOverheadPress = (keypoints, currentState) => {
    // Get previous state
    const prevState = currentState.state || 'down';
    const prevCount = currentState.repCount || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: 0
    };
  
    // Check visibility of key points
    const requiredPoints = [
      'left_shoulder', 'right_shoulder', 
      'left_elbow', 'right_elbow',
      'left_wrist', 'right_wrist'
    ];
    
    // Calculate overall confidence
    newState.confidence = getConfidence(requiredPoints, keypoints);
    
    if (newState.confidence < 0.4) {
      newState.debug = 'Arms not clearly visible';
      newState.formFeedback = 'Please position camera to see your arms and shoulders';
      return newState;
    }
    
    // Get key points
    const leftShoulder = keypoints['left_shoulder'];
    const rightShoulder = keypoints['right_shoulder'];
    const leftElbow = keypoints['left_elbow'];
    const rightElbow = keypoints['right_elbow'];
    const leftWrist = keypoints['left_wrist'];
    const rightWrist = keypoints['right_wrist'];
    
    // Calculate elbow angles to analyze form
    const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    
    // Average elbow angle
    const elbowAngle = (leftElbowAngle && rightElbowAngle) ? 
                      (leftElbowAngle + rightElbowAngle) / 2 : 
                      (leftElbowAngle || rightElbowAngle);
    
    // Calculate wrist position relative to shoulders
    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const avgWristY = (leftWrist.y + rightWrist.y) / 2;
    const wristToShoulderY = avgShoulderY - avgWristY;
    
    // Form quality assessment
    let formScore = 0;
    let formFeedback = '';
    
    // Check alignment - wrists should be stacked over shoulders
    const avgShoulderX = (leftShoulder.x + rightShoulder.x) / 2;
    const avgWristX = (leftWrist.x + rightWrist.x) / 2;
    const horizontalDeviation = Math.abs(avgWristX - avgShoulderX);
    
    if (horizontalDeviation > 50) {
      formFeedback = 'Keep weights stacked over shoulders';
      formScore = Math.max(50, 80 - horizontalDeviation / 5);
    } else {
      formFeedback = 'Good alignment';
      formScore = 90;
    }
    
    // Determine state based on wrist position
    if (wristToShoulderY > 80) { // Arms overhead
      newState.state = 'up';
      
      // Check arm extension
      if (elbowAngle && elbowAngle > 160) {
        formFeedback = 'Great arm extension!';
        formScore = 95;
      }
    } else if (wristToShoulderY < 0) { // Arms below shoulders
      newState.state = 'down';
    }
    
    // Count rep when transitioning from DOWN to UP
    if (prevState === 'down' && newState.state === 'up') {
      newState.repCount = prevCount + 1;
      console.log(`✓ OVERHEAD PRESS REP! Wrist-Shoulder: ${wristToShoulderY.toFixed(0)}px, Count: ${newState.repCount}`);
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `Overhead Press | Height: ${wristToShoulderY.toFixed(0)}px, Elbow: ${elbowAngle?.toFixed(0) || 'N/A'}°, State: ${newState.state}, Score: ${formScore.toFixed(0)}`;
    
    return newState;
  };
  
  /**
   * Lateral Raise detection (tracks wrist height relative to shoulders)
   */
  const detectLateralRaise = (keypoints, currentState) => {
    // Get previous state
    const prevState = currentState.state || 'down';
    const prevCount = currentState.repCount || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: 0
    };
  
    // Check visibility of key points
    const requiredPoints = [
      'left_shoulder', 'right_shoulder', 
      'left_elbow', 'right_elbow',
      'left_wrist', 'right_wrist'
    ];
    
    // Calculate overall confidence
    newState.confidence = getConfidence(requiredPoints, keypoints);
    
    if (newState.confidence < 0.4) {
      newState.debug = 'Arms not clearly visible';
      newState.formFeedback = 'Please position camera to see your arms and shoulders';
      return newState;
    }
    
    // Get key points
    const leftShoulder = keypoints['left_shoulder'];
    const rightShoulder = keypoints['right_shoulder'];
    const leftElbow = keypoints['left_elbow'];
    const rightElbow = keypoints['right_elbow'];
    const leftWrist = keypoints['left_wrist'];
    const rightWrist = keypoints['right_wrist'];
    
    // Calculate elbow angles to analyze form
    const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    
    // Average elbow angle
    const elbowAngle = (leftElbowAngle && rightElbowAngle) ? 
                      (leftElbowAngle + rightElbowAngle) / 2 : 
                      (leftElbowAngle || rightElbowAngle);
    
    // For lateral raises, we look at the height of the elbows relative to shoulders
    const leftElbowHeight = leftShoulder.y - leftElbow.y;
    const rightElbowHeight = rightShoulder.y - rightElbow.y;
    const avgElbowHeight = (leftElbowHeight + rightElbowHeight) / 2;
    
    // Form quality assessment
    let formScore = 0;
    let formFeedback = '';
    
    // Check elbow position and extension
    if (elbowAngle) {
      if (elbowAngle < 150) {
        formFeedback = 'Keep arms straighter during raise';
        formScore = 70;
      } else {
        formFeedback = 'Good arm position';
        formScore = 90;
      }
    }
    
    // Determine state based on elbow height relative to shoulders
    if (avgElbowHeight > 0) { // Elbows above shoulders - arms raised
      newState.state = 'up';
      
      // Check arm height
      if (avgElbowHeight > 20) {
        formFeedback = 'Great height on lateral raise!';
        formScore = 95;
      }
    } else { // Elbows below shoulders - arms down
      newState.state = 'down';
    }
    
    // Count rep when transitioning from UP to DOWN
    if (prevState === 'up' && newState.state === 'down') {
      newState.repCount = prevCount + 1;
      console.log(`✓ LATERAL RAISE REP! Elbow Height: ${avgElbowHeight.toFixed(0)}px, Count: ${newState.repCount}`);
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `Lateral Raise | Elbow Height: ${avgElbowHeight.toFixed(0)}px, Angle: ${elbowAngle?.toFixed(0) || 'N/A'}°, State: ${newState.state}, Score: ${formScore.toFixed(0)}`;
    
    return newState;
  };
  
  /**
   * Front Raise detection (similar to lateral raise but tracking forward movement)
   */
  const detectFrontRaise = (keypoints, currentState) => {
    // Get previous state
    const prevState = currentState.state || 'down';
    const prevCount = currentState.repCount || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: 0
    };
  
    // Check visibility of key points for front raises
    const leftArmPoints = ['left_shoulder', 'left_elbow', 'left_wrist'];
    const rightArmPoints = ['right_shoulder', 'right_elbow', 'right_wrist'];
    
    const leftConfidence = getConfidence(leftArmPoints, keypoints);
    const rightConfidence = getConfidence(rightArmPoints, keypoints);
    
    // Use the most visible arm for tracking
    let side = 'none';
    if (leftConfidence > 0.5 && leftConfidence >= rightConfidence) {
      side = 'left';
      newState.confidence = leftConfidence;
    } else if (rightConfidence > 0.5) {
      side = 'right';
      newState.confidence = rightConfidence;
    } else {
      newState.debug = 'Arms not clearly visible';
      newState.formFeedback = 'Please position camera to see your arms clearly';
      return newState;
    }
    
    // Get key points for selected arm
    const shoulder = keypoints[`${side}_shoulder`];
    const elbow = keypoints[`${side}_elbow`];
    const wrist = keypoints[`${side}_wrist`];
    
    // Calculate elbow angle to analyze form
    const elbowAngle = calculateAngle(shoulder, elbow, wrist);
    
    // Calculate wrist height relative to shoulder
    const wristHeight = shoulder.y - wrist.y;
    
    // Form quality assessment
    let formScore = 0;
    let formFeedback = '';
    
    // Check arm position
    if (elbowAngle) {
      if (elbowAngle < 150) {
        formFeedback = 'Keep arms straighter during raise';
        formScore = 70;
      } else {
        formFeedback = 'Good arm position';
        formScore = 90;
      }
    }
    
    // Determine state based on wrist height
    if (wristHeight > 20) { // Wrists above shoulder level - arm raised
      newState.state = 'up';
      
      // Check arm height for additional feedback
      if (wristHeight > 50) {
        formFeedback = 'Good height on front raise!';
        formScore = 95;
      }
    } else { // Wrists below shoulder level - arm down
      newState.state = 'down';
    }
    
    // Count rep when transitioning from UP to DOWN
    if (prevState === 'up' && newState.state === 'down') {
      newState.repCount = prevCount + 1;
      console.log(`✓ FRONT RAISE REP! Wrist Height: ${wristHeight.toFixed(0)}px, Count: ${newState.repCount}`);
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `Front Raise | Arm: ${side}, Wrist Height: ${wristHeight.toFixed(0)}px, Angle: ${elbowAngle?.toFixed(0) || 'N/A'}°, State: ${newState.state}, Score: ${formScore.toFixed(0)}`;
    
    return newState;
  };
  
  /**
   * Tricep Dip detection (track shoulder height)
   */
  const detectTricepDip = (keypoints, currentState) => {
    // Get previous state
    const prevState = currentState.state || 'up';
    const prevCount = currentState.repCount || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: 0
    };
  
    // Check visibility of key points for tricep dips
    const requiredPoints = [
      'left_shoulder', 'right_shoulder', 
      'left_elbow', 'right_elbow',
      'left_wrist', 'right_wrist'
    ];
    
    // Calculate overall confidence
    newState.confidence = getConfidence(requiredPoints, keypoints);
    
    if (newState.confidence < 0.4) {
      newState.debug = 'Arms not clearly visible';
      newState.formFeedback = 'Please position camera to see your upper body';
      return newState;
    }
    
    // Get key points
    const leftShoulder = keypoints['left_shoulder'];
    const rightShoulder = keypoints['right_shoulder'];
    const leftElbow = keypoints['left_elbow'];
    const rightElbow = keypoints['right_elbow'];
    const leftWrist = keypoints['left_wrist'];
    const rightWrist = keypoints['right_wrist'];
    
    // Calculate baseline for shoulder height if not set
    if (!currentState.baselineY) {
      const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
      newState.baselineY = avgShoulderY;
      newState.debug = 'Setting baseline position';
      return newState;
    }
    
    // Preserve the baseline
    newState.baselineY = currentState.baselineY;
    
    // Track shoulder height change (key indicator for dips)
    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const shoulderDrop = avgShoulderY - newState.baselineY;
    
    // Calculate elbow angles to analyze form
    const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    
    // Average elbow angle
    const elbowAngle = (leftElbowAngle && rightElbowAngle) ? 
                      (leftElbowAngle + rightElbowAngle) / 2 : 
                      (leftElbowAngle || rightElbowAngle);
    
    // Form quality assessment
    let formScore = 0;
    let formFeedback = '';
    
    // Check shoulder position - shoulders shouldn't roll forward
    const avgShoulderX = (leftShoulder.x + rightShoulder.x) / 2;
    const avgElbowX = (leftElbow.x + rightElbow.x) / 2;
    
    const shoulderForward = avgShoulderX - avgElbowX;
    
    if (shoulderForward > 30) {
      formFeedback = 'Keep shoulders back, don\'t roll forward';
      formScore = 70;
    } else {
      formFeedback = 'Good shoulder position';
      formScore = 90;
    }
    
    // Determine state based on shoulder height and elbow angle
    if (shoulderDrop > 30) { // Lowered position
      newState.state = 'down';
      
      // Check dip depth with elbow angle
      if (elbowAngle && elbowAngle < 90) {
        formFeedback = 'Good dip depth!';
        formScore = 95;
      }
    } else { // Raised position
      newState.state = 'up';
      
      // Check arm extension at top
      if (elbowAngle && elbowAngle > 150) {
        formFeedback = 'Good arm extension at top!';
        formScore = 95;
      }
    }
    
    // Count rep when transitioning from DOWN to UP
    if (prevState === 'down' && newState.state === 'up') {
      newState.repCount = prevCount + 1;
      console.log(`✓ TRICEP DIP REP! Shoulder Drop: ${shoulderDrop.toFixed(0)}px, Count: ${newState.repCount}`);
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `Tricep Dip | Shoulder Drop: ${shoulderDrop.toFixed(0)}px, Elbow: ${elbowAngle?.toFixed(0) || 'N/A'}°, State: ${newState.state}, Score: ${formScore.toFixed(0)}`;
    
    return newState;
  };
  
  /**
   * Bench Press detection (similar to push-up but with arms more perpendicular to body)
   */
  const detectBenchPress = (keypoints, currentState) => {
    // Similar to push-up detection but adjusted for bench press specifics
    // Get previous state
    const prevState = currentState.state || 'up';
    const prevCount = currentState.repCount || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: 0
    };
  
    // Check visibility of key points
    const requiredPoints = [
      'left_shoulder', 'right_shoulder', 
      'left_elbow', 'right_elbow',
      'left_wrist', 'right_wrist'
    ];
    
    // Calculate overall confidence
    newState.confidence = getConfidence(requiredPoints, keypoints);
    
    if (newState.confidence < 0.4) {
      newState.debug = 'Arms not clearly visible';
      newState.formFeedback = 'Please position camera to see your arms and chest';
      return newState;
    }
    
    // Get key points
    const leftShoulder = keypoints['left_shoulder'];
    const rightShoulder = keypoints['right_shoulder'];
    const leftElbow = keypoints['left_elbow'];
    const rightElbow = keypoints['right_elbow'];
    const leftWrist = keypoints['left_wrist'];
    const rightWrist = keypoints['right_wrist'];
    
    // Calculate elbow angles to analyze form
    const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    
    // Average elbow angle
    const elbowAngle = (leftElbowAngle && rightElbowAngle) ? 
                      (leftElbowAngle + rightElbowAngle) / 2 : 
                      (leftElbowAngle || rightElbowAngle);
    
    // Calculate wrist height relative to shoulders
    const avgWristY = (leftWrist.y + rightWrist.y) / 2;
    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const wristHeight = avgShoulderY - avgWristY;
    
    // Form quality assessment
    let formScore = 0;
    let formFeedback = '';
    
    // Check elbow position (should not flare out too much)
    const elbowWidth = Math.abs(leftElbow.x - rightElbow.x);
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
    const elbowFlare = elbowWidth - shoulderWidth;
    
    if (elbowFlare > 30) {
      formFeedback = 'Keep elbows closer to body';
      formScore = Math.max(60, 85 - elbowFlare / 5);
    } else {
      formFeedback = 'Good elbow position';
      formScore = 90;
    }
    
    // Determine state based on elbow angle
    if (elbowAngle < 90) { // Arms bent
      newState.state = 'down';
      
      // Check for good depth
      if (elbowAngle < 60) {
        formFeedback = 'Good bench press depth!';
        formScore = 95;
      }
    } else if (elbowAngle > 150 || wristHeight > 50) { // Arms extended
      newState.state = 'up';
      
      // Check for full extension
      if (elbowAngle > 170) {
        formFeedback = 'Good arm extension!';
        formScore = 95;
      }
    }
    
    // Count rep when transitioning from DOWN to UP
    if (prevState === 'down' && newState.state === 'up') {
      newState.repCount = prevCount + 1;
      console.log(`✓ BENCH PRESS REP! Angle: ${elbowAngle.toFixed(0)}°, Count: ${newState.repCount}`);
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `Bench Press | Elbow Angle: ${elbowAngle?.toFixed(0) || 'N/A'}°, State: ${newState.state}, Score: ${formScore.toFixed(0)}`;
    
    return newState;
  };
  
  /**
   * Bent-Over Row detection
   */
  const detectBentOverRow = (keypoints, currentState) => {
    // Get previous state
    const prevState = currentState.state || 'down';
    const prevCount = currentState.repCount || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: 0
    };
  
    // Check visibility of key points
    const leftArmPoints = ['left_shoulder', 'left_elbow', 'left_wrist'];
    const rightArmPoints = ['right_shoulder', 'right_elbow', 'right_wrist'];
    
    const leftConfidence = getConfidence(leftArmPoints, keypoints);
    const rightConfidence = getConfidence(rightArmPoints, keypoints);
    
    // Use the most visible arm for tracking
    let side = 'none';
    if (leftConfidence > 0.5 && leftConfidence >= rightConfidence) {
      side = 'left';
      newState.confidence = leftConfidence;
    } else if (rightConfidence > 0.5) {
      side = 'right';
      newState.confidence = rightConfidence;
    } else {
      newState.debug = 'Arms not clearly visible';
      newState.formFeedback = 'Please position camera to see your arms clearly';
      return newState;
    }
    
    // Get key points for selected arm
    const shoulder = keypoints[`${side}_shoulder`];
    const elbow = keypoints[`${side}_elbow`];
    const wrist = keypoints[`${side}_wrist`];
    const hip = keypoints[`${side}_hip`];
    
    // Check back angle - should be bent over
    let isProperlyBent = false;
    if (shoulder && hip) {
      const backAngle = Math.atan2(hip.y - shoulder.y, hip.x - shoulder.x) * 180 / Math.PI;
      isProperlyBent = Math.abs(backAngle) > 20; // Back should be leaning forward
      
      if (!isProperlyBent) {
        newState.debug = 'Please bend forward at the hips for proper row form';
        newState.formFeedback = 'Bend forward at your hips';
        newState.formScore = 50;
        return newState;
      }
    }
    
    // Calculate elbow angle
    const elbowAngle = calculateAngle(shoulder, elbow, wrist);
    
    // Calculate elbow height relative to shoulder
    const elbowToShoulder = shoulder.y - elbow.y;
    
    // Form quality assessment
    let formScore = 0;
    let formFeedback = '';
    
    // Check elbow pull height
    if (elbowToShoulder > 10) {
      formFeedback = 'Good elbow height, pulling to ribcage';
      formScore = 90;
    } else {
      formFeedback = 'Pull elbows higher towards ribcage';
      formScore = 70;
    }
    
    // Determine state based on elbow angle and position
    if (elbowAngle < 90) { // Arms bent, elbows pulled back
      newState.state = 'up';
      
      // Additional quality check
      if (elbowToShoulder > 30) {
        formFeedback = 'Excellent row height!';
        formScore = 95;
      }
    } else if (elbowAngle > 150) { // Arms extended
      newState.state = 'down';
      
      // Check for good extension
      if (elbowAngle > 170) {
        formFeedback = 'Good arm extension!';
        formScore = 90;
      }
    }
    
    // Count rep when transitioning from UP to DOWN
    if (prevState === 'up' && newState.state === 'down') {
      newState.repCount = prevCount + 1;
      console.log(`✓ BENT-OVER ROW REP! Angle: ${elbowAngle.toFixed(0)}°, Count: ${newState.repCount}`);
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `Bent-Over Row | Arm: ${side}, Elbow Angle: ${elbowAngle?.toFixed(0) || 'N/A'}°, Height: ${elbowToShoulder.toFixed(0)}px, State: ${newState.state}, Score: ${formScore.toFixed(0)}`;
    
    return newState;
  };
  
  /**
   * Deadlift detection (tracks hip extension)
   */
  const detectDeadlift = (keypoints, currentState) => {
    // Get previous state
    const prevState = currentState.state || 'down';
    const prevCount = currentState.repCount || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: 0
    };
  
    // Check visibility of key points
    const requiredPoints = [
      'left_shoulder', 'right_shoulder', 
      'left_hip', 'right_hip',
      'left_knee', 'right_knee',
      'left_ankle', 'right_ankle'
    ];
    
    // Calculate overall confidence
    newState.confidence = getConfidence(requiredPoints, keypoints);
    
    if (newState.confidence < 0.4) {
      newState.debug = 'Body not clearly visible';
      newState.formFeedback = 'Please position camera to see your full body from the side';
      return newState;
    }
    
    // Get key points (using one side - ideally should be filmed from the side)
    const side = 'left'; // Could determine this based on visibility
    const shoulder = keypoints[`${side}_shoulder`];
    const hip = keypoints[`${side}_hip`];
    const knee = keypoints[`${side}_knee`];
    const ankle = keypoints[`${side}_ankle`];
    
    // Calculate hip angle (between shoulder, hip, knee)
    const hipAngle = calculateAngle(shoulder, hip, knee);
    
    // Form quality assessment
    let formScore = 0;
    let formFeedback = '';
    
    // Check back position - should stay straight
    if (shoulder && hip) {
      const torsoLine = Math.abs(shoulder.x - hip.x);
      
      if (torsoLine > 40) {
        formFeedback = 'Keep your back straight';
        formScore = 70;
      } else {
        formFeedback = 'Good back position';
        formScore = 90;
      }
    }
    
    // Determine state based on hip angle
    if (hipAngle < 120) { // Hips bent (down position)
      newState.state = 'down';
    } else if (hipAngle > 160) { // Hips extended (standing tall)
      newState.state = 'up';
      
      // Check for full hip extension
      if (hipAngle > 170) {
        formFeedback = 'Good hip extension!';
        formScore = 95;
      }
    }
    
    // Count rep when transitioning from DOWN to UP
    if (prevState === 'down' && newState.state === 'up') {
      newState.repCount = prevCount + 1;
      console.log(`✓ DEADLIFT REP! Hip Angle: ${hipAngle.toFixed(0)}°, Count: ${newState.repCount}`);
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `Deadlift | Hip Angle: ${hipAngle?.toFixed(0) || 'N/A'}°, State: ${newState.state}, Score: ${formScore.toFixed(0)}`;
    
    return newState;
  };
  
  /**
   * Glute Bridge detection (tracks hip extension)
   */
  const detectGluteBridge = (keypoints, currentState) => {
    // Get previous state
    const prevState = currentState.state || 'down';
    const prevCount = currentState.repCount || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: 0
    };
  
    // Check visibility of key points
    const requiredPoints = [
      'left_shoulder', 'right_shoulder', 
      'left_hip', 'right_hip',
      'left_knee', 'right_knee'
    ];
    
    // Calculate overall confidence
    newState.confidence = getConfidence(requiredPoints, keypoints);
    
    if (newState.confidence < 0.4) {
      newState.debug = 'Body not clearly visible';
      newState.formFeedback = 'Please position camera to see your body from the side';
      return newState;
    }
    
    // Get key points (from the side)
    const shoulder = keypoints['left_shoulder'] || keypoints['right_shoulder'];
    const hip = keypoints['left_hip'] || keypoints['right_hip'];
    const knee = keypoints['left_knee'] || keypoints['right_knee'];
    
    // Calculate hip position relative to shoulders and knees
    const hipToShoulderY = hip.y - shoulder.y;
    const hipToKneeY = hip.y - knee.y;
    
    // Use the hip position relative to a baseline (if no baseline, use shoulder height)
    if (!currentState.baselineY) {
      newState.baselineY = hip.y;
      newState.debug = 'Setting baseline position';
      return newState;
    }
    
    // Preserve the baseline
    newState.baselineY = currentState.baselineY;
    
    // Calculate hip rise - how much the hips have risen from baseline
    const hipRise = newState.baselineY - hip.y;
    
    // Form quality assessment
    let formScore = 0;
    let formFeedback = '';
    
    // Determine state based on hip position
    if (hipRise > 30) { // Hips raised
      newState.state = 'up';
      
      // Check alignment - shoulders, hips, and knees should form a straight line at top
      const shoulderKneeHeight = Math.abs(shoulder.y - knee.y);
      const hipDeviation = Math.abs(hip.y - ((shoulder.y + knee.y) / 2));
      
      if (hipDeviation < 15) {
        formFeedback = 'Excellent hip extension!';
        formScore = 95;
      } else if (hipDeviation < 30) {
        formFeedback = 'Good bridge position';
        formScore = 85;
      } else {
        formFeedback = 'Raise hips higher for full extension';
        formScore = 70;
      }
    } else { // Hips low/on ground
      newState.state = 'down';
    }
    
    // Count rep when transitioning from UP to DOWN
    if (prevState === 'up' && newState.state === 'down') {
      newState.repCount = prevCount + 1;
      console.log(`✓ GLUTE BRIDGE REP! Hip Rise: ${hipRise.toFixed(0)}px, Count: ${newState.repCount}`);
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `Glute Bridge | Hip Rise: ${hipRise.toFixed(0)}px, State: ${newState.state}, Score: ${formScore.toFixed(0)}`;
    
    return newState;
  };
  
  /**
   * Russian Twist detection (tracks torso rotation)
   */
  const detectRussianTwist = (keypoints, currentState) => {
    // Get previous state
    const prevState = currentState.state || 'center';
    const prevCount = currentState.repCount || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: 0
    };
  
    // Check visibility of key points
    const requiredPoints = [
      'left_shoulder', 'right_shoulder', 
      'left_hip', 'right_hip',
      'left_wrist', 'right_wrist'
    ];
    
    // Calculate overall confidence
    newState.confidence = getConfidence(requiredPoints, keypoints);
    
    if (newState.confidence < 0.4) {
      newState.debug = 'Body not clearly visible';
      newState.formFeedback = 'Please position camera to see your upper body clearly';
      return newState;
    }
    
    // Get key points
    const leftShoulder = keypoints['left_shoulder'];
    const rightShoulder = keypoints['right_shoulder'];
    const leftWrist = keypoints['left_wrist'];
    const rightWrist = keypoints['right_wrist'];
    const leftHip = keypoints['left_hip'];
    const rightHip = keypoints['right_hip'];
    
    // Calculate baseline center position if not set
    if (!currentState.centerX) {
      const avgWristX = (leftWrist.x + rightWrist.x) / 2;
      const avgShoulderX = (leftShoulder.x + rightShoulder.x) / 2;
      newState.centerX = avgWristX;
      newState.debug = 'Setting center position';
      return newState;
    }
    
    // Preserve the center position
    newState.centerX = currentState.centerX;
    
    // Calculate wrist position relative to center (to track rotation)
    const avgWristX = (leftWrist.x + rightWrist.x) / 2;
    const wristOffset = avgWristX - newState.centerX;
    
    // Form quality assessment
    let formScore = 0;
    let formFeedback = '';
    
    // Check torso position - should be V-sitting
    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const avgHipY = (leftHip.y + rightHip.y) / 2;
    const torsoAngle = Math.abs(avgShoulderY - avgHipY);
    
    if (torsoAngle < 30) {
      formFeedback = 'Lean back more for proper V-sit position';
      formScore = 60;
    } else {
      formFeedback = 'Good V-sit position';
      formScore = 90;
    }
    
    // Determine state based on wrist position (rotation)
    if (wristOffset > 40) { // Rotated right
      newState.state = 'right';
    } else if (wristOffset < -40) { // Rotated left
      newState.state = 'left';
    } else { // Center
      newState.state = 'center';
    }
    
    // Count rep on each side rotation
    // For Russian Twist, we count a rep for each side
    if ((prevState === 'center' && (newState.state === 'left' || newState.state === 'right')) || 
        (prevState === 'left' && newState.state === 'right') || 
        (prevState === 'right' && newState.state === 'left')) {
      newState.repCount = prevCount + 1;
      console.log(`✓ RUSSIAN TWIST REP! Direction: ${newState.state}, Count: ${newState.repCount}`);
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `Russian Twist | Offset: ${wristOffset.toFixed(0)}px, State: ${newState.state}, Score: ${formScore.toFixed(0)}`;
    
    return newState;
  };
  
  /**
   * Leg Raise detection (tracks leg height)
   */
  const detectLegRaise = (keypoints, currentState) => {
    // Get previous state
    const prevState = currentState.state || 'down';
    const prevCount = currentState.repCount || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: 0
    };
  
    // Check visibility of key points
    const leftLegPoints = ['left_hip', 'left_knee', 'left_ankle'];
    const rightLegPoints = ['right_hip', 'right_knee', 'right_ankle'];
    
    const leftConfidence = getConfidence(leftLegPoints, keypoints);
    const rightConfidence = getConfidence(rightLegPoints, keypoints);
    
    // Use the most visible leg for tracking
    let side = 'none';
    if (leftConfidence > 0.5 && leftConfidence >= rightConfidence) {
      side = 'left';
      newState.confidence = leftConfidence;
    } else if (rightConfidence > 0.5) {
      side = 'right';
      newState.confidence = rightConfidence;
    } else {
      newState.debug = 'Legs not clearly visible';
      newState.formFeedback = 'Please position camera to see your legs clearly';
      return newState;
    }
    
    // Get key points
    const hip = keypoints[`${side}_hip`];
    const knee = keypoints[`${side}_knee`];
    const ankle = keypoints[`${side}_ankle`];
    
    // Calculate baseline position if not set
    if (!currentState.baselineY) {
      newState.baselineY = ankle.y;
      newState.debug = 'Setting baseline position';
      return newState;
    }
    
    // Preserve the baseline
    newState.baselineY = currentState.baselineY;
    
    // Calculate ankle/leg rise
    const legRise = newState.baselineY - ankle.y;
    
    // Calculate knee angle to check for straight legs
    const kneeAngle = calculateAngle(hip, knee, ankle);
    
    // Form quality assessment
    let formScore = 0;
    let formFeedback = '';
    
    // Check leg straightness
    if (kneeAngle) {
      if (kneeAngle < 150) {
        formFeedback = 'Keep legs straighter during raises';
        formScore = 70;
      } else {
        formFeedback = 'Good leg position';
        formScore = 90;
      }
    }
    
    // Determine state based on leg height
    if (legRise > 50) { // Legs raised
      newState.state = 'up';
      
      // Check leg height for additional feedback
      if (legRise > 100) {
        formFeedback = 'Excellent leg raise height!';
        formScore = 95;
      }
    } else { // Legs down
      newState.state = 'down';
    }
    
    // Count rep when transitioning from UP to DOWN
    if (prevState === 'up' && newState.state === 'down') {
      newState.repCount = prevCount + 1;
      console.log(`✓ LEG RAISE REP! Height: ${legRise.toFixed(0)}px, Count: ${newState.repCount}`);
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `Leg Raise | Leg: ${side}, Height: ${legRise.toFixed(0)}px, Knee Angle: ${kneeAngle?.toFixed(0) || 'N/A'}°, State: ${newState.state}, Score: ${formScore.toFixed(0)}`;
    
    return newState;
  };
  
  /**
   * Bicycle Crunch detection (tracks elbow-knee connection)
   * Counts a rep for each side twist (left and right)
   */
  const detectBicycleCrunch = (keypoints, currentState) => {
    // Get previous state
    const prevState = currentState.state || 'neutral';
    const prevCount = currentState.repCount || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: 0
    };
  
    // Check visibility of key points
    const requiredPoints = [
      'left_shoulder', 'right_shoulder',
      'left_elbow', 'right_elbow',
      'left_hip', 'right_hip',
      'left_knee', 'right_knee'
    ];
    
    // Calculate overall confidence
    newState.confidence = getConfidence(requiredPoints, keypoints);
    
    if (newState.confidence < 0.4) {
      newState.debug = 'Body not clearly visible';
      newState.formFeedback = 'Please position camera to see your full body';
      return newState;
    }
    
    // Get key points
    const leftElbow = keypoints['left_elbow'];
    const rightElbow = keypoints['right_elbow'];
    const leftKnee = keypoints['left_knee'];
    const rightKnee = keypoints['right_knee'];
    const leftHip = keypoints['left_hip'];
    const rightHip = keypoints['right_hip'];
    
    // Calculate distances between opposite elbow and knee
    const leftElbowToRightKnee = Math.sqrt(
      Math.pow(leftElbow.x - rightKnee.x, 2) + 
      Math.pow(leftElbow.y - rightKnee.y, 2)
    );
    
    const rightElbowToLeftKnee = Math.sqrt(
      Math.pow(rightElbow.x - leftKnee.x, 2) + 
      Math.pow(rightElbow.y - leftKnee.y, 2)
    );
    
    // Form quality assessment
    let formScore = 0;
    let formFeedback = '';
    
    // Check torso position - should be lifted off ground
    const avgHipY = (leftHip.y + rightHip.y) / 2;
    const avgShoulderY = (keypoints['left_shoulder'].y + keypoints['right_shoulder'].y) / 2;
    const torsoLift = Math.abs(avgHipY - avgShoulderY);
    
    if (torsoLift < 20) {
      formFeedback = 'Lift upper body more off the ground';
      formScore = 60;
    } else {
      formFeedback = 'Good upper body position';
      formScore = 85;
    }
    
    // Determine state based on elbow-knee proximity
    if (leftElbowToRightKnee < 50) {
      // Left elbow close to right knee
      newState.state = 'left';
      
      if (leftElbowToRightKnee < 30) {
        formFeedback = 'Good twist, connecting elbow and knee!';
        formScore = 95;
      }
    } else if (rightElbowToLeftKnee < 50) {
      // Right elbow close to left knee
      newState.state = 'right';
      
      if (rightElbowToLeftKnee < 30) {
        formFeedback = 'Good twist, connecting elbow and knee!';
        formScore = 95;
      }
    } else {
      // Neither close - neutral/transition position
      newState.state = 'neutral';
    }
    
    // Count rep for each side twist
    // For bicycle crunches, we count a rep for each twist
    if ((prevState === 'left' && newState.state === 'right') || 
        (prevState === 'right' && newState.state === 'left')) {
      newState.repCount = prevCount + 1;
      console.log(`✓ BICYCLE CRUNCH REP! Direction: ${newState.state}, Count: ${newState.repCount}`);
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `Bicycle Crunch | L-to-R: ${leftElbowToRightKnee.toFixed(0)}px, R-to-L: ${rightElbowToLeftKnee.toFixed(0)}px, State: ${newState.state}, Score: ${formScore.toFixed(0)}`;
    
    return newState;
    
    };

    /**
 * Superman exercise detection (tracks shoulder and hip extension)
 */
const detectSuperman = (keypoints, currentState) => {
    // Get previous state
    const prevState = currentState.state || 'down';
    const prevCount = currentState.repCount || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: 0
    };
  
    // Check visibility of key points
    const requiredPoints = [
      'left_shoulder', 'right_shoulder', 
      'left_hip', 'right_hip',
      'left_ankle', 'right_ankle'
    ];
    
    // Calculate overall confidence
    newState.confidence = getConfidence(requiredPoints, keypoints);
    
    if (newState.confidence < 0.4) {
      newState.debug = 'Body not clearly visible';
      newState.formFeedback = 'Please position camera to see your full body from the side';
      return newState;
    }
    
    // Get key points
    const leftShoulder = keypoints['left_shoulder'];
    const rightShoulder = keypoints['right_shoulder'];
    const leftHip = keypoints['left_hip'];
    const rightHip = keypoints['right_hip'];
    const leftAnkle = keypoints['left_ankle'];
    const rightAnkle = keypoints['right_ankle'];
    
    // Calculate baseline if not set (ground position)
    if (!currentState.baselineY) {
      const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
      newState.baselineY = avgShoulderY;
      newState.debug = 'Setting baseline position';
      return newState;
    }
    
    // Preserve the baseline
    newState.baselineY = currentState.baselineY;
    
    // Calculate shoulder and hip lift from baseline
    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const avgHipY = (leftHip.y + rightHip.y) / 2;
    const shoulderLift = newState.baselineY - avgShoulderY;
    const hipLift = newState.baselineY - avgHipY;
    
    // Form quality assessment
    let formScore = 0;
    let formFeedback = '';
    
    // Check body alignment
    const shoulderToHipLift = Math.abs(shoulderLift - hipLift);
    
    if (shoulderToHipLift > 30) {
      formFeedback = 'Try to lift chest and legs evenly';
      formScore = 70;
    } else {
      formFeedback = 'Good balanced lifting';
      formScore = 90;
    }
    
    // Determine state based on lift height
    if (shoulderLift > 20 && hipLift > 20) { // Both lifted - superman position
      newState.state = 'up';
      
      // Check for good height
      const avgLift = (shoulderLift + hipLift) / 2;
      if (avgLift > 40) {
        formFeedback = 'Excellent height on superman!';
        formScore = 95;
      }
    } else { // Not lifted or insufficient height
      newState.state = 'down';
    }
    
    // Count rep when transitioning from UP to DOWN
    if (prevState === 'up' && newState.state === 'down') {
      newState.repCount = prevCount + 1;
      console.log(`✓ SUPERMAN REP! Lift: ${((shoulderLift + hipLift) / 2).toFixed(0)}px, Count: ${newState.repCount}`);
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `Superman | Shoulder: ${shoulderLift.toFixed(0)}px, Hip: ${hipLift.toFixed(0)}px, State: ${newState.state}, Score: ${formScore.toFixed(0)}`;
    
    return newState;
  };
  
  /**
   * Bird Dog exercise detection (tracks opposite arm and leg extension)
   */
  const detectBirdDog = (keypoints, currentState) => {
    // Get previous state
    const prevState = currentState.state || 'neutral';
    const prevCount = currentState.repCount || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: 0
    };
  
    // Check visibility of key points
    const requiredPoints = [
      'left_shoulder', 'right_shoulder', 
      'left_elbow', 'right_elbow',
      'left_wrist', 'right_wrist',
      'left_hip', 'right_hip',
      'left_knee', 'right_knee',
      'left_ankle', 'right_ankle'
    ];
    
    // Calculate overall confidence
    newState.confidence = getConfidence(requiredPoints, keypoints);
    
    if (newState.confidence < 0.4) {
      newState.debug = 'Body not clearly visible';
      newState.formFeedback = 'Please position camera to see your full body from the side';
      return newState;
    }
    
    // Get key points
    const leftShoulder = keypoints['left_shoulder'];
    const rightShoulder = keypoints['right_shoulder'];
    const leftElbow = keypoints['left_elbow'];
    const rightElbow = keypoints['right_elbow'];
    const leftWrist = keypoints['left_wrist'];
    const rightWrist = keypoints['right_wrist'];
    const leftHip = keypoints['left_hip'];
    const rightHip = keypoints['right_hip'];
    const leftKnee = keypoints['left_knee'];
    const rightKnee = keypoints['right_knee'];
    const leftAnkle = keypoints['left_ankle'];
    const rightAnkle = keypoints['right_ankle'];
    
    // Calculate arm and leg extension
    // For right arm:
    const rightArmExtension = rightShoulder.y - rightWrist.y;
    // For left leg:
    const leftLegExtension = leftHip.y - leftAnkle.y;
    
    // For left arm:
    const leftArmExtension = leftShoulder.y - leftWrist.y;
    // For right leg:
    const rightLegExtension = rightHip.y - rightAnkle.y;
    
    // Form quality assessment
    let formScore = 0;
    let formFeedback = '';
    
    // Check for back alignment (should be flat)
    const avgHipY = (leftHip.y + rightHip.y) / 2;
    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const backSlope = Math.abs(avgHipY - avgShoulderY);
    
    if (backSlope > 30) {
      formFeedback = 'Keep your back flat and parallel to the ground';
      formScore = 60;
    } else {
      formFeedback = 'Good back alignment';
      formScore = 90;
    }
    
    // Determine state based on arm and leg extension
    if (rightArmExtension > 20 && leftLegExtension > 20) {
      // Right arm and left leg extended
      newState.state = 'right_arm_left_leg';
      
      // Check extension quality
      if (rightArmExtension > 40 && leftLegExtension > 40) {
        formFeedback = 'Great extension of arm and leg!';
        formScore = 95;
      }
    } else if (leftArmExtension > 20 && rightLegExtension > 20) {
      // Left arm and right leg extended
      newState.state = 'left_arm_right_leg';
      
      // Check extension quality
      if (leftArmExtension > 40 && rightLegExtension > 40) {
        formFeedback = 'Great extension of arm and leg!';
        formScore = 95;
      }
    } else {
      // Neutral/starting position
      newState.state = 'neutral';
    }
    
    // Count rep when returning to neutral from either extended position
    if ((prevState === 'right_arm_left_leg' || prevState === 'left_arm_right_leg') && 
        newState.state === 'neutral') {
      newState.repCount = prevCount + 1;
      console.log(`✓ BIRD DOG REP! Previous: ${prevState}, Count: ${newState.repCount}`);
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `Bird Dog | Right Arm: ${rightArmExtension.toFixed(0)}px, Left Leg: ${leftLegExtension.toFixed(0)}px, Left Arm: ${leftArmExtension.toFixed(0)}px, Right Leg: ${rightLegExtension.toFixed(0)}px, State: ${newState.state}, Score: ${formScore.toFixed(0)}`;
    
    return newState;
  };
  
  /**
   * Burpee detection (tracks multiple movements in sequence)
   */
  const detectBurpee = (keypoints, currentState) => {
    // Get previous state
    const prevState = currentState.state || 'standing';
    const prevCount = currentState.repCount || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: 0,
      sequence: currentState.sequence || ['standing'] // Track burpee sequence
    };
  
    // Check visibility of key points
    const requiredPoints = [
      'left_shoulder', 'right_shoulder', 
      'left_hip', 'right_hip',
      'left_knee', 'right_knee',
      'left_ankle', 'right_ankle'
    ];
    
    // Calculate overall confidence
    newState.confidence = getConfidence(requiredPoints, keypoints);
    
    if (newState.confidence < 0.4) {
      newState.debug = 'Body not clearly visible';
      newState.formFeedback = 'Please position camera to see your full body';
      return newState;
    }
    
    // Get key points
    const leftShoulder = keypoints['left_shoulder'];
    const rightShoulder = keypoints['right_shoulder'];
    const leftHip = keypoints['left_hip'];
    const rightHip = keypoints['right_hip'];
    const leftKnee = keypoints['left_knee'];
    const rightKnee = keypoints['right_knee'];
    const leftAnkle = keypoints['left_ankle'];
    const rightAnkle = keypoints['right_ankle'];
    
    // Calculate average positions
    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const avgHipY = (leftHip.y + rightHip.y) / 2;
    const avgKneeY = (leftKnee.y + rightKnee.y) / 2;
    const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;
    
    // Calculate heights and distances
    const shoulderHeight = avgAnkleY - avgShoulderY;
    const hipHeight = avgAnkleY - avgHipY;
    const kneeHeight = avgAnkleY - avgKneeY;
    
    // Determine body position based on relative heights
    let currentPosition = '';
    
    // Standing: Shoulders high, hips high
    if (shoulderHeight > 150 && hipHeight > 80) {
      currentPosition = 'standing';
    }
    // Squat/crouch: Shoulders medium height, knees bent
    else if (shoulderHeight > 100 && hipHeight < 60) {
      currentPosition = 'squat';
    }
    // Plank: Shoulders and hips around same height, both low
    else if (Math.abs(shoulderHeight - hipHeight) < 30 && shoulderHeight < 80) {
      currentPosition = 'plank';
    }
    // Push-up: Shoulders lower than hips
    else if (shoulderHeight < hipHeight - 20 && shoulderHeight < 60) {
      currentPosition = 'pushup';
    }
    // Jump: All points higher than baseline (if established)
    else if (shoulderHeight > 180 && hipHeight > 100 && kneeHeight > 50) {
      currentPosition = 'jump';
    }
    else {
      currentPosition = 'transition'; // In between defined positions
    }
    
    // Form quality assessment
    let formScore = 0;
    let formFeedback = '';
    
    // Check current position for form feedback
    switch (currentPosition) {
      case 'plank':
        // Check for body alignment in plank
        if (Math.abs(shoulderHeight - hipHeight) < 10) {
          formFeedback = 'Great plank alignment!';
          formScore = 95;
        } else {
          formFeedback = 'Keep body straight in plank position';
          formScore = 75;
        }
        break;
      case 'pushup':
        formFeedback = 'Good depth on push-up!';
        formScore = 90;
        break;
      case 'jump':
        formFeedback = 'Great jump height!';
        formScore = 95;
        break;
      default:
        formFeedback = 'Continue the burpee motion';
        formScore = 80;
    }
    
    // Update state based on current position
    newState.state = currentPosition;
    
    // Track sequence for burpee (ideally: standing -> squat -> plank -> pushup -> squat -> jump -> standing)
    if (currentPosition !== 'transition' && currentPosition !== prevState) {
      newState.sequence = [...(currentState.sequence || []), currentPosition];
      
      // Keep only the last 10 positions to avoid memory issues
      if (newState.sequence.length > 10) {
        newState.sequence = newState.sequence.slice(-10);
      }
    }
    
    // Check for completed burpee
    // Simplified sequence check: if we see standing -> plank/pushup -> jump/standing again
    const seq = newState.sequence;
    if (seq.length >= 3 && 
        seq.includes('standing') && 
        (seq.includes('plank') || seq.includes('pushup')) && 
        (seq.lastIndexOf('standing') > seq.lastIndexOf('plank') || 
         seq.lastIndexOf('standing') > seq.lastIndexOf('pushup'))) {
      
      // Count rep and reset sequence if we detect a completed burpee
      if (seq.lastIndexOf('standing') > seq.indexOf('standing')) {
        newState.repCount = prevCount + 1;
        console.log(`✓ BURPEE REP! Sequence: ${seq.join(' -> ')}, Count: ${newState.repCount}`);
        newState.sequence = ['standing']; // Reset sequence after counting
      }
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `Burpee | Position: ${currentPosition}, Shoulder: ${shoulderHeight.toFixed(0)}px, Hip: ${hipHeight.toFixed(0)}px, Sequence: ${newState.sequence.join('->')}, Count: ${newState.repCount}`;
    
    return newState;
  };
  
  /**
   * Mountain Climber detection (tracks alternating knee pulls)
   */
  const detectMountainClimber = (keypoints, currentState) => {
    // Get previous state
    const prevState = currentState.state || 'neutral';
    const prevCount = currentState.repCount || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: 0
    };
  
    // Check visibility of key points
    const requiredPoints = [
      'left_shoulder', 'right_shoulder', 
      'left_hip', 'right_hip',
      'left_knee', 'right_knee',
      'left_ankle', 'right_ankle'
    ];
    
    // Calculate overall confidence
    newState.confidence = getConfidence(requiredPoints, keypoints);
    
    if (newState.confidence < 0.4) {
      newState.debug = 'Body not clearly visible';
      newState.formFeedback = 'Please position camera to see your full body from the side';
      return newState;
    }
    
    // Get key points
    const leftShoulder = keypoints['left_shoulder'];
    const rightShoulder = keypoints['right_shoulder'];
    const leftHip = keypoints['left_hip'];
    const rightHip = keypoints['right_hip'];
    const leftKnee = keypoints['left_knee'];
    const rightKnee = keypoints['right_knee'];
    
    // Calculate average positions
    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const avgHipY = (leftHip.y + rightHip.y) / 2;
    
    // Calculate knee heights relative to hip
    const leftKneeHeight = avgHipY - leftKnee.y;
    const rightKneeHeight = avgHipY - rightKnee.y;
    
    // Form quality assessment
    let formScore = 0;
    let formFeedback = '';
    
    // Check for plank position (shoulders and hips should form straight line)
    const backAngle = Math.abs(avgShoulderY - avgHipY);
    
    if (backAngle > 30) {
      formFeedback = 'Keep your body in a straight line';
      formScore = 70;
    } else {
      formFeedback = 'Good plank position';
      formScore = 90;
    }
    
    // Determine state based on knee position
    if (leftKneeHeight > 30 && leftKneeHeight > rightKneeHeight + 20) {
      // Left knee pulled up
      newState.state = 'left_knee';
      
      if (leftKneeHeight > 50) {
        formFeedback = 'Great knee drive!';
        formScore = 95;
      }
    } else if (rightKneeHeight > 30 && rightKneeHeight > leftKneeHeight + 20) {
      // Right knee pulled up
      newState.state = 'right_knee';
      
      if (rightKneeHeight > 50) {
        formFeedback = 'Great knee drive!';
        formScore = 95;
      }
    } else {
      // Neutral position or transitioning
      newState.state = 'neutral';
    }
    
    // Count rep - mountain climbers count each knee as a rep
    if ((prevState === 'neutral' && (newState.state === 'left_knee' || newState.state === 'right_knee')) ||
        (prevState === 'left_knee' && newState.state === 'right_knee') ||
        (prevState === 'right_knee' && newState.state === 'left_knee')) {
      newState.repCount = prevCount + 1;
      console.log(`✓ MOUNTAIN CLIMBER REP! Knee: ${newState.state}, Count: ${newState.repCount}`);
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `Mountain Climber | Left Knee: ${leftKneeHeight.toFixed(0)}px, Right Knee: ${rightKneeHeight.toFixed(0)}px, State: ${newState.state}, Score: ${formScore.toFixed(0)}`;
    
    return newState;
  };
  
  /**
   * High Knee detection (tracks knee height during running in place)
   */
  const detectHighKnee = (keypoints, currentState) => {
    // Get previous state
    const prevState = currentState.state || 'neutral';
    const prevCount = currentState.repCount || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: 0
    };
  
    // Check visibility of key points
    const requiredPoints = [
      'left_hip', 'right_hip',
      'left_knee', 'right_knee',
      'left_ankle', 'right_ankle'
    ];
    
    // Calculate overall confidence
    newState.confidence = getConfidence(requiredPoints, keypoints);
    
    if (newState.confidence < 0.4) {
      newState.debug = 'Legs not clearly visible';
      newState.formFeedback = 'Please position camera to see your legs clearly';
      return newState;
    }
    
    // Get key points
    const leftHip = keypoints['left_hip'];
    const rightHip = keypoints['right_hip'];
    const leftKnee = keypoints['left_knee'];
    const rightKnee = keypoints['right_knee'];
    
    // Calculate baseline hip height if not set
    if (!currentState.baselineY) {
      const avgHipY = (leftHip.y + rightHip.y) / 2;
      newState.baselineY = avgHipY;
      newState.debug = 'Setting baseline position';
      return newState;
    }
    
    // Preserve the baseline
    newState.baselineY = currentState.baselineY;
    
    // Calculate knee heights relative to hips
    const leftKneeHeight = leftHip.y - leftKnee.y;
    const rightKneeHeight = rightHip.y - rightKnee.y;
    
    // Form quality assessment
    let formScore = 0;
    let formFeedback = '';
    
    // Check knee lift height
    const kneeThreshold = 40; // Minimum height for good form
    
    if (Math.max(leftKneeHeight, rightKneeHeight) < kneeThreshold) {
      formFeedback = 'Lift knees higher (hip level is ideal)';
      formScore = 70;
    } else {
      formFeedback = 'Good knee height';
      formScore = 90;
    }
    
    // Determine state based on which knee is higher
    if (leftKneeHeight > 20 && leftKneeHeight > rightKneeHeight + 10) {
      // Left knee is up
      newState.state = 'left_knee_up';
      
      if (leftKneeHeight > 60) { // Excellent height
        formFeedback = 'Great knee height!';
        formScore = 95;
      }
    } else if (rightKneeHeight > 20 && rightKneeHeight > leftKneeHeight + 10) {
      // Right knee is up
      newState.state = 'right_knee_up';
      
      if (rightKneeHeight > 60) { // Excellent height
        formFeedback = 'Great knee height!';
        formScore = 95;
      }
    } else {
      // Neutral or transitioning
      newState.state = 'neutral';
    }
    
    // Count rep - high knees count each knee lift as a rep
    if ((prevState === 'neutral' && (newState.state === 'left_knee_up' || newState.state === 'right_knee_up')) ||
        (prevState === 'left_knee_up' && newState.state === 'right_knee_up') ||
        (prevState === 'right_knee_up' && newState.state === 'left_knee_up')) {
      newState.repCount = prevCount + 1;
      console.log(`✓ HIGH KNEE REP! Knee: ${newState.state}, Count: ${newState.repCount}`);
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `High Knee | Left: ${leftKneeHeight.toFixed(0)}px, Right: ${rightKneeHeight.toFixed(0)}px, State: ${newState.state}, Score: ${formScore.toFixed(0)}`;
    
    return newState;
  };
  
  /**
   * Butt Kick detection (tracks heel height towards glutes)
   */
  const detectButtKick = (keypoints, currentState) => {
    // Get previous state
    const prevState = currentState.state || 'neutral';
    const prevCount = currentState.repCount || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: 0
    };
  
    // Check visibility of key points
    const requiredPoints = [
      'left_hip', 'right_hip',
      'left_knee', 'right_knee',
      'left_ankle', 'right_ankle'
    ];
    
    // Calculate overall confidence
    newState.confidence = getConfidence(requiredPoints, keypoints);
    
    if (newState.confidence < 0.4) {
      newState.debug = 'Legs not clearly visible';
      newState.formFeedback = 'Please position camera to see your legs clearly';
      return newState;
    }
    
    // Get key points
    const leftHip = keypoints['left_hip'];
    const rightHip = keypoints['right_hip'];
    const leftKnee = keypoints['left_knee'];
    const rightKnee = keypoints['right_knee'];
    const leftAnkle = keypoints['left_ankle'];
    const rightAnkle = keypoints['right_ankle'];
    
    // Calculate ankle positions relative to hip (for butt kicks, ankles should come up)
    const leftAnkleToHipY = leftHip.y - leftAnkle.y;
    const rightAnkleToHipY = rightHip.y - rightAnkle.y;
    
    // Form quality assessment
    let formScore = 0;
    let formFeedback = '';
    
    // Determine state based on ankle position (relative to hip)
    if (leftAnkleToHipY > 0 && leftAnkleToHipY > rightAnkleToHipY + 20) {
      // Left heel up towards butt
      newState.state = 'left_heel_up';
      
      // Assess form quality based on how close heel gets to butt
      if (leftAnkleToHipY > 30) {
        formFeedback = 'Great heel height!';
        formScore = 95;
      } else {
        formFeedback = 'Try to kick heels closer to buttocks';
        formScore = 75;
      }
    } else if (rightAnkleToHipY > 0 && rightAnkleToHipY > leftAnkleToHipY + 20) {
      // Right heel up towards butt
      newState.state = 'right_heel_up';
      
      // Assess form quality based on how close heel gets to butt
      if (rightAnkleToHipY > 30) {
        formFeedback = 'Great heel height!';
        formScore = 95;
      } else {
        formFeedback = 'Try to kick heels closer to buttocks';
        formScore = 75;
      }
    } else {
      // Neutral or transitioning
      newState.state = 'neutral';
      formFeedback = 'Keep kicking those heels up';
      formScore = 80;
    }
    
    // Additional form check: knees should point downward
    const leftKneeToAnkleX = Math.abs(leftKnee.x - leftAnkle.x);
    const rightKneeToAnkleX = Math.abs(rightKnee.x - rightAnkle.x);
    
    if (leftKneeToAnkleX > 40 || rightKneeToAnkleX > 40) {
      formFeedback = 'Keep knees pointing down, not forward';
      formScore = Math.min(formScore, 70);
    }
    
    // Count rep - butt kicks count each kick as a rep
    if ((prevState === 'neutral' && (newState.state === 'left_heel_up' || newState.state === 'right_heel_up')) ||
        (prevState === 'left_heel_up' && newState.state === 'right_heel_up') ||
        (prevState === 'right_heel_up' && newState.state === 'left_heel_up')) {
      newState.repCount = prevCount + 1;
      console.log(`✓ BUTT KICK REP! Heel: ${newState.state}, Count: ${newState.repCount}`);
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `Butt Kick | Left Heel: ${leftAnkleToHipY.toFixed(0)}px, Right Heel: ${rightAnkleToHipY.toFixed(0)}px, State: ${newState.state}, Score: ${formScore.toFixed(0)}`;
    
    return newState;
  };
  
  /**
   * Cat-Cow Stretch detection (tracks spine flexion/extension)
   */
  const detectCatCow = (keypoints, currentState) => {
    // Get previous state
    const prevState = currentState.state || 'neutral';
    const prevCount = currentState.repCount || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: 0
    };
  
    // Check visibility of key points
    const requiredPoints = [
      'left_shoulder', 'right_shoulder', 
      'left_hip', 'right_hip'
    ];
    
    // Calculate overall confidence
    newState.confidence = getConfidence(requiredPoints, keypoints);
    
    if (newState.confidence < 0.4) {
      newState.debug = 'Body not clearly visible';
      newState.formFeedback = 'Please position camera to see your upper body from the side';
      return newState;
    }
    
    // Get key points (from side view)
    const shoulder = keypoints['left_shoulder'] || keypoints['right_shoulder'];
    const hip = keypoints['left_hip'] || keypoints['right_hip'];
    
    // Since TensorFlow models often struggle with quadruped positions,
    // we use simplified detection for cat-cow based on relative shoulder-hip positions
    
    // Calculate baseline if not set
    if (!currentState.baselineY) {
      newState.baselineY = shoulder.y;
      newState.baselineHipY = hip.y;
      newState.debug = 'Setting baseline position';
      return newState;
    }
    
    // Preserve the baseline
    newState.baselineY = currentState.baselineY;
    newState.baselineHipY = currentState.baselineHipY;
    
    // Calculate shoulder movement relative to baseline
    const shoulderDiff = shoulder.y - newState.baselineY;
    
    // Calculate relative spine curvature by comparing shoulder to hip movement
    const hipDiff = hip.y - newState.baselineHipY;
    const spineCurvature = shoulderDiff - hipDiff;
    
    // Form quality assessment
    let formScore = 0;
    let formFeedback = '';
    
    // Determine state based on spine curvature
    if (spineCurvature > 20) {
      // Cat pose - spine rounded upward
      newState.state = 'cat';
      
      if (spineCurvature > 40) {
        formFeedback = 'Good cat pose, round your back fully';
        formScore = 95;
      } else {
        formFeedback = 'Try to round your back more';
        formScore = 80;
      }
    } else if (spineCurvature < -20) {
      // Cow pose - spine curved downward
      newState.state = 'cow';
      
      if (spineCurvature < -40) {
        formFeedback = 'Good cow pose, arch your back fully';
        formScore = 95;
      } else {
        formFeedback = 'Try to extend your back more';
        formScore = 80;
      }
    } else {
      // Neutral or transitioning
      newState.state = 'neutral';
      formFeedback = 'Move between cat and cow poses smoothly';
      formScore = 80;
    }
    
    // Count rep when completing a full cycle (cat -> cow -> cat or cow -> cat -> cow)
    // Using a simplified count - each transition from cat to cow or cow to cat counts as one rep
    if ((prevState === 'cat' && newState.state === 'cow') || 
        (prevState === 'cow' && newState.state === 'cat')) {
      newState.repCount = prevCount + 1;
      console.log(`✓ CAT-COW REP! Transition: ${prevState} to ${newState.state}, Count: ${newState.repCount}`);
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `Cat-Cow | Curvature: ${spineCurvature.toFixed(0)}px, State: ${newState.state}, Score: ${formScore.toFixed(0)}`;
    
    return newState;
  };
  
  /**
   * Child's Pose detection (tracks body fold and hold)
   */
  const detectChildsPose = (keypoints, currentState) => {
    // Get previous state and hold time
    const prevState = currentState.state || 'invalid';
    const prevCount = currentState.repCount || 0; // Not typically used for Child's Pose
    const prevHoldTime = currentState.holdTime || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: prevHoldTime,
      lastUpdateTime: currentState.lastUpdateTime || Date.now()
    };
  
    // Check visibility of key points
    const requiredPoints = [
      'left_shoulder', 'right_shoulder', 
      'left_hip', 'right_hip',
      'left_knee', 'right_knee'
    ];
    
    // Calculate overall confidence
    newState.confidence = getConfidence(requiredPoints, keypoints);
    
    if (newState.confidence < 0.4) {
      newState.debug = 'Body not clearly visible';
      newState.formFeedback = 'Please position camera to see your body from the side';
      return newState;
    }
    
    // Get key points
    const shoulder = keypoints['left_shoulder'] || keypoints['right_shoulder'];
    const hip = keypoints['left_hip'] || keypoints['right_hip'];
    const knee = keypoints['left_knee'] || keypoints['right_knee'];
    
    // Detect Child's Pose - shoulders should be close to knees, hips elevated
    const shoulderToKneeY = Math.abs(shoulder.y - knee.y);
    const hipToKneeY = Math.abs(hip.y - knee.y);
    const hipToShoulderY = Math.abs(hip.y - shoulder.y);
    
    // Form quality assessment
    let formScore = 0;
    let formFeedback = '';
    let isValidPose = false;
    
    // Basic check: shoulders should be near knees, hips should be higher
    if (shoulderToKneeY < 40 && hipToKneeY > 30 && hipToShoulderY > 30) {
      isValidPose = true;
      
      // Assess depth of fold
      if (shoulderToKneeY < 20 && hipToShoulderY > 50) {
        formFeedback = 'Excellent Child\'s Pose depth!';
        formScore = 95;
      } else {
        formFeedback = 'Good Child\'s Pose position';
        formScore = 85;
      }
    } else {
      formFeedback = 'Try to bring chest towards knees and sit back on heels';
      formScore = 70;
    }
    
    // Determine state - Child's Pose is a holding pose
    if (isValidPose) {
      // Update hold time since we're in a valid pose
      const now = Date.now();
      const timeDiffMs = now - (newState.lastUpdateTime || now);
      
      // Update time only if reasonable (handles large gaps in detection)
      if (timeDiffMs > 0 && timeDiffMs < 500) {
        newState.holdTime = prevHoldTime + (timeDiffMs / 1000); // Convert ms to seconds
      }
      
      newState.lastUpdateTime = now;
      newState.state = 'holding';
    } else {
      // Not in Child's Pose
      newState.state = 'invalid';
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `Child's Pose | Shoulder-Knee: ${shoulderToKneeY.toFixed(0)}px, Hip-Shoulder: ${hipToShoulderY.toFixed(0)}px, State: ${newState.state}, Hold: ${newState.holdTime.toFixed(1)}s`;
    
    return newState;
  };
  
  /**
   * Cobra Stretch detection (tracks chest elevation and extension)
   */
  const detectCobraStretch = (keypoints, currentState) => {
    // Get previous state and hold time
    const prevState = currentState.state || 'down';
    const prevCount = currentState.repCount || 0; // Not typically used for Cobra
    const prevHoldTime = currentState.holdTime || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: prevHoldTime,
      lastUpdateTime: currentState.lastUpdateTime || Date.now()
    };
  
    // Check visibility of key points
    const requiredPoints = [
      'left_shoulder', 'right_shoulder', 
      'left_hip', 'right_hip',
      'left_elbow', 'right_elbow'
    ];
    
    // Calculate overall confidence
    newState.confidence = getConfidence(requiredPoints, keypoints);
    
    if (newState.confidence < 0.4) {
      newState.debug = 'Body not clearly visible';
      newState.formFeedback = 'Please position camera to see your body from the side';
      return newState;
    }
    
    // Get key points
    const shoulder = keypoints['left_shoulder'] || keypoints['right_shoulder'];
    const elbow = keypoints['left_elbow'] || keypoints['right_elbow'];
    const hip = keypoints['left_hip'] || keypoints['right_hip'];
    
    // Calculate baseline if not set (ground position)
    if (!currentState.baselineY) {
      newState.baselineY = shoulder.y;
      newState.debug = 'Setting baseline position';
      return newState;
    }
    
    // Preserve the baseline
    newState.baselineY = currentState.baselineY;
    
    // Calculate shoulder lift from baseline
    const shoulderLift = newState.baselineY - shoulder.y;
    
    // Check elbow position - should be bent and under shoulders
    const elbowPosition = Math.abs(elbow.x - shoulder.x);
    
    // Form quality assessment
    let formScore = 0;
    let formFeedback = '';
    let isValidPose = false;
    
    // For Cobra, shoulders should be lifted, hips remain down
    if (shoulderLift > 20) {
      isValidPose = true;
      
      // Check arm position
      if (elbowPosition > 40) {
        formFeedback = 'Keep elbows closer to your body';
        formScore = 70;
      } else {
        formFeedback = 'Good elbow position';
        formScore = 90;
      }
      
      // Check lift height
      if (shoulderLift > 40) {
        formFeedback = 'Excellent cobra extension!';
        formScore = 95;
      } else {
        formFeedback = 'Try to lift chest a bit higher if comfortable';
        formScore = 85;
      }
    } else {
      formFeedback = 'Lift your chest while keeping hips on the ground';
      formScore = 60;
    }
    
    // Determine state - Cobra is a holding pose
    if (isValidPose) {
      // Update hold time since we're in a valid pose
      const now = Date.now();
      const timeDiffMs = now - (newState.lastUpdateTime || now);
      
      // Update time only if reasonable (handles large gaps in detection)
      if (timeDiffMs > 0 && timeDiffMs < 500) {
        newState.holdTime = prevHoldTime + (timeDiffMs / 1000); // Convert ms to seconds
      }
      
      newState.lastUpdateTime = now;
      newState.state = 'holding';
    } else {
      // Not in Cobra position
      newState.state = 'down';
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `Cobra | Shoulder Lift: ${shoulderLift.toFixed(0)}px, Elbow Position: ${elbowPosition.toFixed(0)}px, State: ${newState.state}, Hold: ${newState.holdTime.toFixed(1)}s`;
    
    return newState;
  };
  
  /**
   * Hamstring Stretch detection (tracks forward fold)
   */
  const detectHamstringStretch = (keypoints, currentState) => {
    // Get previous state and hold time
    const prevState = currentState.state || 'standing';
    const prevCount = currentState.repCount || 0; // Not typically used for stretches
    const prevHoldTime = currentState.holdTime || 0;
    
    // Create new state object
    const newState = {
      state: prevState,
      repCount: prevCount,
      debug: '',
      confidence: 0,
      previousState: prevState,
      formFeedback: currentState.formFeedback || '',
      formScore: currentState.formScore || 0,
      holdTime: prevHoldTime,
      lastUpdateTime: currentState.lastUpdateTime || Date.now()
    };
  
    // Check visibility of key points
    const requiredPoints = [
      'left_shoulder', 'right_shoulder', 
      'left_hip', 'right_hip',
      'left_knee', 'right_knee',
      'left_ankle', 'right_ankle'
    ];
    
    // Calculate overall confidence
    newState.confidence = getConfidence(requiredPoints, keypoints);
    
    if (newState.confidence < 0.4) {
      newState.debug = 'Body not clearly visible';
      newState.formFeedback = 'Please position camera to see your body from the side';
      return newState;
    }
    
    // Get key points (from side view)
    const shoulder = keypoints['left_shoulder'] || keypoints['right_shoulder'];
    const hip = keypoints['left_hip'] || keypoints['right_hip'];
    const knee = keypoints['left_knee'] || keypoints['right_knee'];
    const ankle = keypoints['left_ankle'] || keypoints['right_ankle'];
    
    // Calculate hip angle (to detect fold)
    const hipAngle = calculateAngle(shoulder, hip, knee);
    
    // Calculate knee angle (to check if leg is straight)
    const kneeAngle = calculateAngle(hip, knee, ankle);
    
    // Form quality assessment
    let formScore = 0;
    let formFeedback = '';
    let isValidStretch = false;
    
    // For hamstring stretch, hip should be bent forward, and knee should be straight
    if (hipAngle && hipAngle < 120) { // Bent forward
      // Check knee extension
      if (kneeAngle && kneeAngle > 150) { // Leg relatively straight
        isValidStretch = true;
        
        if (hipAngle < 90) {
          formFeedback = 'Great hamstring stretch depth!';
          formScore = 95;
        } else {
          formFeedback = 'Try to fold a bit deeper if comfortable';
          formScore = 85;
        }
        
        if (kneeAngle < 170) {
          formFeedback = 'Try to keep your leg straighter';
          formScore = Math.min(formScore, 80);
        }
      } else {
        formFeedback = 'Keep your leg straight for an effective stretch';
        formScore = 70;
      }
    } else {
      formFeedback = 'Hinge at your hips and fold forward';
      formScore = 60;
    }
    
    // Determine state - this is a holding stretch
    if (isValidStretch) {
      // Update hold time since we're in a valid stretch
      const now = Date.now();
      const timeDiffMs = now - (newState.lastUpdateTime || now);
      
      // Update time only if reasonable (handles large gaps in detection)
      if (timeDiffMs > 0 && timeDiffMs < 500) {
        newState.holdTime = prevHoldTime + (timeDiffMs / 1000); // Convert ms to seconds
      }
      
      newState.lastUpdateTime = now;
      newState.state = 'stretching';
    } else {
      // Not in stretch position
      newState.state = 'standing';
    }
    
    // Save form information
    newState.formFeedback = formFeedback;
    newState.formScore = formScore;
    
    // Detailed debug info
    newState.debug = `Hamstring Stretch | Hip Angle: ${hipAngle?.toFixed(0) || 'N/A'}°, Knee Angle: ${kneeAngle?.toFixed(0) || 'N/A'}°, State: ${newState.state}, Hold: ${newState.holdTime.toFixed(1)}s`;
    
    return newState;
  };
  
  // Export the main function
  export default detectExerciseRep;