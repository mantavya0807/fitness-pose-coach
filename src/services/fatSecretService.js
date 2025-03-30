// src/services/fatSecretService.js
/**
 * FatSecret API Service
 * 
 * This service handles interactions with the FatSecret API for food data
 * with a fallback mock implementation for quick development/demo purposes
 */

import CryptoJS from 'crypto-js'; // For OAuth signature

// FatSecret API configuration
const FATSECRET_API_BASE_URL = 'https://platform.fatsecret.com/rest/server.api';
const FATSECRET_API_KEY = process.env.REACT_APP_FATSECRET_API_KEY;
const FATSECRET_API_SECRET = process.env.REACT_APP_FATSECRET_API_SECRET;

// Determine if we should use mock data (if API keys aren't available)
const USE_MOCK_DATA = !FATSECRET_API_KEY || !FATSECRET_API_SECRET;

/**
 * Creates an OAuth 1.0a signature for FatSecret API
 * @param {string} method - HTTP method
 * @param {string} url - API URL
 * @param {Object} params - Request parameters
 * @returns {Object} - Params with OAuth signature
 */
const createOAuthSignature = (method, url, params) => {
  // Create base string
  const sortedParams = Object.keys(params).sort().reduce((acc, key) => {
    acc[key] = params[key];
    return acc;
  }, {});
  
  // Convert params to URL encoded string
  const paramString = Object.keys(sortedParams)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(sortedParams[key])}`)
    .join('&');
  
  // Create signature base string
  const signatureBaseString = [
    method,
    encodeURIComponent(url),
    encodeURIComponent(paramString)
  ].join('&');
  
  // Create signature with HMAC-SHA1
  const signature = CryptoJS.HmacSHA1(
    signatureBaseString,
    `${encodeURIComponent(FATSECRET_API_SECRET)}&`
  ).toString(CryptoJS.enc.Base64);
  
  // Return params with signature
  return {
    ...params,
    oauth_signature: signature
  };
};

/**
 * Makes a signed request to the FatSecret API
 * @param {Object} params - API parameters
 * @returns {Promise<Object>} - API response
 */
const callFatSecretAPI = async (params) => {
  try {
    if (USE_MOCK_DATA) {
      return getMockData(params);
    }
    
    // Basic OAuth parameters
    const oauthParams = {
      oauth_consumer_key: FATSECRET_API_KEY,
      oauth_nonce: Math.random().toString(36).substring(2, 15),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_version: '1.0',
      ...params
    };
    
    // Create signature
    const signedParams = createOAuthSignature('GET', FATSECRET_API_BASE_URL, oauthParams);
    
    // Build URL with all parameters
    const queryString = Object.keys(signedParams)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(signedParams[key])}`)
      .join('&');
    
    const url = `${FATSECRET_API_BASE_URL}?${queryString}`;
    
    // Make request
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`FatSecret API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error calling FatSecret API:', error);
    // Fallback to mock data on error
    return getMockData(params);
  }
};

/**
 * Provides mock data for development/demo purposes
 * @param {Object} params - The API parameters
 * @returns {Object} - Mock API response
 */
const getMockData = (params) => {
  console.log('Using mock data for FatSecret API request:', params);
  
  if (params.method === 'foods.search') {
    return getMockSearchResults(params.search_expression);
  }
  
  if (params.method === 'food.get.v2') {
    return getMockFoodDetails(params.food_id);
  }
  
  if (params.method === 'foods.get_most_popular') {
    return getMockPopularFoods();
  }
  
  return { error: { message: 'Method not supported in mock mode' } };
};

/**
 * Search foods in FatSecret database
 * @param {string} query - Search term
 * @param {number} pageNumber - Page number for pagination (1-based)
 * @param {number} maxResults - Maximum results per page
 * @returns {Promise<Object>} Search results
 */
export const searchFoods = async (query, pageNumber = 1, maxResults = 20) => {
  try {
    const params = {
      method: 'foods.search',
      search_expression: query,
      page_number: pageNumber,
      max_results: maxResults,
      format: 'json'
    };
    
    return await callFatSecretAPI(params);
  } catch (error) {
    console.error('Error searching foods:', error);
    throw error;
  }
};

/**
 * Get detailed food information by ID
 * @param {string} foodId - FatSecret food ID
 * @returns {Promise<Object>} Detailed food information
 */
export const getFoodDetails = async (foodId) => {
  try {
    const params = {
      method: 'food.get.v2',
      food_id: foodId,
      format: 'json'
    };
    
    return await callFatSecretAPI(params);
  } catch (error) {
    console.error('Error getting food details:', error);
    throw error;
  }
};

/**
 * Find foods by barcode
 * @param {string} barcode - UPC/EAN barcode number
 * @returns {Promise<Object>} Matching food information
 */
export const findFoodByBarcode = async (barcode) => {
  try {
    const params = {
      method: 'food.find_id_for_barcode',
      barcode: barcode,
      format: 'json'
    };
    
    return await callFatSecretAPI(params);
  } catch (error) {
    console.error('Error finding food by barcode:', error);
    throw error;
  }
};

/**
 * Get most popular foods
 * @returns {Promise<Object>} List of popular foods
 */
export const getPopularFoods = async () => {
  try {
    const params = {
      method: 'foods.get_most_popular',
      format: 'json'
    };
    
    return await callFatSecretAPI(params);
  } catch (error) {
    console.error('Error getting popular foods:', error);
    throw error;
  }
};

/**
 * Get recently updated foods
 * @returns {Promise<Object>} List of recently updated foods
 */
export const getRecentFoods = async () => {
  try {
    const params = {
      method: 'foods.get_recently_updated',
      format: 'json'
    };
    
    return await callFatSecretAPI(params);
  } catch (error) {
    console.error('Error getting recent foods:', error);
    throw error;
  }
};

/**
 * Find foods similar to a recognized food
 * @param {string} foodName - Name of the recognized food 
 * @param {number} maxResults - Maximum results to return
 * @returns {Promise<Array>} Array of matched foods with nutritional data
 */
export const findFoodsByRecognition = async (foodName, maxResults = 5) => {
  try {
    if (!foodName) throw new Error('Food name is required');
    
    // Search for the food in FatSecret database
    const searchResults = await searchFoods(foodName, 1, maxResults);
    
    if (!searchResults.foods || !searchResults.foods.food) {
      return [];
    }
    
    // Extract the foods and their IDs
    const foods = Array.isArray(searchResults.foods.food) 
      ? searchResults.foods.food 
      : [searchResults.foods.food];
    
    // Get detailed nutritional information for each food
    const detailedFoods = await Promise.all(
      foods.map(async (food) => {
        try {
          const details = await getFoodDetails(food.food_id);
          if (details && details.food) {
            return processFoodData(details.food);
          }
          return null;
        } catch (error) {
          console.error(`Error getting details for food ID ${food.food_id}:`, error);
          return null;
        }
      })
    );
    
    // Filter out any null results and return
    return detailedFoods.filter(food => food !== null);
  } catch (error) {
    console.error('Error finding foods by recognition:', error);
    throw error;
  }
};

/**
 * Process food data from FatSecret format to our application format
 * @param {Object} fatSecretFood - Food data from FatSecret API
 * @returns {Object} Processed food data in application format
 */
export const processFoodData = (fatSecretFood) => {
  try {
    if (!fatSecretFood) return null;

    // Extract serving information
    const servings = fatSecretFood.servings?.serving || [];
    const primaryServing = Array.isArray(servings) ? servings[0] : servings;

    return {
      fatsecret_food_id: fatSecretFood.food_id || '',
      name: fatSecretFood.food_name || '',
      brand: fatSecretFood.brand_name || '',
      food_type: fatSecretFood.food_type || 'Generic',
      calories_per_serving: parseFloat(primaryServing.calories || 0),
      serving_size: primaryServing.metric_serving_amount || primaryServing.serving_amount || 1,
      serving_unit: primaryServing.metric_serving_unit || primaryServing.serving_unit || 'serving',
      protein_g: parseFloat(primaryServing.protein || 0),
      carbs_g: parseFloat(primaryServing.carbohydrate || 0),
      fat_g: parseFloat(primaryServing.fat || 0),
      fiber_g: parseFloat(primaryServing.fiber || 0),
      sugar_g: parseFloat(primaryServing.sugar || 0),
      sodium_mg: parseFloat(primaryServing.sodium || 0),
      food_category: fatSecretFood.food_category || 'Uncategorized',
      description: fatSecretFood.food_description || '',
      all_servings: Array.isArray(servings) ? servings : [servings]
    };
  } catch (error) {
    console.error('Error processing food data:', error);
    return null;
  }
};

// -------------------------------
// MOCK DATA IMPLEMENTATIONS
// -------------------------------

/**
 * Generate mock search results for demo purposes
 * @param {string} query - The search query
 * @returns {Object} - Mock search results
 */
const getMockSearchResults = (query) => {
  const mockFoods = [
    { food_id: '1001', food_name: 'Apple', food_description: 'Fresh apple', food_type: 'Generic', brand_name: '' },
    { food_id: '1002', food_name: 'Banana', food_description: 'Fresh banana', food_type: 'Generic', brand_name: '' },
    { food_id: '1003', food_name: 'Orange Juice', food_description: '100% pure squeezed', food_type: 'Generic', brand_name: 'Tropicana' },
    { food_id: '1004', food_name: 'Chicken Breast', food_description: 'Boneless, skinless', food_type: 'Generic', brand_name: '' },
    { food_id: '1005', food_name: 'Salmon', food_description: 'Wild caught', food_type: 'Generic', brand_name: '' },
    { food_id: '1006', food_name: 'White Rice', food_description: 'Cooked', food_type: 'Generic', brand_name: '' },
    { food_id: '1007', food_name: 'Whole Wheat Bread', food_description: '1 slice', food_type: 'Generic', brand_name: 'Nature\'s Own' },
    { food_id: '1008', food_name: 'Yogurt, Greek', food_description: 'Plain', food_type: 'Generic', brand_name: 'Fage' },
    { food_id: '1009', food_name: 'Cheddar Cheese', food_description: 'Sharp', food_type: 'Generic', brand_name: '' },
    { food_id: '1010', food_name: 'Almonds', food_description: 'Raw', food_type: 'Generic', brand_name: '' }
  ];
  
  // Filter foods based on query
  let results = [];
  if (query) {
    const lowerQuery = query.toLowerCase();
    results = mockFoods.filter(food => 
      food.food_name.toLowerCase().includes(lowerQuery) || 
      food.food_description.toLowerCase().includes(lowerQuery) ||
      food.brand_name.toLowerCase().includes(lowerQuery)
    );
  } else {
    results = mockFoods.slice(0, 5); // Return first 5 by default
  }
  
  return {
    foods: {
      food: results,
      max_results: 20,
      total_results: results.length,
      page_number: 0
    }
  };
};

/**
 * Get mock food details for a specific food
 * @param {string} foodId - The food ID
 * @returns {Object} - Mock food details
 */
const getMockFoodDetails = (foodId) => {
  // Create a map of food details
  const foodDetails = {
    '1001': { // Apple
      food_id: '1001',
      food_name: 'Apple',
      food_type: 'Generic',
      brand_name: '',
      food_description: 'Fresh apple',
      food_category: 'Fruits',
      servings: {
        serving: [
          {
            serving_id: '1',
            serving_description: '1 medium apple (182g)',
            serving_amount: 1,
            serving_unit: 'medium apple',
            metric_serving_amount: 182,
            metric_serving_unit: 'g',
            calories: 95,
            carbohydrate: 25,
            protein: 0.5,
            fat: 0.3,
            fiber: 4.4,
            sugar: 19,
            sodium: 2
          },
          {
            serving_id: '2',
            serving_description: '100g',
            serving_amount: 100,
            serving_unit: 'g',
            metric_serving_amount: 100,
            metric_serving_unit: 'g',
            calories: 52,
            carbohydrate: 13.8,
            protein: 0.3,
            fat: 0.2,
            fiber: 2.4,
            sugar: 10.4,
            sodium: 1
          }
        ]
      }
    },
    '1002': { // Banana
      food_id: '1002',
      food_name: 'Banana',
      food_type: 'Generic',
      brand_name: '',
      food_description: 'Fresh banana',
      food_category: 'Fruits',
      servings: {
        serving: [
          {
            serving_id: '1',
            serving_description: '1 medium banana (118g)',
            serving_amount: 1,
            serving_unit: 'medium banana',
            metric_serving_amount: 118,
            metric_serving_unit: 'g',
            calories: 105,
            carbohydrate: 27,
            protein: 1.3,
            fat: 0.4,
            fiber: 3.1,
            sugar: 14.4,
            sodium: 1
          },
          {
            serving_id: '2',
            serving_description: '100g',
            serving_amount: 100,
            serving_unit: 'g',
            metric_serving_amount: 100,
            metric_serving_unit: 'g',
            calories: 89,
            carbohydrate: 22.8,
            protein: 1.1,
            fat: 0.3,
            fiber: 2.6,
            sugar: 12.2,
            sodium: 1
          }
        ]
      }
    },
    '1003': { // Orange Juice
      food_id: '1003',
      food_name: 'Orange Juice',
      food_type: 'Generic',
      brand_name: 'Tropicana',
      food_description: '100% pure squeezed',
      food_category: 'Beverages',
      servings: {
        serving: [
          {
            serving_id: '1',
            serving_description: '1 cup (248g)',
            serving_amount: 1,
            serving_unit: 'cup',
            metric_serving_amount: 248,
            metric_serving_unit: 'g',
            calories: 112,
            carbohydrate: 26,
            protein: 2,
            fat: 0.5,
            fiber: 0.5,
            sugar: 21,
            sodium: 2
          }
        ]
      }
    },
    // Add more detailed food entries as needed
  };
  
  // Return specific food or default
  return {
    food: foodDetails[foodId] || {
      food_id: foodId,
      food_name: 'Generic Food',
      food_type: 'Generic',
      brand_name: '',
      food_description: 'Generic food item',
      food_category: 'Other',
      servings: {
        serving: {
          serving_id: '1',
          serving_description: '100g',
          serving_amount: 100,
          serving_unit: 'g',
          metric_serving_amount: 100,
          metric_serving_unit: 'g',
          calories: 200,
          carbohydrate: 20,
          protein: 10,
          fat: 8,
          fiber: 2,
          sugar: 5,
          sodium: 50
        }
      }
    }
  };
};

/**
 * Get mock popular foods
 * @returns {Object} - Mock popular foods
 */
const getMockPopularFoods = () => {
  return {
    popular_foods: {
      food: [
        { food_id: '1001', food_name: 'Apple', food_description: 'Fresh apple', food_type: 'Generic', brand_name: '' },
        { food_id: '1002', food_name: 'Banana', food_description: 'Fresh banana', food_type: 'Generic', brand_name: '' },
        { food_id: '1004', food_name: 'Chicken Breast', food_description: 'Boneless, skinless', food_type: 'Generic', brand_name: '' },
        { food_id: '1006', food_name: 'White Rice', food_description: 'Cooked', food_type: 'Generic', brand_name: '' },
        { food_id: '1008', food_name: 'Yogurt, Greek', food_description: 'Plain', food_type: 'Generic', brand_name: 'Fage' }
      ]
    }
  };
};

export default {
  searchFoods,
  getFoodDetails,
  findFoodByBarcode,
  getPopularFoods,
  getRecentFoods,
  processFoodData,
  findFoodsByRecognition
};