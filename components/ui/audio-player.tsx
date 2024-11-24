import React, { useRef, useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { StopIcon } from '../custom/icons';


interface AudioPlayerProps {
    audioUrl: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl }) => {
    console.log("AudioPlayer audio url: ", audioUrl);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioProgress, setAudioProgress] = useState(0);

    const handlePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
            setAudioProgress(progress);
        }
    };

    const handleAudioEnded = () => {
        setIsPlaying(false);
        setAudioProgress(0);
    };

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
        }
        return () => {
            if (audioRef.current) {
                audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
            }
        };
    }, []);

    return (
        <div className="flex w-[400px] items-center gap-2 px-3 py-2 bg-secondary rounded-xl">
            <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={handleAudioEnded}
                onError={(e) => {
                    console.error('Audio error:', e);
                }}
            />
            <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={handlePlayPause}
                className="p-1"
            >
                {isPlaying ? (
                    <div className="animate-pulse">
                        <StopIcon size={16} />
                    </div>
                ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                )}
            </Button>
            <div className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                    className="h-full bg-primary transition-transform duration-500 ease-out transform origin-left"
                    style={{
                        transform: `scaleX(${audioProgress / 100})`,
                        willChange: 'transform'
                    }}
                />
            </div>
            <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => {
                    setAudioProgress(0);
                    setIsPlaying(false);
                    if (audioRef.current) {
                        audioRef.current.pause();
                        audioRef.current.currentTime = 0;
                    }
                }}
                className="p-1"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                </svg>
            </Button>
        </div>
    );
};

export default AudioPlayer; 