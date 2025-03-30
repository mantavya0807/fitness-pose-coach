// src/components/nutrition/NutritionChatbot.js
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import useAuthStore from '../../store/authStore';
import { MessageCircle, Send, ArrowRight, X } from 'lucide-react';

// Sample meal recommendations based on goals
const MEAL_RECOMMENDATIONS = {
  weight_loss: {
    breakfast: [
      { name: 'Greek yogurt with berries and a sprinkle of granola', calories: 285, protein: 21, carbs: 32, fat: 8 },
      { name: 'Vegetable egg white omelet with whole grain toast', calories: 320, protein: 24, carbs: 30, fat: 12 },
      { name: 'Overnight oats with almond milk and chia seeds', calories: 310, protein: 14, carbs: 45, fat: 10 }
    ],
    lunch: [
      { name: 'Grilled chicken salad with light vinaigrette', calories: 350, protein: 35, carbs: 15, fat: 15 },
      { name: 'Turkey and vegetable wrap with hummus', calories: 380, protein: 30, carbs: 40, fat: 12 },
      { name: 'Lentil soup with a side of fresh vegetables', calories: 340, protein: 18, carbs: 45, fat: 8 }
    ],
    dinner: [
      { name: 'Baked salmon with roasted vegetables', calories: 420, protein: 38, carbs: 20, fat: 18 },
      { name: 'Stir-fried tofu with broccoli and brown rice', calories: 390, protein: 22, carbs: 50, fat: 12 },
      { name: 'Lean ground turkey with zucchini noodles', calories: 370, protein: 32, carbs: 15, fat: 16 }
    ]
  },
  muscle_gain: {
    breakfast: [
      { name: 'Protein pancakes with banana and peanut butter', calories: 520, protein: 35, carbs: 60, fat: 15 },
      { name: 'Egg and vegetable breakfast sandwich with avocado', calories: 480, protein: 28, carbs: 40, fat: 22 },
      { name: 'Oatmeal with whey protein, almonds, and fruit', calories: 550, protein: 40, carbs: 65, fat: 12 }
    ],
    lunch: [
      { name: 'Grilled chicken wrap with quinoa and avocado', calories: 650, protein: 45, carbs: 65, fat: 20 },
      { name: 'Tuna salad sandwich on whole grain bread with sweet potato', calories: 620, protein: 40, carbs: 70, fat: 18 },
      { name: 'Turkey and brown rice bowl with mixed vegetables', calories: 580, protein: 42, carbs: 60, fat: 15 }
    ],
    dinner: [
      { name: 'Steak with baked potato and steamed broccoli', calories: 680, protein: 50, carbs: 50, fat: 25 },
      { name: 'Grilled salmon with quinoa and roasted vegetables', calories: 620, protein: 45, carbs: 45, fat: 22 },
      { name: 'Chicken stir-fry with brown rice and mixed vegetables', calories: 650, protein: 48, carbs: 65, fat: 18 }
    ]
  },
  general_fitness: {
    breakfast: [
      { name: 'Whole grain toast with scrambled eggs and avocado', calories: 380, protein: 20, carbs: 35, fat: 18 },
      { name: 'Smoothie bowl with protein powder, fruits and nuts', calories: 420, protein: 25, carbs: 50, fat: 12 },
      { name: 'Breakfast burrito with eggs, beans, and veggies', calories: 450, protein: 22, carbs: 45, fat: 20 }
    ],
    lunch: [
      { name: 'Mediterranean bowl with falafel, hummus, and veggies', calories: 520, protein: 25, carbs: 60, fat: 20 },
      { name: 'Grilled chicken Caesar salad with whole grain croutons', calories: 480, protein: 35, carbs: 30, fat: 22 },
      { name: 'Bean and quinoa soup with a side salad', calories: 440, protein: 20, carbs: 65, fat: 10 }
    ],
    dinner: [
      { name: 'Baked chicken with sweet potato and green beans', calories: 550, protein: 40, carbs: 45, fat: 18 },
      { name: 'Veggie burger with roasted potato wedges', calories: 520, protein: 25, carbs: 70, fat: 15 },
      { name: 'Fish tacos with cabbage slaw and avocado', calories: 580, protein: 32, carbs: 50, fat: 25 }
    ]
  }
};

// Predefined Q&A pairs for common nutrition questions
const COMMON_QUESTIONS = [
  {
    question: "How many calories should I eat per day?",
    answer: "Daily calorie needs vary based on your age, gender, weight, height, and activity level. For weight maintenance, the average adult needs approximately 2,000-2,500 calories (men) or 1,600-2,000 calories (women). For weight loss, a deficit of 500 calories per day is often recommended for a safe rate of 1-2 pounds per week."
  },
  {
    question: "What should my macronutrient ratio be?",
    answer: "A general guideline is 45-65% calories from carbs, 10-35% from protein, and 20-35% from fats. For weight loss, consider increasing protein (25-30%) while maintaining healthy fats. For muscle building, aim for 1.6-2.2g of protein per kg of bodyweight. These ratios can be adjusted based on your specific goals and individual response."
  },
  {
    question: "How much protein do I need?",
    answer: "The Recommended Dietary Allowance (RDA) is 0.8g of protein per kg of body weight. However, active individuals may need more: 1.2-1.4g/kg for endurance athletes, 1.6-2.2g/kg for strength athletes, and 1.2-1.6g/kg for recreational exercisers. For weight loss, higher protein intake (1.6-2.2g/kg) can help preserve muscle mass."
  },
  {
    question: "What are good pre-workout foods?",
    answer: "Good pre-workout nutrition should include easily digestible carbs and some protein. Consider a banana with a tablespoon of peanut butter, a small bowl of oatmeal with berries, or a slice of toast with a hard-boiled egg. Timing matters - eat a larger meal 2-3 hours before, or a small snack 30-60 minutes before exercise."
  },
  {
    question: "What should I eat after a workout?",
    answer: "Post-workout, aim to consume protein and carbs within 45 minutes. Protein helps repair muscle tissue (20-30g is ideal), while carbs replenish glycogen stores. Good options include a protein shake with a banana, Greek yogurt with fruit, or a turkey sandwich on whole grain bread. Hydration is also crucial for recovery."
  },
  {
    question: "How can I eat healthy on a budget?",
    answer: "Buy seasonal produce, frozen fruits/vegetables (equally nutritious), and incorporate affordable protein sources like eggs, canned tuna, beans, and lentils. Buy in bulk, meal prep to reduce waste, and use cheaper cuts of meat for slow cooking. Plan meals around sales, use grocery store loyalty programs, and consider store brands."
  },
  {
    question: "Is intermittent fasting effective?",
    answer: "Intermittent fasting can be effective for weight management and metabolic health for some people. Common methods include 16:8 (16 hours fasting, 8 hours eating), 5:2 (regular eating 5 days, restricted calories 2 days), or alternate-day fasting. Benefits may include improved insulin sensitivity and cellular repair processes, but it's not suitable for everyone, particularly those with certain medical conditions."
  },
  {
    question: "How much water should I drink daily?",
    answer: "The National Academies of Sciences, Engineering, and Medicine recommend about 3.7 liters (125 oz) for men and 2.7 liters (91 oz) for women daily from all beverages and food. A good rule of thumb is to drink enough so your urine is pale yellow. Needs increase with exercise, hot weather, pregnancy/breastfeeding, and illness."
  }
];

// Function to select appropriate meal recommendation based on user's goals
const getMealRecommendation = (userGoals) => {
  if (!userGoals || userGoals.length === 0) {
    return MEAL_RECOMMENDATIONS.general_fitness; // Default
  }
  
  // Check for specific goals
  if (userGoals.some(goal => goal.goal_type && goal.goal_type.toLowerCase().includes('weight loss'))) {
    return MEAL_RECOMMENDATIONS.weight_loss;
  }
  
  if (userGoals.some(goal => goal.goal_type && goal.goal_type.toLowerCase().includes('muscle'))) {
    return MEAL_RECOMMENDATIONS.muscle_gain;
  }
  
  return MEAL_RECOMMENDATIONS.general_fitness;
};

// Generate a meal plan
const generateMealPlan = (userGoals) => {
  const recommendations = getMealRecommendation(userGoals);
  
  // Randomly select one item from each meal type
  const getRandomItem = (array) => array[Math.floor(Math.random() * array.length)];
  
  return {
    breakfast: getRandomItem(recommendations.breakfast),
    lunch: getRandomItem(recommendations.lunch),
    dinner: getRandomItem(recommendations.dinner)
  };
};

// Process a message and generate a bot response
const generateBotResponse = async (message, userGoals) => {
  const lowerMessage = message.toLowerCase();
  
  // Check for meal plan request
  if (lowerMessage.includes("meal plan") || 
      lowerMessage.includes("what should i eat") || 
      lowerMessage.includes("recommend food") ||
      lowerMessage.includes("suggest meal")) {
    
    const mealPlan = generateMealPlan(userGoals);
    
    return {
      text: "Based on your goals, here's a meal plan suggestion for today:",
      mealPlan: mealPlan,
      totalCalories: mealPlan.breakfast.calories + mealPlan.lunch.calories + mealPlan.dinner.calories,
      totalProtein: mealPlan.breakfast.protein + mealPlan.lunch.protein + mealPlan.dinner.protein
    };
  }
  
  // Check for common nutrition questions
  for (const qa of COMMON_QUESTIONS) {
    if (lowerMessage.includes(qa.question.toLowerCase().substring(0, 10))) {
      return { text: qa.answer };
    }
  }
  
  // Check for goal-specific questions
  if (lowerMessage.includes("weight loss") || lowerMessage.includes("lose weight")) {
    return { 
      text: "For weight loss, focus on creating a calorie deficit through a combination of diet and exercise. Prioritize protein (which helps preserve muscle mass), fiber-rich foods (for satiety), and nutrient-dense options. A sustainable approach is to aim for 500-750 fewer calories per day to lose 1-1.5 pounds per week."
    };
  }
  
  if (lowerMessage.includes("muscle") || lowerMessage.includes("strength") || lowerMessage.includes("gain weight")) {
    return { 
      text: "For muscle gain, you need to consume more calories than you burn (caloric surplus) and include sufficient protein (1.6-2.2g per kg of bodyweight). Timing protein intake around workouts can be beneficial. Include complex carbs for energy and healthy fats for hormonal balance. Progressive resistance training is also essential."
    };
  }
  
  if (lowerMessage.includes("vegetarian") || lowerMessage.includes("vegan")) {
    return { 
      text: "Plant-based diets can be very nutritious when well-planned. Focus on complete protein sources like tofu, tempeh, legumes, quinoa, and for vegetarians, eggs and dairy. Pay attention to nutrients like vitamin B12, iron, zinc, calcium, and omega-3s which may be more challenging to obtain. Consider fortified foods or supplements if needed."
    };
  }
  
  // Default response
  return { 
    text: "I can help with nutrition questions and meal recommendations. Ask me about calorie needs, macronutrients, meal planning, or specific diets. Or simply ask for meal recommendations based on your fitness goals."
  };
};

// Main chatbot component
const NutritionChatbot = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([
    { sender: 'bot', content: { text: "Hi! I'm your nutrition assistant. How can I help you today?" } }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userGoals, setUserGoals] = useState([]);
  const messagesEndRef = useRef(null);
  
  // Fetch user's goals on component mount
  useEffect(() => {
    const fetchUserGoals = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_goals')
          .select('id, goal_type, status')
          .eq('user_id', user.id)
          .eq('status', 'active');
          
        if (error) throw error;
        setUserGoals(data || []);
      } catch (error) {
        console.error('Error fetching user goals:', error);
      }
    };
    
    fetchUserGoals();
  }, [user]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Handle sending a message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim()) return;
    
    // Add user message
    const userMessage = { sender: 'user', content: { text: inputMessage } };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    
    // Show typing indicator
    setIsTyping(true);
    
    try {
      // Generate response with slight delay to feel more natural
      setTimeout(async () => {
        const botResponse = await generateBotResponse(inputMessage, userGoals);
        setMessages(prev => [...prev, { sender: 'bot', content: botResponse }]);
        setIsTyping(false);
      }, 1000);
    } catch (error) {
      console.error('Error generating response:', error);
      setMessages(prev => [...prev, { 
        sender: 'bot', 
        content: { text: "Sorry, I encountered an error. Please try again." } 
      }]);
      setIsTyping(false);
    }
  };
  
  // Display a floating button when the chatbot is closed
  if (!isOpen) {
    return (
      <button
        onClick={onClose}
        className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all z-40"
        title="Nutrition Assistant"
      >
        <MessageCircle size={24} />
      </button>
    );
  }
  
  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-96 sm:h-[70vh] bg-white sm:rounded-lg shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-blue-600 text-white sm:rounded-t-lg">
        <h3 className="font-semibold">Nutrition Assistant</h3>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-blue-700 rounded"
        >
          <X size={20} />
        </button>
      </div>
      
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] p-3 rounded-lg ${
                msg.sender === 'user' 
                  ? 'bg-blue-600 text-white rounded-bl-lg rounded-tl-lg rounded-tr-none' 
                  : 'bg-gray-200 text-gray-800 rounded-br-lg rounded-tr-lg rounded-tl-none'
              }`}
            >
              {msg.content.text}
              
              {/* Render meal plan if present */}
              {msg.content.mealPlan && (
                <div className="mt-2 text-sm">
                  <div className="border-t border-gray-300 dark:border-gray-600 my-2 pt-2">
                    <p className="font-bold">Breakfast:</p>
                    <p>{msg.content.mealPlan.breakfast.name}</p>
                    <p className="text-xs opacity-80">
                      {msg.content.mealPlan.breakfast.calories} cal | 
                      {msg.content.mealPlan.breakfast.protein}g protein
                    </p>
                  </div>
                  
                  <div className="border-t border-gray-300 dark:border-gray-600 my-2 pt-2">
                    <p className="font-bold">Lunch:</p>
                    <p>{msg.content.mealPlan.lunch.name}</p>
                    <p className="text-xs opacity-80">
                      {msg.content.mealPlan.lunch.calories} cal | 
                      {msg.content.mealPlan.lunch.protein}g protein
                    </p>
                  </div>
                  
                  <div className="border-t border-gray-300 dark:border-gray-600 my-2 pt-2">
                    <p className="font-bold">Dinner:</p>
                    <p>{msg.content.mealPlan.dinner.name}</p>
                    <p className="text-xs opacity-80">
                      {msg.content.mealPlan.dinner.calories} cal | 
                      {msg.content.mealPlan.dinner.protein}g protein
                    </p>
                  </div>
                  
                  <div className="border-t border-gray-300 dark:border-gray-600 my-2 pt-2">
                    <p className="font-bold">Daily Totals:</p>
                    <p className="text-xs opacity-80">
                      {msg.content.totalCalories} calories | 
                      {msg.content.totalProtein}g protein
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-200 p-3 rounded-lg flex items-center space-x-1">
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
        
        {/* Empty div for scrolling to bottom */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Suggested Questions */}
      {messages.length < 3 && (
        <div className="p-2 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Common questions:</p>
          <div className="flex flex-wrap gap-2">
            {["Meal plan suggestion", "How much protein do I need?", "What should I eat after a workout?"].map((q, i) => (
              <button
                key={i}
                onClick={() => {
                  setInputMessage(q);
                  // Trigger form submission programmatically
                  document.getElementById('chat-form').requestSubmit();
                }}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 py-1 px-2 rounded flex items-center"
              >
                {q}
                <ArrowRight size={12} className="ml-1" />
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Input Form */}
      <form 
        id="chat-form" 
        onSubmit={handleSendMessage} 
        className="p-3 border-t flex items-center"
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask about nutrition..."
          className="flex-1 p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-r hover:bg-blue-700"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default NutritionChatbot;