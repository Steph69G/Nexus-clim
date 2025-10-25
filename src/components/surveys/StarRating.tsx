import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}

export default function StarRating({
  rating,
  onRatingChange,
  maxRating = 5,
  size = "md",
  disabled = false,
}: StarRatingProps) {
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-9 h-9",
  };

  return (
    <div className="flex gap-1">
      {Array.from({ length: maxRating }).map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= rating;

        return (
          <button
            key={index}
            type="button"
            onClick={() => !disabled && onRatingChange(starValue)}
            onMouseEnter={(e) => {
              if (!disabled) {
                e.currentTarget.style.transform = "scale(1.1)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
            disabled={disabled}
            className={`
              transition-all duration-200 ease-out
              ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:scale-110"}
            `}
            aria-label={`${starValue} étoile${starValue > 1 ? "s" : ""}`}
          >
            <Star
              className={`
                ${sizeClasses[size]}
                transition-all duration-200
                ${
                  isFilled
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-slate-300 hover:text-yellow-300"
                }
              `}
            />
          </button>
        );
      })}
    </div>
  );
}
