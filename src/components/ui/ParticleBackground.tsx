"use client";

import React from 'react';

const ParticleBackground: React.FC = () => {
    // Generate 60 dots with randomized parameters
    const dots = Array.from({ length: 60 }).map((_, i) => ({
        id: i,
        size: Math.random() * 3 + 1, // 1-4px
        x: Math.random() * 100, // 0-100%
        y: Math.random() * 100, // 0-100%
        duration1: Math.random() * 40 + 20, // 20-60s
        duration2: Math.random() * 20 + 10, // 10-30s
        delay: Math.random() * -60, // Negative delay for immediate start
        originX: Math.random() * 30 - 15, // -15 to 15px
        originY: Math.random() * 30 - 15, // -15 to 15px
        color: i % 8 === 0 ? '#22d3ee' : '#ffffff', // 12.5% cyan, 87.5% white
    }));

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <style jsx>{`
                @keyframes fly {
                    0% { transform: translate(0, 0); }
                    25% { transform: translate(20px, 50px); }
                    50% { transform: translate(-30px, 10px); }
                    75% { transform: translate(40px, -20px); }
                    100% { transform: translate(0, 0); }
                }
                @keyframes rotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes twinkle {
                    0%, 100% { opacity: 0.2; }
                    50% { opacity: 0.8; }
                }
                .particle-container {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                }
                .dot {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(0.5px);
                }
            `}</style>
            <div className="particle-container">
                {dots.map((dot) => (
                    <div
                        key={dot.id}
                        className="dot"
                        style={{
                            width: `${dot.size}px`,
                            height: `${dot.size}px`,
                            left: `${dot.x}%`,
                            top: `${dot.y}%`,
                            backgroundColor: dot.color,
                            boxShadow: `0 0 8px ${dot.color}44`,
                            animation: `
                                fly ${dot.duration1}s linear infinite,
                                rotate ${dot.duration2}s linear infinite,
                                twinkle ${Math.random() * 5 + 3}s ease-in-out infinite
                            `,
                            animationDelay: `${dot.delay}s`,
                            transformOrigin: `${dot.originX}px ${dot.originY}px`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default ParticleBackground;
