// src/services/googleVisionService.js
/**
 * Service for Google Cloud Vision API integration
 * This handles food detection in images
 */

// Google Cloud Vision API endpoint
const VISION_API_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';
// Replace with your actual API key
const VISION_API_KEY = 'AIzaSyBJ6PCxWMfvbIw62Wl5_er7WATEHFAtIfQ';
/**
 * Detect food items in an image using Google Cloud Vision API
 * @param {string} imageUrl - URL of the image to analyze
 * @returns {Promise<Array>} - Array of detected food labels with confidence scores
 */
export const detectFoodInImage = async (imageUrl) => {
  try {
    console.log('Detecting food using Google Vision API:', imageUrl);
    
    // Check if we have a data URL (from canvas) or a regular URL
    let imageContent;
    
    if (imageUrl.startsWith('data:image')) {
      // For data URLs (from camera), extract the base64 content
      imageContent = imageUrl.split(',')[1];
    } else {
      // For regular URLs, we need to fetch the image and encode it
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Convert blob to base64
      const reader = new FileReader();
      imageContent = await new Promise(resolve => {
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
      });
    }
    
    // Prepare the request to Google Cloud Vision API
    const requestBody = {
      requests: [
        {
          image: {
            content: imageContent
          },
          features: [
            {
              type: 'LABEL_DETECTION',
              maxResults: 20
            },
            {
              type: 'WEB_DETECTION',
              maxResults: 20
            }
          ]
        }
      ]
    };
    
    // Make the API request
    const response = await fetch(`${VISION_API_ENDPOINT}?key=${VISION_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Google Vision API error: ${errorData.error?.message || response.statusText}`);
    }
    
    // Parse the response
    const data = await response.json();
    
    // Extract food items from label annotations
    // We'll filter for food-related labels and categories
    const foodCategories = [
      'Food', 'Cuisine', 'Dish', 'Fruit', 'Vegetable', 'Dessert', 'Bread', 
      'Meat', 'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Beverage', 'Drink'
    ];
    
    // Get data from standard label detection
    let foodLabels = [];
    if (data.responses[0]?.labelAnnotations) {
      foodLabels = data.responses[0].labelAnnotations
        .filter(label => {
          // Keep labels that have food-related descriptions or categories
          const description = label.description.toLowerCase();
          return foodCategories.some(category => 
            description.includes(category.toLowerCase()) || 
            (label.mid && label.mid.startsWith('/m/')) ||
            (label.topicality > 0.7)
          );
        })
        .map(label => ({
          name: label.description,
          confidence: label.score || 0.5,
          source: 'label'
        }));
    }
    
    // Get data from web detection which is often better for specific food items
    if (data.responses[0]?.webDetection?.webEntities) {
      const webFoodEntities = data.responses[0].webDetection.webEntities
        .filter(entity => 
          entity.description && 
          entity.score > 0.5 &&
          !entity.description.includes('Restaurant') &&
          !entity.description.includes('Photo') &&
          !entity.description.includes('Image')
        )
        .map(entity => ({
          name: entity.description,
          confidence: entity.score,
          source: 'web'
        }));
      
      // Combine labels and web entities, prioritizing web entities for better specificity
      foodLabels = [...webFoodEntities, ...foodLabels]; 
    }
    
    // Filter out non-food items using a food keyword dictionary
    const foodKeywords = [
      'pizza', 'burger', 'sandwich', 'salad', 'pasta', 'rice', 'chicken', 
      'beef', 'pork', 'fish', 'seafood', 'vegetable', 'fruit', 'apple', 
      'banana', 'orange', 'cake', 'cookie', 'dessert', 'bread', 'cheese',
      'yogurt', 'breakfast', 'lunch', 'dinner', 'soup', 'stew', 'curry',
      'sushi', 'roll', 'taco', 'burrito', 'enchilada', 'quesadilla',
      'noodle', 'sandwich', 'toast', 'cereal', 'egg', 'bacon', 'sausage',
      'steak', 'fries', 'potato', 'tomato', 'lettuce', 'onion', 'carrot',
      'broccoli', 'spinach', 'kale', 'bean', 'lentil', 'nut', 'peanut',
      'almond', 'cashew', 'milk', 'coffee', 'tea', 'juice', 'soda', 'water',
      'beer', 'wine', 'cocktail', 'smoothie', 'shake', 'ice cream', 'gelato',
      'donut', 'muffin', 'bagel', 'croissant', 'pancake', 'waffle', 'syrup'
    ];
    
    const filteredFoodLabels = foodLabels
      .filter(label => {
        const name = label.name.toLowerCase();
        return foodKeywords.some(keyword => name.includes(keyword)) ||
               name.length > 3 && foodKeywords.some(keyword => keyword.includes(name));
      })
      // Remove duplicates by name
      .filter((label, index, self) => 
        index === self.findIndex(l => l.name.toLowerCase() === label.name.toLowerCase())
      )
      // Sort by confidence
      .sort((a, b) => b.confidence - a.confidence)
      // Take top 5
      .slice(0, 5);
    
    return filteredFoodLabels;
  } catch (error) {
    console.error('Error detecting food with Google Vision API:', error);
    throw error;
  }
};

export default {
  detectFoodInImage
};