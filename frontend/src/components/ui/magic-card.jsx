import React from 'react';
import { motion } from 'framer-motion';

/**
 * MagicCard - A reusable component that creates a glass-morphism effect card
 * with subtle animations and lighting effects.
 * 
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - The content to render inside the card
 * @param {string} props.className - Additional CSS classes
 * @param {object} props.style - Additional inline styles
 * @param {object} props.variants - Framer motion variants for animations
 * @param {boolean} props.hoverable - Whether the card should have hover effects
 * @param {string} props.gradient - Custom gradient direction (e.g., 'to-tr', 'to-b')
 * @param {boolean} props.border - Whether to show border
 * @param {number} props.intensity - Light effect intensity (0-100)
 */
const MagicCard = ({ 
  children, 
  className = '', 
  style = {}, 
  variants,
  hoverable = true,
  gradient = 'to-br',
  border = true,
  intensity = 20
}) => {
  // Animation variants
  const defaultVariants = {
    initial: { scale: 0.97, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1] 
      }
    },
    hover: hoverable ? {
      scale: 1.02,
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      transition: { duration: 0.2 }
    } : {},
    tap: hoverable ? { scale: 0.98 } : {}
  };

  // Generate the correct gradient class based on the direction
  const gradientClass = `bg-gradient-${gradient}`;
  const intensityValue = Math.max(0, Math.min(intensity, 100)) / 100;

  return (
    <motion.div
      className={`relative rounded-xl overflow-hidden ${className}`}
      style={{
        ...style
      }}
      variants={variants || defaultVariants}
      initial="initial"
      animate="animate"
      whileHover={hoverable ? "hover" : undefined}
      whileTap={hoverable ? "tap" : undefined}
    >
      {/* Glass background */}
      <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/60 backdrop-blur-lg z-0" />
      
      {/* Subtle gradient overlay */}
      <div className={`absolute inset-0 ${gradientClass} from-white/40 to-transparent dark:from-white/10 dark:to-transparent opacity-${Math.round(intensityValue * 100)} z-0`} />
      
      {/* Border */}
      {border && (
        <div className="absolute inset-0 border border-white/20 dark:border-gray-700/30 rounded-xl z-0" />
      )}
      
      {/* Top glass highlight effect */}
      <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/40 to-transparent dark:from-white/10 pointer-events-none z-0" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
};

export default MagicCard;
