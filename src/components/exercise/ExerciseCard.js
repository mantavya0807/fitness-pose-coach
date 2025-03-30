// src/components/exercises/ExerciseCard.js
import React from 'react';
import { Link } from 'react-router-dom';

const ExerciseCard = ({ exercise, userEquipment = [] }) => {
    // Basic fallback image or representation
    const placeholderImage = (
        <div className="h-40 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        </div>
    );

    // Get appropriate color for difficulty badge
    const difficultyColor = (difficulty) => {
        switch(difficulty?.toLowerCase()) {
            case 'beginner': return 'bg-green-100 text-green-800';
            case 'intermediate': return 'bg-yellow-100 text-yellow-800';
            case 'advanced': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    
    // Check if user has the required equipment
    const hasRequiredEquipment = () => {
        if (!exercise.equipment || exercise.equipment === 'Bodyweight') return true;
        if (!userEquipment || userEquipment.length === 0) return true; // If no user equipment data, don't restrict
        return userEquipment.includes(exercise.equipment);
    };
    
    // Get muscles worked (handle comma-separated list)
    const getMusclesList = () => {
        if (!exercise.muscle_group) return 'N/A';
        
        // If too long, abbreviate
        const muscles = exercise.muscle_group.split(',').map(m => m.trim());
        if (muscles.length > 2) {
            return `${muscles[0]}, ${muscles[1]} +${muscles.length - 2}`;
        }
        return exercise.muscle_group;
    };

    return (
        <Link
            to={`/exercise/${exercise.id}`}
            className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden group relative"
        >
            {/* Equipment Warning Badge */}
            {!hasRequiredEquipment() && (
                <div className="absolute top-2 right-2 z-10 bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                    Equipment Needed
                </div>
            )}
            
            <div className="h-40 overflow-hidden relative">
                {exercise.demo_image_url ? (
                    <img
                        src={exercise.demo_image_url}
                        alt={exercise.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-in-out"
                        onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.nextSibling.style.display='flex' }}
                        loading="lazy"
                    />
                ) : placeholderImage}
                
                {/* Show placeholder if image fails */}
                {!exercise.demo_image_url && placeholderImage}
                
                {/* Exercise Type Badge */}
                {exercise.type && (
                    <div className="absolute top-2 left-2 bg-gray-800 bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                        {exercise.type}
                    </div>
                )}
            </div>
            
            <div className="p-4">
                <h3 className="font-semibold text-lg mb-1 text-gray-800 truncate">{exercise.name || 'Unnamed Exercise'}</h3>
                
                <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-gray-600 capitalize truncate">{getMusclesList()}</p>
                    
                    {/* Calories Badge (if available) */}
                    {exercise.exercise_details?.calories_per_rep && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                            {exercise.exercise_details.calories_per_rep} cal/rep
                        </span>
                    )}
                </div>
                
                <div className="flex flex-wrap gap-2 mt-2">
                    {/* Difficulty Badge */}
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${difficultyColor(exercise.difficulty)}`}>
                        {exercise.difficulty || 'N/A'}
                    </span>
                    
                    {/* Equipment Badge */}
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                        hasRequiredEquipment() 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-red-100 text-red-800'
                    }`}>
                        {exercise.equipment || 'No Equipment'}
                    </span>
                </div>
            </div>
        </Link>
    );
};

export default ExerciseCard;