// src/components/exercises/ExerciseCard.js
import React from 'react';
import { Link } from 'react-router-dom';

const ExerciseCard = ({ exercise, userEquipment = [] }) => {
    // Basic fallback image or representation
    const placeholderImage = (
        <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center text-indigo-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        </div>
    );

    // Get appropriate color for difficulty badge
    const difficultyColor = (difficulty) => {
        switch(difficulty?.toLowerCase()) {
            case 'beginner': return 'bg-green-100 text-green-800 border border-green-200';
            case 'intermediate': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
            case 'advanced': return 'bg-red-100 text-red-800 border border-red-200';
            default: return 'bg-gray-100 text-gray-800 border border-gray-200';
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
            className="block bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden group relative transform hover:-translate-y-1 hover:scale-[1.01] transition-transform"
        >
            {/* Equipment Warning Badge */}
            {!hasRequiredEquipment() && (
                <div className="absolute top-3 right-3 z-10 bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full shadow-sm border border-red-200 backdrop-blur-sm bg-opacity-90">
                    Equipment Needed
                </div>
            )}
            
            <div className="h-48 overflow-hidden relative">
                {exercise.demo_image_url ? (
                    <img
                        src={exercise.demo_image_url}
                        alt={exercise.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-in-out"
                        onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.parentNode.appendChild(document.createRange().createContextualFragment('<div class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100"><svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>')) }}
                        loading="lazy"
                    />
                ) : placeholderImage}
                
                {/* Image overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Exercise Type Badge */}
                {exercise.type && (
                    <div className="absolute top-3 left-3 bg-gray-800 bg-opacity-75 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full shadow-sm">
                        {exercise.type}
                    </div>
                )}
            </div>
            
            <div className="p-5">
                <h3 className="font-semibold text-lg mb-1 text-gray-800 truncate group-hover:text-blue-600 transition-colors">{exercise.name || 'Unnamed Exercise'}</h3>
                
                <div className="flex justify-between items-center mb-3">
                    <p className="text-sm text-gray-600 capitalize truncate">{getMusclesList()}</p>
                    
                    {/* Calories Badge (if available) */}
                    {exercise.exercise_details?.calories_per_rep && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md border border-blue-100">
                            {exercise.exercise_details.calories_per_rep} cal/rep
                        </span>
                    )}
                </div>
                
                <div className="flex flex-wrap gap-2 mt-3">
                    {/* Difficulty Badge */}
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${difficultyColor(exercise.difficulty)}`}>
                        {exercise.difficulty || 'N/A'}
                    </span>
                    
                    {/* Equipment Badge */}
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                        hasRequiredEquipment() 
                            ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                            : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                        {exercise.equipment || 'No Equipment'}
                    </span>
                </div>

                {/* View Details button */}
                <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="text-xs text-blue-600 font-medium flex items-center">
                        View details
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default ExerciseCard;