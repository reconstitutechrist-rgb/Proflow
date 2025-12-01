import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Smile, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const QUICK_REACTIONS = ["👍", "❤️", "😊", "🎉", "🚀", "👏", "🔥", "💯"];

export default function MessageReactions({ message, currentUser, onAddReaction, onRemoveReaction }) {
  const [showPicker, setShowPicker] = useState(false);

  const reactionCounts = {};
  const userReactions = [];

  if (message.reactions) {
    message.reactions.forEach(reaction => {
      reactionCounts[reaction.emoji] = (reactionCounts[reaction.emoji] || 0) + 1;
      if (reaction.user_email === currentUser?.email) {
        userReactions.push(reaction.emoji);
      }
    });
  }

  const handleReactionClick = (emoji) => {
    if (userReactions.includes(emoji)) {
      onRemoveReaction(message.id, emoji);
    } else {
      onAddReaction(message.id, emoji);
    }
    setShowPicker(false);
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      {/* Existing Reactions */}
      <div className="flex items-center gap-1 flex-wrap">
        <AnimatePresence>
          {Object.entries(reactionCounts).map(([emoji, count]) => (
            <motion.button
              key={emoji}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleReactionClick(emoji)}
              className={`px-2 py-1 rounded-full text-sm flex items-center gap-1 transition-colors ${
                userReactions.includes(emoji)
                  ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-500'
                  : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <span>{emoji}</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{count}</span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Reaction Button */}
      <Popover open={showPicker} onOpenChange={setShowPicker}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Smile className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="grid grid-cols-4 gap-1">
            {QUICK_REACTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReactionClick(emoji)}
                className="p-2 text-2xl hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}