'use client';

import { useState, useEffect, useRef } from 'react';
import { HiVolumeUp, HiVolumeOff } from 'react-icons/hi';

interface BlogAudioPlayerProps {
    content: string;
    title: string;
}

export default function BlogAudioPlayer({ content, title }: BlogAudioPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            setIsSupported(true);
        }
    }, []);

    const cleanContent = (text: string) => {
        return text
            .replace(/#{1,6}\s/g, '')
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/\*(.+?)\*/g, '$1')
            .replace(/\[(.+?)\]\(.+?\)/g, '$1')
            .replace(/`{1,3}(.+?)`{1,3}/g, '$1')
            .replace(/^\s*[-*+]\s/gm, '')
            .replace(/^\s*\d+\.\s/gm, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    };

    const selectBestVoice = () => {
        const voices = window.speechSynthesis.getVoices();

        // Try different natural female voices - cool, confident, modern
        const preferredNames = [
            'Microsoft Zira',      // US English - clear and professional
            'Microsoft Aria',      // Natural and expressive
            'Microsoft Jenny',     // Neural voice - very natural
            'Google US English Female',
            'Samantha',           // macOS - warm and friendly
            'Victoria',           // Sophisticated
            'Karen',              // Australian - unique accent
            'Fiona'               // Scottish - distinctive
        ];

        for (const name of preferredNames) {
            const voice = voices.find(v => v.name.includes(name));
            if (voice) return voice;
        }

        // Fallback: any female English voice
        return voices.find(v =>
            v.lang.startsWith('en') &&
            (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('aria'))
        ) || voices.find(v => v.lang.startsWith('en'));
    };

    const handleToggle = () => {
        if (!isSupported) return;

        if (isPlaying) {
            // Stop
            window.speechSynthesis.cancel();
            setIsPlaying(false);
        } else {
            // Start
            window.speechSynthesis.cancel();

            const text = `${title}. ${cleanContent(content)}`;
            const utterance = new SpeechSynthesisUtterance(text);

            const voice = selectBestVoice();
            if (voice) {
                utterance.voice = voice;
            }

            // Cool, confident delivery - modern and engaging
            utterance.rate = 1.15; // Slightly faster - energetic and confident
            utterance.pitch = 1.0; // Natural pitch
            utterance.volume = 1.0;

            utterance.onend = () => setIsPlaying(false);
            utterance.onerror = () => setIsPlaying(false);

            utteranceRef.current = utterance;
            window.speechSynthesis.speak(utterance);
            setIsPlaying(true);
        }
    };

    if (!isSupported) return null;

    return (
        <button
            onClick={handleToggle}
            className="fixed top-24 right-6 z-50 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all hover:scale-110"
            title={isPlaying ? 'Stop listening' : 'Listen to article'}
        >
            {isPlaying ? (
                <HiVolumeOff className="w-6 h-6" />
            ) : (
                <HiVolumeUp className="w-6 h-6" />
            )}
        </button>
    );
}
