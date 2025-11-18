// sound.ts
export const playPickupSound = () => {
    const sounds = [
        "/sounds/insert1.mp3",
        "/sounds/insert2.mp3",
        "/sounds/insert3.mp3",
    ];
    playRandomAudio(sounds, 0.3);
};

export const playPutDownSound = () => {
    const sounds = [
        "/sounds/remove1.mp3",
        "/sounds/remove2.mp3",
        "/sounds/remove3.mp3",
    ];
    playRandomAudio(sounds, 0.3);
};

export const playSwapSound = () => {
    const sounds = [
        "/sounds/drop1.mp3",
        "/sounds/drop2.mp3",
        "/sounds/drop3.mp3",
    ];
    playRandomAudio(sounds, 0.2);
};


export const playDragSound = () => {
    const sounds = [
        "/sounds/wool1.mp3",
        "/sounds/wool2.mp3",
        "/sounds/wool3.mp3",
        "/sounds/wool4.mp3",
    ];
    playRandomAudio(sounds, 0.1);
};

function playRandomAudio(sounds: string[], volume: number) {
    const sound = sounds[Math.floor(Math.random() * sounds.length)];
    const audio = new Audio(sound);
    audio.volume = volume;
    audio.play().catch(() => { });
}