// src/services/fatSecretService.js
/**
 * FatSecret API Service
 * 
 * This service handles interactions with the FatSecret API for food data
 * Documentation: https://platform.fatsecret.com/api/Default.aspx?screen=rapih
 */

// FatSecret API configuration
import { OAuth } from 'oauth';

const FATSECRET_API_BASE_URL = 'https://platform.fatsecret.com/rest/server.api';
const FATSECRET_API_KEY = process.env.REACT_APP_FATSECRET_API_KEY;
const FATSECRET_API_SECRET = process.env.REACT_APP_FATSECRET_API_SECRET;


// Create OAuth 1.0a client for FatSecret
let oauth;
try {
  oauth = new OAuth(
    null,
    null,
    FATSECRET_API_KEY,
    FATSECRET_API_SECRET,
    '1.0',
    null,
    'HMAC-SHA1'
  );
} catch (error) {
  console.error('Error initializing OAuth for FatSecret:', error);
}

/**
 * Search foods in FatSecret database
 * @param {string} query - Search term
 * @param {number} pageNumber - Page number for pagination (1-based)
 * @param {number} maxResults - Maximum results per page
 * @returns {Promise<Object>} Search results
 */
export const searchFoods = async (query, pageNumber = 1, maxResults = 20) => {
  try {
    if (!oauth) {
      throw new Error('OAuth client not initialized');
    }

    const params = {
      method: 'foods.search',
      search_expression: query,
      page_number: pageNumber,
      max_results: maxResults,
      format: 'json'
    };

    return new Promise((resolve, reject) => {
      oauth.getOAuthRequestAsync(
        FATSECRET_API_BASE_URL,
        null,
        null,
        'GET',
        params,
        (error, data) => {
          if (error) {
            reject(error);
            return;
          }

          try {
            const parsedData = JSON.parse(data);
            resolve(parsedData);
          } catch (parseError) {
            reject(parseError);
          }
        }
      );
    });
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
    if (!oauth) {
      throw new Error('OAuth client not initialized');
    }

    const params = {
      method: 'food.get.v2',
      food_id: foodId,
      format: 'json'
    };

    return new Promise((resolve, reject) => {
      oauth.getOAuthRequestAsync(
        FATSECRET_API_BASE_URL,
        null,
        null,
        'GET',
        params,
        (error, data) => {
          if (error) {
            reject(error);
            return;
          }

          try {
            const parsedData = JSON.parse(data);
            resolve(parsedData);
          } catch (parseError) {
            reject(parseError);
          }
        }
      );
    });
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
    if (!oauth) {
      throw new Error('OAuth client not initialized');
    }

    const params = {
      method: 'food.find_id_for_barcode',
      barcode: barcode,
      format: 'json'
    };

    return new Promise((resolve, reject) => {
      oauth.getOAuthRequestAsync(
        FATSECRET_API_BASE_URL,
        null,
        null,
        'GET',
        params,
        (error, data) => {
          if (error) {
            reject(error);
            return;
          }

          try {
            const parsedData = JSON.parse(data);
            resolve(parsedData);
          } catch (parseError) {
            reject(parseError);
          }
        }
      );
    });
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
    if (!oauth) {
      throw new Error('OAuth client not initialized');
    }

    const params = {
      method: 'foods.get_most_popular',
      format: 'json'
    };

    return new Promise((resolve, reject) => {
      oauth.getOAuthRequestAsync(
        FATSECRET_API_BASE_URL,
        null,
        null,
        'GET',
        params,
        (error, data) => {
          if (error) {
            reject(error);
            return;
          }

          try {
            const parsedData = JSON.parse(data);
            resolve(parsedData);
          } catch (parseError) {
            reject(parseError);
          }
        }
      );
    });
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
    if (!oauth) {
      throw new Error('OAuth client not initialized');
    }

    const params = {
      method: 'foods.get_recently_updated',
      format: 'json'
    };

    return new Promise((resolve, reject) => {
      oauth.getOAuthRequestAsync(
        FATSECRET_API_BASE_URL,
        null,
        null,
        'GET',
        params,
        (error, data) => {
          if (error) {
            reject(error);
            return;
          }

          try {
            const parsedData = JSON.parse(data);
            resolve(parsedData);
          } catch (parseError) {
            reject(parseError);
          }
        }
      );
    });
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

export default {
  searchFoods,
  getFoodDetails,
  findFoodByBarcode,
  getPopularFoods,
  getRecentFoods,
  processFoodData,
  findFoodsByRecognition
};