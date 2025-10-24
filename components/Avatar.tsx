import React from 'react';

interface AvatarProps {
  isSpeaking: boolean;
}

const avatarUrl = "https://i.ibb.co/Y0pB9bJ/nithika-avatar.png";

export const Avatar: React.FC<AvatarProps> = ({ isSpeaking }) => {
  return (
    <div className="relative w-20 h-20 md:w-24 md:h-24">
      <img
        src={avatarUrl}
        alt="Nithika - AI Assistant"
        className={`w-full h-full rounded-full object-cover border-4 border-white shadow-xl transition-all duration-500 ${isSpeaking ? 'speaking-active' : 'breathing-idle'}`}
      />
      <style>{`
        @keyframes breathing {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.03);
          }
          100% {
            transform: scale(1);
          }
        }
        
        .breathing-idle {
          animation: breathing 4s ease-in-out infinite;
        }

        @keyframes pulse-speak {
          0% {
            box-shadow: 0 0 0 0px rgba(168, 85, 247, 0.7);
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-2px);
          }
          100% {
            box-shadow: 0 0 0 15px rgba(168, 85, 247, 0);
            transform: translateY(0px);
          }
        }

        .speaking-active {
          animation: pulse-speak 1.2s infinite ease-in-out;
          border-color: #c084fc; /* light purple */
        }
      `}</style>
    </div>
  );
};