import React from 'react';
import './LoadingIndicator.css';

/**
 * LoadingIndicator Component
 * This component renders loading indicators in three styles:
 * 1. Circular spinner (size="small") - Used for buttons - Uses 12 dots in a circle
 * 2. Horizontal dots (size="large" or "standard") - Used for content areas - Uses 5 dots in a row
 * 3. Classic spinner (style="classic") - Used for backwards compatibility
 * 
 * IMPORTANT: The animation delays are carefully synchronized between both styles:
 * - Horizontal dots use delays: 0s, 0.3s, 0.6s, 0.9s, 1.2s
 * - Circular dots (all 12) map to these same 5 delay groups using Math.floor((i * 5) / 12)
 * - Both use the same 1.8s duration and ease-in-out timing
 * - Each uses a specialized animation (fadeInOut vs fadeInOutHorizontal) that shares
 *   the same timing values but with different transform functions
 */
const LoadingIndicator = ({ size = 'standard', style = 'dots' }) => {
    // If this is for the small button indicator, use circular spinner
    if (size === 'small') {
        // Create 12 dots for the circular spinner
        return (
            <div className="circular-spinner-container">
                {[...Array(12)].map((_, i) => {
                    // Calculate angle and position for this dot - starting from the right (0 degrees)
                    const angle = i * (360 / 12); // 12 dots evenly spaced
                    const radians = angle * (Math.PI / 180);
                    
                    // Calculate x and y positions on the circle
                    const radius = 12.5;
                    const x = radius * Math.cos(radians);
                    const y = radius * Math.sin(radians);
                    
                    // Map 12 dots to the same 5 timing positions as horizontal dots
                    // This creates groups where multiple dots pulse together
                    const delayGroup = Math.floor((i * 5) / 12); // Maps to 0,1,2,3,4
                    const delay = (delayGroup * 0.3).toFixed(1);
                    
                    return (
                        <div
                            key={i}
                            className="circular-dot"
                            style={{
                                left: `calc(50% + ${x}px)`,
                                top: `calc(50% + ${y}px)`,
                                animation: `fadeInOut 1.8s infinite ease-in-out ${delay}s`
                            }}
                        />
                    );
                })}
            </div>
        );
    }
    
    // For classic spinner
    if (style === 'classic') {
        return (
            <div className="loading-indicator">
                <div className="spinner"></div>
            </div>
        );
    }
    
    // For large indicators, use the regular dots
    const sizeClass = size === 'large' ? 'large' : '';
    
    return (
        <div className={`loading-dots-container ${sizeClass}`}>
            <div
                className="loading-dot"
                style={{
                    animationDelay: '0s'
                }}
            />
            <div
                className="loading-dot"
                style={{
                    animationDelay: '0.3s'
                }}
            />
            <div
                className="loading-dot"
                style={{
                    animationDelay: '0.6s'
                }}
            />
            <div
                className="loading-dot"
                style={{
                    animationDelay: '0.9s'
                }}
            />
            <div
                className="loading-dot"
                style={{
                    animationDelay: '1.2s'
                }}
            />
        </div>
    );
};

export default LoadingIndicator; 