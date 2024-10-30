'use client';

import { Attachment, ChatRequestOptions, CreateMessage, Message } from 'ai';
import { motion } from 'framer-motion';
import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  Dispatch,
  SetStateAction,
  ChangeEvent,
} from 'react';
import { toast } from 'sonner';

import { ArrowUpIcon, PaperclipIcon, StopIcon, MicrophoneIcon } from './icons';
import { PreviewAttachment } from './preview-attachment';
import useWindowSize from './use-window-size';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

const suggestedActions = [
  {
    title: 'What is the weather',
    label: 'in San Francisco?',
    action: 'What is the weather in San Francisco?',
  },
  {
    title: "Answer like I'm 5,",
    label: 'why is the sky blue?',
    action: "Answer like I'm 5, why is the sky blue?",
  },
];

export function MultimodalInput({
  input,
  setInput,
  isLoading,
  stop,
  attachments,
  setAttachments,
  messages,
  append,
  handleSubmit,
}: {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<Message>;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions
  ) => Promise<string | null | undefined>;
  handleSubmit: (
    event?: {
      preventDefault?: () => void;
    },
    chatRequestOptions?: ChatRequestOptions
  ) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    adjustHeight();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);

  const submitForm = useCallback(() => {
    handleSubmit(undefined, {
      experimental_attachments: attachments,
    });

    setAttachments([]);

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [attachments, handleSubmit, setAttachments, width]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`/api/files/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;

        return {
          url,
          name: pathname,
          contentType: contentType,
        };
      } else {
        const { error } = await response.json();
        toast.error(error);
      }
    } catch (error) {
      toast.error('Failed to upload file, please try again!');
    }
  };

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error('Error uploading files!', error);
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments]
  );

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });

      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      };

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      // Сбрасываем и запускаем таймер с высокой точностью
      setRecordingTime(0);
      startTimeRef.current = Date.now();

      const updateTimer = () => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000; // Переводим в секунды
        setRecordingTime(elapsed);
        timerRef.current = requestAnimationFrame(updateTimer);
      };

      timerRef.current = requestAnimationFrame(updateTimer);

      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        if (blob.size < 100) {
          toast.error('Запись не удалась. Пожалуйста, проверьте доступ к микрофону');
          setAudioBlob(null);
          setAudioUrl(null);
          return;
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);

      console.log('Recording started', mediaRecorder.state);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Не удалось получить доступ к микрофону');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        // Останавливаем таймер
        if (timerRef.current !== null) {
          cancelAnimationFrame(timerRef.current);
          timerRef.current = null;
        }

        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => {
          track.stop();
        });
        setIsRecording(false);
      } catch (error) {
        console.error('Error stopping recording:', error);
        toast.error('Ошибка при остановке записи');
      }
    }
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [audioProgress, setAudioProgress] = useState(0);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setAudioProgress(progress);
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      try {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          // Сбрасываем прогресс при начале воспроизведения
          setAudioProgress(0);
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('Audio started playing');
              })
              .catch(error => {
                console.error('Error playing audio:', error);
                toast.error('Ошибка при воспроизведении аудио');
              });
          }
        }
        setIsPlaying(!isPlaying);
      } catch (error) {
        console.error('Error handling play/pause:', error);
        toast.error('Ошибка при управлении воспроизведением');
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const handleAudioSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if ((!input && !audioBlob) || isLoading) return;

    try {
      setIsLoadingAudio(true);

      if (audioBlob) {
        const file = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' });
        const attachment = await uploadFile(file);

        if (attachment) {
          // Сначала добавляем сообщение пользователя
          await append({
            id: Date.now().toString(),
            role: 'user',
            content: input || '🎤 Voice message',
            experimental_attachments: [attachment]
          });

          // Очищаем состояния
          setInput('');
          setAttachments([]);
          setAudioBlob(null);
          setAudioUrl(null);
        }
      }
    } catch (error) {
      console.error('Error in handleAudioSubmit:', error);
      toast.error('Что-то пошло не так');
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 100); // Получаем две цифры миллисекунд
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        cancelAnimationFrame(timerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full flex flex-col gap-4">
      {messages.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0 && (
          <div className="grid sm:grid-cols-2 gap-2 w-full">
            {suggestedActions.map((suggestedAction, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.05 * index }}
                key={index}
                className={index > 1 ? 'hidden sm:block' : 'block'}
              >
                <Button
                  variant="ghost"
                  onClick={async () => {
                    append({
                      role: 'user',
                      content: suggestedAction.action,
                    });
                  }}
                  className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start"
                >
                  <span className="font-medium">{suggestedAction.title}</span>
                  <span className="text-muted-foreground">
                    {suggestedAction.label}
                  </span>
                </Button>
              </motion.div>
            ))}
          </div>
        )}

      <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        tabIndex={-1}
      />

      {/* {(attachments.length > 0 || uploadQueue.length > 0) && (
        <div className="flex flex-row gap-2 overflow-x-scroll">
          {attachments.map((attachment) => (
            <PreviewAttachment key={attachment.url} attachment={attachment} />
          ))}

          {uploadQueue.map((filename) => (
            <PreviewAttachment
              key={filename}
              attachment={{
                url: '',
                name: filename,
                contentType: '',
              }}
              isUploading={true}
            />
          ))}
        </div>
      )} */}

      {(isRecording || audioUrl) && (
        <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-xl">
          {isRecording ? (
            <>
              <div className="flex items-center gap-2">
                <span className="animate-pulse text-red-500">●</span>
                <span className="text-sm">{formatTime(recordingTime)}</span>
              </div>
              <div className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 animate-[recording_2s_ease-in-out_infinite]"
                  style={{ width: '100%' }} />
              </div>
            </>
          ) : audioUrl && (
            <>
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={handleAudioEnded}
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setAudioProgress(0)}
                onLoadedMetadata={() => {
                  if (audioRef.current) {
                    // Устанавливаем начальное значение прогресса
                    setAudioProgress(0);
                    audioRef.current.addEventListener('timeupdate', handleTimeUpdate, { passive: true });
                  }
                }}
                onError={(e) => {
                  console.error('Audio error:', e);
                  toast.error('Ошибка при воспроизведении аудио');
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
                  setAudioUrl(null);
                  setAudioBlob(null);
                  setAudioProgress(0);
                }}
                className="p-1"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </Button>
            </>
          )}
        </div>
      )}

      <div className="relative">
        <Textarea
          ref={textareaRef}
          placeholder="Send a message..."
          value={input}
          onChange={handleInput}
          className="min-h-[24px] overflow-hidden resize-none rounded-xl p-4 focus-visible:ring-0 focus-visible:ring-offset-0 text-base bg-muted border-none"
          rows={3}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (isLoading) {
                toast.error('Please wait for the model to finish its response!');
              } else {
                submitForm();
              }
            }
          }}
        />

        {isLoading ? (
          <Button
            className="rounded-full p-1.5 h-fit absolute bottom-2 right-2 m-0.5"
            onClick={(event) => {
              event.preventDefault();
              stop();
            }}
          >
            <StopIcon size={14} />
          </Button>
        ) : (
          <Button
            className="rounded-full p-1.5 h-fit absolute bottom-2 right-2 m-0.5"
            onClick={(event) => {
              event.preventDefault();
              if (audioBlob) {
                handleAudioSubmit(event);
              } else {
                submitForm();
              }
            }}
            disabled={input.length === 0 && !audioBlob || uploadQueue.length > 0 || isLoadingAudio}
          >
            <ArrowUpIcon size={14} />
          </Button>
        )}

        {/* <Button
          className="rounded-full p-1.5 h-fit absolute bottom-2 right-10 m-0.5 dark:border-zinc-700"
          onClick={(event) => {
            event.preventDefault();
            fileInputRef.current?.click();
          }}
          variant="outline"
          disabled={isLoading}
        >
          <PaperclipIcon size={14} />
        </Button> */}

        <Button
          className="rounded-full p-1.5 h-fit absolute bottom-2 right-10 m-0.5 dark:border-zinc-700"
          onClick={(event) => {
            event.preventDefault();
            if (isRecording) {
              stopRecording();
            } else {
              startRecording();
            }
          }}
          variant={isRecording ? "destructive" : "outline"}
          disabled={isLoading}
        >
          {isRecording ? (
            <StopIcon size={14} />
          ) : (
            <MicrophoneIcon size={14} />
          )}
        </Button>
      </div>
    </div>
  );
}
